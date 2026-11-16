/**
 * Zetro Universal Integration Hub — Sync Engine
 * Manages batch execution, idempotent record processing, identity resolution,
 * interaction ingestion, operational entity linking, and evidence recording.
 * Follows CTO Specification Section 7.2, 8, 9 & 19.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  type CanonicalInteractionPayload,
  type CanonicalCatalogueItemPayload,
  type ZetroConnector,
} from "./connector-interface";
import {
  formatPhoneReadable,
  matchCustomerProfile,
  type CandidateIdentifier,
  type ExistingCustomerProfile,
} from "@/lib/customer-identity";
import { assertSafeExternalEndpoint } from "@/lib/integrations/security";

async function findOrCreateCustomerByIdentifiers(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  workspaceId: string | null,
  candidates: CandidateIdentifier[],
  defaultDisplayName?: string,
): Promise<{ customer: { id: string; display_label: string }; isNew: boolean }> {
  let query = supabase
    .from("customers")
    .select(
      "id, workspace_id, user_id, primary_identifier, display_label, normalized_phone, external_customer_id, crm_id, country_code, customer_identifiers(id_type, normalized_value, raw_value, confidence, verified_by_human)",
    );

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", userId).is("workspace_id", null);
  }

  const { data: profilesData } = await query;
  const profiles: ExistingCustomerProfile[] = (profilesData || []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as string,
      workspace_id: (c.workspace_id as string) || null,
      user_id: c.user_id as string,
      primary_identifier: c.primary_identifier as string,
      display_label: c.display_label as string,
      normalized_phone: (c.normalized_phone as string) || null,
      external_customer_id: (c.external_customer_id as string) || null,
      crm_id: (c.crm_id as string) || null,
      country_code: (c.country_code as string) || null,
      identifiers: Array.isArray(c.customer_identifiers)
        ? (c.customer_identifiers as ExistingCustomerProfile["identifiers"])
        : [],
    }),
  );

  const decision = matchCustomerProfile(candidates, profiles);
  if (decision.matchedCustomer) {
    return {
      customer: {
        id: decision.matchedCustomer.id,
        display_label: decision.matchedCustomer.display_label,
      },
      isNew: false,
    };
  }

  const normPhone =
    candidates.find((c) => c.idType === "msisdn" || c.idType === "extracted_phone")
      ?.normalizedValue || null;
  const extId =
    candidates.find((c) => c.idType === "customer_id" || c.idType === "extracted_id")
      ?.normalizedValue || null;
  const crmId =
    candidates.find((c) => c.idType === "crm_id" || c.idType === "account_number")
      ?.normalizedValue || null;
  const primary = extId || normPhone || crmId || `CUST-${Date.now().toString(36).toUpperCase()}`;
  const display = defaultDisplayName || (normPhone ? formatPhoneReadable(normPhone) : primary);

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      primary_identifier: primary,
      display_label: display,
      normalized_phone: normPhone,
      external_customer_id: extId,
      crm_id: crmId,
      needs_identity_review: decision.needsIdentityReview,
      first_interaction_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString(),
    })
    .select("id, display_label")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create customer profile: ${error?.message || "Unknown error"}`);
  }

  for (const cand of candidates) {
    await supabase.from("customer_identifiers").insert({
      customer_id: created.id,
      workspace_id: workspaceId,
      user_id: userId,
      id_type: cand.idType,
      raw_value: cand.rawValue,
      normalized_value: cand.normalizedValue,
      country_code: cand.countryCode,
      source: cand.source,
      confidence: cand.confidence,
    });
  }

  return { customer: created, isNew: true };
}

export interface SyncRunResult {
  syncRunId: string;
  status: "completed" | "partial" | "failed";
  recordsReceived: number;
  recordsProcessed: number;
  recordsFailed: number;
  errorSummary?: string;
}

/**
 * Runs a complete synchronization cycle for a registered integration.
 */
