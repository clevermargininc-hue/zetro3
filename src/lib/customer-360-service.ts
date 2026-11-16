import { getMembership, getTeamScope } from "@/lib/workspaces";
import { getHistoricalCatalogueLinks } from "@/lib/company-catalogue-service";
/**
 * Zetro Universal Intelligence Engine — Customer 360 Aggregation Service
 * Combines multi-channel interactions, issue lifecycle, operational entities,
 * evidence records, root cause findings, and recommendations into a single profile.
 * Follows CTO Specification Section 10.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface Customer360Profile {
  customer: {
    id: string;
    workspaceId: string | null;
    primaryIdentifier: string;
    displayLabel: string;
    normalizedPhone: string | null;
    externalCustomerId: string | null;
    crmId: string | null;
    customerType: "individual" | "business" | "unknown";
    riskLevel: "low" | "medium" | "high" | "critical";
    totalInteractions: number;
    repeatInteractionCount: number;
    activeIssuesCount: number;
    resolvedIssuesCount: number;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    servicesInvolved: string[];
    productsInvolved: string[];
    identifiers: Array<{
      id: string;
      idType: string;
      rawValue: string;
      normalizedValue: string;
      source: string;
      confidence: number;
      verificationStatus: string;
    }>;
  };
  timeline: Array<{
    id: string;
    interactionType: string;
    channel: string;
    direction: string;
    startedAt: string;
    durationSeconds: number | null;
    agentName: string | null;
    summary: string | null;
    sourceSystem: string;
    externalReference: string | null;
    callId: string | null;
    serviceName?: string | null;
    productName?: string | null;
    serviceAreaName?: string | null;
    callScore?: {
      overallScore: number | null;
      verdict: string | null;
      sentiment: string | null;
    } | null;
  }>;
  issues: Array<{
    id: string;
    issueCode: string;
    title: string;
    category: string;
    subcategory: string | null;
    serviceId?: string | null;
    serviceName?: string | null;
    productId?: string | null;
    productName?: string | null;
    serviceAreaId?: string | null;
    serviceAreaName?: string | null;
    status: string;
    resolutionConfirmation: string;
    firstReportedAt: string;
    latestReportedAt: string;
    resolvedAt: string | null;
    repeatInteractionCount: number;
    primaryRootCause: string;
    rootCauseConfidence: number;
    responsibleTeam: string | null;
    recommendedAction: string | null;
    summary: string;
    events: Array<{
      id: string;
      eventType: string;
      newStatus: string;
      description: string;
      eventTime: string;
      eventSource: string;
    }>;
  }>;
  evidence: Array<{
    id: string;
    evidenceType: string;
    provenanceType: "SYSTEM_FACT" | "CUSTOMER_STATEMENT" | "EMPLOYEE_STATEMENT" | "AI_INFERENCE" | "HUMAN_DECISION";
    excerpt: string;
    confidence: number;
    timestamp: string;
    sourceSystem: string;
    issueId: string | null;
    interactionId: string | null;
  }>;
  operationalEntities: Array<{
    id: string;
    displayName: string;
    entityType: string;
    department: string | null;
    providerId: string | null;
  }>;
  recommendations: Array<{
    id: string;
    recommendationType: string;
    recommendedAction: string;
    priority: "low" | "medium" | "high" | "critical";
    status: string;
    responsibleTeam: string | null;
    dueAt: string | null;
  }>;
}

/**
 * Retrieves the complete Customer 360 profile for an enterprise customer.
 */