export async function runIntegrationSync(
  integrationId: string,
  userId: string,
  workspaceId: string | null,
  connector: ZetroConnector,
  options: { maxPages?: number; recordingCredentials?: Record<string, string> } = {},
): Promise<SyncRunResult> {
  const supabase = createAdminClient();

  // 1. Initialize Sync Run record
  const { data: runRecord, error: runErr } = await supabase
    .from("integration_sync_runs")
    .insert({
      integration_id: integrationId,
      workspace_id: workspaceId,
      user_id: userId,
      status: "running",
      records_received: 0,
      records_processed: 0,
      records_failed: 0,
    })
    .select("id")
    .single();

  if (runErr || !runRecord) {
    throw new Error(`Failed to initialize sync run: ${runErr?.message || "Unknown error"}`);
  }

  const syncRunId = runRecord.id;
  let totalReceived = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  let cursor: string | undefined = undefined;
  let pages = 0;
  const maxPages = options.maxPages || 10;

  try {
    do {
      pages++;
      const batch = await connector.fetchRecords(cursor);
      totalReceived += batch.records.length;

      for (const item of batch.records) {
        try {
          const isCatalogueEntity =
            item.entityType === "product" || item.entityType === "service";

          // 2. Check for duplicate external_event_id for interactions (skip re-ingesting same call/ticket).
          // Catalogue records intentionally upsert so external edits keep Zetro current.
          if (!isCatalogueEntity) {
            const { data: existingEvent } = await supabase
              .from("integration_events")
              .select("id")
              .eq("integration_id", integrationId)
              .eq("external_event_id", item.externalId)
              .maybeSingle();

            if (existingEvent) {
              totalProcessed++;
              continue;
            }
          }

          // 3. Normalize external record
          const canonical = await connector.normalizeRecord(item.raw);

          // 4. Ingest record based on type
          if (canonical.entityType === "interaction") {
            await ingestCanonicalInteraction(
              supabase,
              userId,
              workspaceId,
              integrationId,
              canonical.payload,
              options.recordingCredentials,
            );
          } else if (canonical.entityType === "catalogue_item") {
            await ingestCatalogueItem(supabase, userId, workspaceId, canonical.payload);
          } else {
            throw new Error(`Unsupported canonical record type: ${canonical.entityType}`);
          }

          // 5. Record or update processed integration event
          await supabase.from("integration_events").upsert(
            {
              integration_id: integrationId,
              workspace_id: workspaceId,
              user_id: userId,
              external_event_id: item.externalId,
              event_type: item.entityType,
              payload_reference: (item.raw && typeof item.raw === "object"
                ? (item.raw as Record<string, unknown>)
                : {}) as unknown as Record<string, unknown>,
              processing_status: "processed",
              processed_at: new Date().toISOString(),
            },
            { onConflict: "integration_id,external_event_id" },
          );

          totalProcessed++;
        } catch (itemErr) {
          totalFailed++;
          const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
          if (errors.length < 10) errors.push(`[${item.externalId}] ${msg}`);
        }
      }

      cursor = batch.hasMore ? batch.nextCursor : undefined;
    } while (cursor && pages < maxPages);

    const finalStatus = totalFailed === 0 ? "completed" : totalProcessed > 0 ? "partial" : "failed";

    await supabase
      .from("integration_sync_runs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        records_received: totalReceived,
        records_processed: totalProcessed,
        records_failed: totalFailed,
        error_summary: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", syncRunId);

    // Update integration last_sync_at
    await supabase
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        connection_status: finalStatus === "failed" ? "failing" : "active",
      })
      .eq("id", integrationId);

    return {
      syncRunId,
      status: finalStatus,
      recordsReceived: totalReceived,
      recordsProcessed: totalProcessed,
      recordsFailed: totalFailed,
      errorSummary: errors.join("; "),
    };
  } catch (syncErr) {
    const errorMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
    await supabase
      .from("integration_sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        records_received: totalReceived,
        records_processed: totalProcessed,
        records_failed: totalFailed,
        error_summary: errorMsg,
      })
      .eq("id", syncRunId);

    return {
      syncRunId,
      status: "failed",
      recordsReceived: totalReceived,
      recordsProcessed: totalProcessed,
      recordsFailed: totalFailed,
      errorSummary: errorMsg,
    };
  }
}

async function resolveOrCreateServiceAreaId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  workspaceId: string | null,
  areaName: string | undefined,
): Promise<string | null> {
  const cleaned = areaName?.trim();
  if (!cleaned) return null;

  let listQuery = supabase
    .from("company_service_areas")
    .select("id, name, is_active");
  listQuery = workspaceId
    ? listQuery.eq("workspace_id", workspaceId)
    : listQuery.eq("user_id", userId).is("workspace_id", null);

  const { data: areas } = await listQuery;
  const matched = (areas || []).find(
    (area: { id: string; name: string }) => area.name.trim().toLowerCase() === cleaned.toLowerCase(),
  );
  if (matched) return matched.id;

  const { data: created } = await supabase
    .from("company_service_areas")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      name: cleaned.slice(0, 160),
      category_type: "general",
      is_active: true,
      metadata: { source: "integration_sync" },
    })
    .select("id")
    .maybeSingle();

  return created?.id || null;
}

async function ingestCatalogueItem(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  workspaceId: string | null,
  payload: CanonicalCatalogueItemPayload,
): Promise<string> {
  const table = payload.kind === "product" ? "company_products" : "company_services";
  let query = supabase.from(table).select("id, metadata").contains("metadata", {
    integration_external_reference: payload.externalReference,
    integration_source_system: payload.sourceSystemId,
  });
  query = workspaceId
    ? query.eq("workspace_id", workspaceId)
    : query.eq("user_id", userId).is("workspace_id", null);
  const { data: extMatch, error: lookupError } = await query.maybeSingle();
  if (lookupError) throw new Error(`Could not match catalogue record: ${lookupError.message}`);

  let existing: { id: string; metadata?: Record<string, unknown> | null } | null = extMatch as {
    id: string;
    metadata?: Record<string, unknown> | null;
  } | null;
  if (!existing) {
    // Fallback match by normalized name inside tenant so synced records update manual entries cleanly.
    let allQuery = supabase.from(table).select("id, name, metadata");
    allQuery = workspaceId
      ? allQuery.eq("workspace_id", workspaceId)
      : allQuery.eq("user_id", userId).is("workspace_id", null);
    const { data: allRows } = await allQuery;
    const nameMatch = (allRows || []).find(
      (r: { id: string; name: string }) => r.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
    );
    if (nameMatch) {
      existing = nameMatch as { id: string; metadata?: Record<string, unknown> | null };
    }
  }

  const serviceAreaId = await resolveOrCreateServiceAreaId(
    supabase,
    userId,
    workspaceId,
    payload.serviceAreaName,
  );

  const values = {
    workspace_id: workspaceId,
    user_id: userId,
    name: payload.name.trim(),
    description: payload.description || null,
    ...(payload.kind === "product" ? { sku: payload.sku || null } : {}),
    ...(serviceAreaId
      ? payload.kind === "product"
        ? { product_category_id: serviceAreaId }
        : { service_category_id: serviceAreaId }
      : {}),
    is_active: payload.active,
    updated_at: new Date().toISOString(),
    metadata: {
      ...(existing?.metadata || {}),
      ...(payload.metadata || {}),
      integration_external_reference: payload.externalReference,
      integration_source_system: payload.sourceSystemId,
      integration_last_synced_at: new Date().toISOString(),
      ...(payload.serviceAreaName ? { integration_service_area: payload.serviceAreaName } : {}),
    },
  };

  const mutation = existing
    ? supabase.from(table).update(values).eq("id", existing.id)
    : supabase.from(table).insert(values);
  const { data, error } = await mutation.select("id").single();
  if (error || !data) throw new Error(`Failed to save ${payload.kind}: ${error?.message || "Unknown error"}`);
  return data.id;
}

/**
 * Ingests a canonical interaction payload: resolves customer identity,
 * saves to public.interactions, creates evidence records, and links issues.
 */