export async function getCustomer360Profile(
  userId: string,
  customerId: string,
): Promise<Customer360Profile | null> {
  const supabase = createAdminClient();

  const teamScope=await getTeamScope(userId);
  // 1. Fetch Customer Record & Identifiers
  const [custRes, identRes] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .in("user_id",teamScope)
      .maybeSingle(),
    supabase
      .from("customer_identifiers")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }),
  ]);

  if (!custRes.data) {
    return null;
  }

  const cust = custRes.data;
  const identifiers = (identRes.data || []).map((i) => ({
    id: i.id,
    idType: i.id_type,
    rawValue: i.raw_value,
    normalizedValue: i.normalized_value,
    source: i.source,
    confidence: Number(i.confidence || 1.0),
    verificationStatus: i.verification_status || (i.verified_by_human ? "verified_human" : "unverified"),
  }));

  // 2. Fetch Multi-Channel Interactions & Linked Calls
  const [interactionsRes, callsRes] = await Promise.all([
    supabase
      .from("interactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("started_at", { ascending: false }),
    supabase
      .from("calls")
      .select("id, title, duration_seconds, agent_id, agents(name), call_scores(overall_score, verdict, customer_sentiment, summary), created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  const rawInteractions = interactionsRes.data || [];
  const rawCalls = callsRes.data || [];

  // Merge calls and interactions into one chronological timeline
  const timelineMap = new Map<string, Customer360Profile["timeline"][0]>();

  // Add interactions
  for (const item of rawInteractions) {
    timelineMap.set(item.id, {
      id: item.id,
      interactionType: item.interaction_type,
      channel: item.channel,
      direction: item.direction,
      startedAt: item.started_at,
      durationSeconds: item.duration_seconds,
      agentName: item.agent_name,
      summary: item.summary,
      sourceSystem: item.source_system_id,
      externalReference: item.external_reference,
      callId: item.call_id,
      serviceName: item.service_name || null,
      productName: item.product_name || null,
      serviceAreaName: item.service_area_name || null,
    });
  }

  // Add calls if not already mapped via interaction
  for (const c of rawCalls) {
    const existing = Array.from(timelineMap.values()).find((t) => t.callId === c.id);
    const score = Array.isArray(c.call_scores) && c.call_scores[0] ? c.call_scores[0] : null;
    const agentName = (c.agents as { name?: string } | null)?.name || null;

    if (existing) {
      if (score) {
        existing.callScore = {
          overallScore: score.overall_score,
          verdict: score.verdict,
          sentiment: score.customer_sentiment,
        };
      }
      if (!existing.agentName && agentName) {
        existing.agentName = agentName;
      }
    } else {
      timelineMap.set(`call-${c.id}`, {
        id: `call-${c.id}`,
        interactionType: "call",
        channel: "voice",
        direction: "inbound",
        startedAt: c.created_at,
        durationSeconds: c.duration_seconds,
        agentName,
        summary: (score as { summary?: string } | null)?.summary || c.title || "Voice Call",
        sourceSystem: "zetro_voice",
        externalReference: c.id,
        callId: c.id,
        callScore: score
          ? {
              overallScore: score.overall_score,
              verdict: score.verdict,
              sentiment: score.customer_sentiment,
            }
          : null,
      });
    }
  }

  const timeline = Array.from(timelineMap.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  // 3. Fetch Issues and their lifecycle events
  const issuesRes = await supabase
    .from("customer_issues")
    .select("*, issue_events(*)")
    .eq("customer_id", customerId)
    .order("latest_reported_at", { ascending: false });

  const rawIssues = issuesRes.data || [];
  const issues = rawIssues.map((iss) => ({
    id: iss.id,
    issueCode: iss.issue_code,
    title: iss.title,
    category: iss.category,
    subcategory: iss.subcategory,
    serviceId: iss.service_id || null,
    serviceName: iss.service_name || null,
    productId: iss.product_id || null,
    productName: iss.product_name || null,
    serviceAreaId: iss.service_area_id || null,
    serviceAreaName: iss.service_area_name || null,
    status: iss.status,
    resolutionConfirmation: iss.resolution_confirmation,
    firstReportedAt: iss.first_reported_at,
    latestReportedAt: iss.latest_reported_at,
    resolvedAt: iss.resolved_at,
    repeatInteractionCount: iss.repeat_interaction_count || 0,
    primaryRootCause: iss.primary_root_cause,
    rootCauseConfidence: Number(iss.root_cause_confidence || 0.5),
    responsibleTeam: iss.responsible_team,
    recommendedAction: iss.recommended_action,
    summary: iss.summary,
    events: (
      (iss.issue_events as Array<{
        id: string;
        event_type: string;
        new_status: string;
        description: string;
        event_time: string;
        event_source: string;
      }>) || []
    ).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      newStatus: e.new_status,
      description: e.description,
      eventTime: e.event_time,
      eventSource: e.event_source,
    })),
  }));

  // 4. Fetch Evidence Records
  const evidenceRes = await supabase
    .from("evidence_records")
    .select("*")
    .in("issue_id", issues.map((i) => i.id).concat(["00000000-0000-0000-0000-000000000000"]))
    .order("evidence_timestamp", { ascending: false })
    .limit(50);

  const evidence = (evidenceRes.data || []).map((e) => ({
    id: e.id,
    evidenceType: e.evidence_type,
    provenanceType: e.provenance_type as Customer360Profile["evidence"][0]["provenanceType"],
    excerpt: e.excerpt_or_reference,
    confidence: Number(e.confidence || 1.0),
    timestamp: e.evidence_timestamp,
    sourceSystem: e.source_system_id,
    issueId: e.issue_id,
    interactionId: e.interaction_id,
  }));

  // 5. Fetch Operational Entities associated with these interactions/evidence
  const entityIds = (evidenceRes.data || [])
    .map((e) => e.operational_entity_id)
    .filter(Boolean) as string[];

  let operationalEntities: Customer360Profile["operationalEntities"] = [];
  if (entityIds.length > 0) {
    const { data: entRows } = await supabase
      .from("operational_entities")
      .select("id, display_name, entity_type, department, provider_id")
      .in("id", entityIds);

    operationalEntities = (entRows || []).map((ent) => ({
      id: ent.id,
      displayName: ent.display_name,
      entityType: ent.entity_type,
      department: ent.department,
      providerId: ent.provider_id,
    }));
  }

  // 6. Fetch Operational Recommendations
  const recsRes = await supabase
    .from("operational_recommendations")
    .select("*")
    .in("issue_id", issues.map((i) => i.id).concat(["00000000-0000-0000-0000-000000000000"]))
    .order("created_at", { ascending: false });

  const recommendations = (recsRes.data || []).map((r) => ({
    id: r.id,
    recommendationType: r.recommendation_type,
    recommendedAction: r.recommended_action,
    priority: r.priority as Customer360Profile["recommendations"][0]["priority"],
    status: r.status,
    responsibleTeam: r.responsible_team_id,
    dueAt: r.due_at,
  }));

  const activeIssues = issues.filter((i) => i.status !== "resolved" && i.status !== "closed");
  const resolvedIssues = issues.filter((i) => i.status === "resolved" || i.status === "closed");

  const servicesSet = new Set<string>();
  const productsSet = new Set<string>();

  for (const item of rawInteractions) {
    if (item.service_name) servicesSet.add(item.service_name);
    if (item.product_name) productsSet.add(item.product_name);
  }

  for (const iss of rawIssues) {
    if (iss.service_name) servicesSet.add(iss.service_name);
    if (iss.product_name) productsSet.add(iss.product_name);

  }

  const membership=await getMembership(userId);
  const links=await getHistoricalCatalogueLinks(userId,membership?.workspaceId||null,rawIssues.map(issue=>issue.id));
  for(const link of links){if(link.product)productsSet.add(link.product.name);if(link.service)servicesSet.add(link.service.name);}
  const servicesInvolved = Array.from(servicesSet);
  const productsInvolved = Array.from(productsSet);

  return {
    customer: {
      id: cust.id,
      workspaceId: cust.workspace_id,
      primaryIdentifier: cust.primary_identifier,
      displayLabel: cust.display_label,
      normalizedPhone: cust.normalized_phone,
      externalCustomerId: cust.external_customer_id,
      crmId: cust.crm_id,
      customerType: cust.customer_type || "individual",
      riskLevel: cust.risk_level || "low",
      totalInteractions: timeline.length,
      repeatInteractionCount: timeline.length > 1 ? timeline.length - 1 : 0,
      activeIssuesCount: activeIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      firstSeenAt: cust.first_seen_at || (timeline[timeline.length - 1]?.startedAt ?? null),
      lastSeenAt: cust.last_seen_at || (timeline[0]?.startedAt ?? null),
      servicesInvolved,
      productsInvolved,
      identifiers,
    },
    timeline,
    issues,
    evidence,
    operationalEntities,
    recommendations,
  };
}