async function ingestCanonicalInteraction(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  workspaceId: string | null,
  integrationId: string,
  payload: CanonicalInteractionPayload,
  recordingCredentials?: Record<string, string>,
): Promise<string> {
  // 1. Identity Resolution
  const candidates: CandidateIdentifier[] = [];
  const cust = payload.customer;

  if (cust.phone) {
    candidates.push({
      idType: "msisdn",
      rawValue: cust.phone,
      normalizedValue: cust.phone,
      countryCode: "TZ",
      source: "metadata",
      confidence: 1.0,
      priority: 2,
    });
  }

  if (cust.externalId) {
    candidates.push({
      idType: "customer_id",
      rawValue: cust.externalId,
      normalizedValue: cust.externalId,
      countryCode: null,
      source: "metadata",
      confidence: 1.0,
      priority: 1,
    });
  }

  if (cust.accountNumber) {
    candidates.push({
      idType: "account_number",
      rawValue: cust.accountNumber,
      normalizedValue: cust.accountNumber,
      countryCode: null,
      source: "metadata",
      confidence: 0.95,
      priority: 3,
    });
  }

  if (cust.crmId) {
    candidates.push({
      idType: "crm_id",
      rawValue: cust.crmId,
      normalizedValue: cust.crmId,
      countryCode: null,
      source: "metadata",
      confidence: 0.95,
      priority: 3,
    });
  }

  const resolved = await findOrCreateCustomerByIdentifiers(
    supabase,
    userId,
    workspaceId,
    candidates,
    cust.displayName || `Customer ${cust.externalId}`,
  );

  const customerId = resolved.customer.id;

  // Telephony REST records carry a recording URL. Copy the audio into Zetro's
  // private tenant storage and create a normal queued call so it follows the
  // same transcription, auditing, and customer-intelligence pipeline as uploads.
  let linkedCallId: string | null = null;
  if (payload.interactionType === "call" && typeof payload.metadata?.recordingUrl === "string") {
    linkedCallId = await ingestTelephonyRecording(
      supabase,
      userId,
      integrationId,
      payload,
      recordingCredentials,
    );
  }

  let resolvedAgentId: string | null = null;
  if (payload.agentName?.trim()) {
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", payload.agentName.trim())
      .maybeSingle();
    resolvedAgentId = existingAgent?.id || null;
  }

  // 2. Insert into public.interactions linked to call_id and customer_id
  const { data: interactionRow, error: intErr } = await supabase
    .from("interactions")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      customer_id: customerId,
      call_id: linkedCallId,
      interaction_type: payload.interactionType,
      channel: payload.channel,
      direction: payload.direction,
      source_system_id: payload.sourceSystemId,
      external_reference: payload.externalReference || payload.externalId,
      agent_id: resolvedAgentId,
      agent_name: payload.agentName || null,
      team_id: payload.teamId || null,
      started_at: payload.startedAt,
      ended_at: payload.endedAt || null,
      duration_seconds: payload.durationSeconds || null,
      language: payload.language || "sw",
      summary: payload.summary || null,
      raw_payload: payload.rawPayload || {},
      processing_status: linkedCallId ? "pending" : "completed",
      metadata: payload.metadata || {},
    })
    .select("id")
    .single();

  if (intErr || !interactionRow) {
    throw new Error(`Failed to insert interaction: ${intErr?.message || "Unknown error"}`);
  }

  const interactionId = interactionRow.id;

  // 3. Record Operational Entity (if agent or team present)
  let operationalEntityId: string | null = null;
  if (payload.agentName || payload.agentExternalId) {
    const extRef = payload.agentExternalId || payload.agentName || "unknown_agent";
    const { data: entityRow } = await supabase
      .from("operational_entities")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_type", "agent")
      .eq("external_reference", extRef)
      .maybeSingle();

    if (entityRow) {
      operationalEntityId = entityRow.id;
    } else {
      const { data: newEntity } = await supabase
        .from("operational_entities")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          entity_type: "agent",
          external_reference: extRef,
          display_name: payload.agentName || extRef,
          department: payload.teamId || null,
        })
        .select("id")
        .single();
      operationalEntityId = newEntity?.id || null;
    }
  }

  // 4. Record Evidence Records (with strict provenance separation)
  if (Array.isArray(payload.evidenceExcerpts) && payload.evidenceExcerpts.length > 0) {
    const evidenceRows = payload.evidenceExcerpts.map((ev) => ({
      workspace_id: workspaceId,
      user_id: userId,
      evidence_type: ev.evidenceType,
      provenance_type: ev.provenance,
      source_system_id: payload.sourceSystemId,
      source_record_id: payload.externalId,
      interaction_id: interactionId,
      operational_entity_id: operationalEntityId,
      excerpt_or_reference: ev.excerpt,
      confidence: ev.confidence ?? 1.0,
      evidence_timestamp: payload.startedAt,
    }));

    await supabase.from("evidence_records").insert(evidenceRows);
  }

  // 5. Issue Tracking & Linking
  if (payload.initialIssue) {
    const issueCode = `ISSUE-${Date.now().toString(36).toUpperCase()}`;
    const { data: issueRow } = await supabase
      .from("customer_issues")
      .insert({
        customer_id: customerId,
        workspace_id: workspaceId,
        user_id: userId,
        issue_code: issueCode,
        title: payload.initialIssue.title || "External Support Issue",
        category: payload.initialIssue.categoryCode || "general",
        product_service: payload.initialIssue.categoryCode || "service",
        symptoms: payload.initialIssue.symptoms || [],
        status: "open",
        resolution_confirmation: "unconfirmed",
        first_reported_at: payload.startedAt,
        latest_reported_at: payload.startedAt,
        summary: payload.initialIssue.description || payload.summary || "",
      })
      .select("id")
      .single();

    if (issueRow) {
      // Junction link in issue_interactions
      await supabase.from("issue_interactions").insert({
        workspace_id: workspaceId,
        user_id: userId,
        issue_id: issueRow.id,
        interaction_id: interactionId,
        relationship_type: "initial_report",
        matching_confidence: 1.0,
        matching_method: "exact_ticket_id",
        evidence_reference: `Imported via integration ${integrationId} #${payload.externalId}`,
      });

      // Audit event in issue_events
      await supabase.from("issue_events").insert({
        workspace_id: workspaceId,
        user_id: userId,
        issue_id: issueRow.id,
        event_type: "status_change",
        previous_status: null,
        new_status: "open",
        event_source: "connector",
        description: `Issue created via connector ingestion #${payload.externalId}`,
        event_time: payload.startedAt,
      });
    }
  }

  return interactionId;
}

async function ingestTelephonyRecording(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  integrationId: string,
  payload: CanonicalInteractionPayload,
  recordingCredentials: Record<string, string> = {},
): Promise<string | null> {
  const title = `Imported call ${payload.externalReference || payload.externalId}`;
  const { data: existingCall, error: existingCallError } = await supabase
    .from("calls")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();
  if (existingCallError) throw new Error(`Could not check imported call: ${existingCallError.message}`);
  if (existingCall) return existingCall.id;

  const requested = await assertSafeExternalEndpoint(String(payload.metadata?.recordingUrl || ""));
  const recordingHeaders: Record<string, string> = {};
  if (recordingCredentials.username && recordingCredentials.password) {
    recordingHeaders.Authorization = `Basic ${Buffer.from(`${recordingCredentials.username}:${recordingCredentials.password}`).toString("base64")}`;
  } else if (recordingCredentials.token) {
    recordingHeaders.Authorization = `Bearer ${recordingCredentials.token}`;
  } else if (recordingCredentials.apiKey) {
    recordingHeaders["X-API-Key"] = recordingCredentials.apiKey;
  }
  const response = await fetch(requested, { headers: recordingHeaders, redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Recording download returned HTTP ${response.status}.`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!contentType.startsWith("audio/") && !contentType.startsWith("video/")) {
    throw new Error("Recording URL must return audio or video content.");
  }
  const declaredBytes = Number(response.headers.get("content-length") || 0);
  const maxBytes = 100 * 1024 * 1024;
  if (declaredBytes > maxBytes) throw new Error("Recording exceeds the 100 MB integration limit.");
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > maxBytes) throw new Error("Recording is empty or exceeds the 100 MB integration limit.");

  const extensionByType: Record<string, string> = {
    "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
    "audio/mp4": "m4a", "audio/webm": "webm", "video/mp4": "mp4", "video/webm": "webm",
  };
  const extension = extensionByType[contentType] || "audio";
  const safeReference = payload.externalId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || crypto.randomUUID();
  const audioPath = `${userId}/integrations/${integrationId}/${safeReference}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("call-audio").upload(audioPath, bytes, { contentType, upsert: true });
  if (uploadError) throw new Error(`Could not store telephony recording: ${uploadError.message}`);

  const fileName = `${payload.sourceSystemId}-${safeReference}.${extension}`;
  const values = {
    user_id: userId,
    title,
    file_name: fileName,
    audio_path: audioPath,
    duration_seconds: payload.durationSeconds || null,
    status: "queued",
    caller_phone: payload.customer.phone || null,
    external_customer_ref: payload.customer.externalId || null,
  };
  let { data: insertedCall, error: callError } = await supabase
    .from("calls")
    .insert(values)
    .select("id")
    .single();
  if (callError && /caller_phone|external_customer_ref/i.test(callError.message)) {
    ({ data: insertedCall, error: callError } = await supabase
      .from("calls")
      .insert({
        user_id: userId, title: values.title, file_name: fileName, audio_path: audioPath,
        duration_seconds: payload.durationSeconds || null, status: "queued",
      })
      .select("id")
      .single());
  }
  if (callError) {
    await supabase.storage.from("call-audio").remove([audioPath]);
    throw new Error(`Could not create imported call: ${callError.message}`);
  }
  return insertedCall?.id || null;
}
