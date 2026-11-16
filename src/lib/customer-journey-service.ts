import { loadAllJourneyRows } from "@/lib/customer-intelligence-query";
import { firstContactResolvedCount, lifecycleReviewFields, issueReviewFlags, companyCategory } from "@/lib/customer-intelligence-metrics";
/**
 * Phases 2–11: Customer Journey & Repeat Issue Intelligence Data & Orchestration Service
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership, getTeamScope } from "@/lib/workspaces";
import { getOpenAI, withRetries } from "@/lib/ai-client";
import { getServerEnv } from "@/lib/env";
import { embedQuery } from "@/lib/embeddings";
import {
  extractCandidateIdentifiers,
  formatPhoneReadable,
  matchCustomerProfile,
  normalizeCustomerId,
  normalizePhoneNumber,
  resolveCountryIso,
  type ExistingCustomerProfile,
} from "@/lib/customer-identity";
import {
  buildCustomerJourneySystemPrompt,
  buildCustomerJourneyUserPrompt,
  ISSUE_CATEGORIES,
  ISSUE_CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  JOURNEY_MODEL_VERSION,
  MATCH_CLASSIFICATIONS,
  RESOLUTION_CONFIRMATIONS,
  ROOT_CAUSE_CATEGORIES,
  ROOT_CAUSE_LABELS,
  type IssueCategory,
  type IssueLifecycleStatus,
  type JourneyAiAnalysisOutput,
  type MatchClassification,
  type PriorIssueDigest,
  type ResolutionConfirmation,
  type RootCauseCategory,
  type RootCauseEvidenceType,
  type TranscriptEvidenceExcerpt,
} from "@/lib/ai/prompts/customer-journey";
import {
  getCompanyCatalogue,
  getHistoricalCatalogueLinks,
  validateCatalogueClassification,
  persistIssueCatalogueClassification,
  formatCatalogueForPrompt,
} from "@/lib/company-catalogue-service";
import {
  compareWithPreviousIssues,
  computeCustomerRiskLevel,
  evaluateIssueLifecycle,
  evaluateRootCauseIntelligence,
  extractStructuredIssueFromCall,
  type CallTranscriptTurn,
} from "@/lib/customer-journey-engine";
import { recordingIdentityKey } from "@/lib/recording-identity";
import {
  getCompanyDataConnectionStats,
  type CompanyConnectionSummary,
} from "@/lib/company-intelligence-bridge";

export interface CustomerDirectoryItem {
  id: string;
  primary_identifier: string;
  display_label: string;
  normalized_phone: string | null;
  external_customer_id: string | null;
  country_code: string | null;
  total_calls: number;
  repeat_call_count: number;
  recurring_issue_count: number;
  new_issue_count: number;
  unresolved_issue_count: number;
  resolved_issue_count: number;
  reopened_issue_count: number;
  avg_hours_between_calls: number | null;
  top_issue_categories: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  needs_identity_review: boolean;
  first_interaction_at: string | null;
  last_interaction_at: string | null;
}

export interface IssueSummaryItem {
  id: string;
  issue_code: string;
  customer_id: string;
  customer_label: string;
  customer_phone: string | null;
  title: string;
  category: string;
  subcategory: string | null;
  product_service: string | null;
  symptoms: string[];
  location: string | null;
  service_provider: string | null;
  status: IssueLifecycleStatus;
  resolution_confirmation: ResolutionConfirmation;
  first_reported_at: string;
  latest_reported_at: string;
  resolved_at: string | null;
  reopened_count: number;
  repeat_interaction_count: number;
  total_calls: number;
  primary_root_cause: RootCauseCategory;
  primary_root_cause_detail: string | null;
  secondary_root_cause: RootCauseCategory | null;
  secondary_root_cause_detail: string | null;
  root_cause_evidence_type: RootCauseEvidenceType;
  root_cause_confidence: number;
  root_cause_explanation: string | null;
  responsible_team: string | null;
  recommended_action: string | null;
  summary: string;
  service_id?: string | null;
  service_name?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  service_area_id?: string | null;
  service_area_name?: string | null;
  catalogue_issue_category_id?: string | null;
  catalogue_issue_category_name?: string | null;
  catalogue_products?: Array<{id:string;name:string}>;
  catalogue_services?: Array<{id:string;name:string}>;
  catalogue_areas?: Array<{id:string;name:string}>;
  needs_review: boolean;
  human_verified: boolean;
}

export interface ServiceAreaBreakdownItem {
  serviceAreaId: string;
  name: string;
  categoryType: string;
  totalIssues: number;
  recurringIssues: number;
  unresolvedIssues: number;
  repeatContactRate: number;
  resolutionRate: number;
}

export interface TimelineCallEntry {
  id: string;
  call_id: string;
  issue_id: string;
  issue_code: string;
  issue_title: string;
  issue_status: IssueLifecycleStatus;
  resolution_confirmation: ResolutionConfirmation;
  interaction_number: number;
  customer_contact_sequence: number;
  is_repeat_customer: boolean;
  is_repeat_issue: boolean;
  match_classification: MatchClassification;
  match_confidence: number;
  match_reason: string;
  call_resolution_state: string;
  extracted_category: string | null;
  extracted_product_service: string | null;
  extracted_symptoms: string[];
  extracted_issue_summary: string;
  transcript_evidence: TranscriptEvidenceExcerpt[];
  human_review_status: string | null;
  call_title: string;
  customer_id?: string;
  file_name?: string | null;
  call_date: string;
  call_status: string;
  duration_seconds: number | null;
  agent_id: string | null;
  agent_name: string;
  qa_score: number | null;
  qa_verdict: string | null;
  qa_sentiment: string | null;
  qa_summary: string | null;
  primary_root_cause: RootCauseCategory;
  root_cause_evidence_type: RootCauseEvidenceType;
  recording_key?: string;
  audit_count?: number;
  duplicate_call_ids?: string[];
  audit_dates?: string[];
}

export interface OperationalRecommendation {
  id: string;
  priority: "critical" | "high" | "medium";
  title: string;
  category: string;
  responsible_team: string;
  affected_issues_count: number;
  affected_calls_count: number;
  evidence_type: RootCauseEvidenceType;
  explanation: string;
  recommended_action: string;
}

export interface RepeatCallRootCauseItem {
  rootCause: RootCauseCategory | string;
  count: number;
  percentage: number;
}

export interface RepeatCallCategoryItem {
  category: string;
  label: string;
  totalIssues: number;
  repeatIssues: number;
  unresolvedCount: number;
}

export interface RepeatCallAgentItem {
  agentName: string;
  totalCalls: number;
  agentCausedRepeats: number;
  externalCausedRepeats: number;
}

export interface OperationalRecommendationItem {
  id: string;
  severity: "critical" | "high" | "medium" | string;
  targetTeam: string;
  affectedIssues: number;
  affectedCalls: number;
  title: string;
  description: string;
  recommendedAction: string;
}

export interface RepeatCallAnalyticsSummary {
  firstCallResolutionRate: number;
  totalIssues: number;
  recurringIssues: number;
  repeatIssueRate: number;
  repeatCallRate: number;
  repeatCallCount: number;
  totalCallsAnalyzed: number;
  unresolvedIssues: number;
  reopenedIssues: number;
  avgCallsPerIssue: number;
  avgResolutionHours: number | null;
  totalCustomers: number;
  repeatCustomerRate: number;
  repeatByRootCause: RepeatCallRootCauseItem[];
  repeatByCategory: RepeatCallCategoryItem[];
  repeatByAgent: RepeatCallAgentItem[];
  operationalRecommendations: OperationalRecommendationItem[];
}

export interface AgentAccountabilityRow {
  agent_name: string;
  total_calls_handled: number;
  repeat_issue_calls_handled: number;
  repeat_rate_pct: number | null;
  agent_related_root_cause_count: number;
  external_or_technical_root_cause_count: number;
  avg_qa_score: number | null;
  sample_size_adequate: boolean;
  fairness_note: string;
}

export interface CustomerIntelligenceFilters {
  search?: string;
  category?: string;
  status?: string;
  rootCause?: string;
  agent?: string;
  serviceProvider?: string;
  location?: string;
  riskLevel?: string;
  dateFrom?: string;
  dateTo?: string;
  needsReviewOnly?: boolean;
  unresolvedOnly?: boolean;
  repeatCountMin?: number;
  product?: string;
  service?: string;
  serviceArea?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerIntelligenceOverview {
  migrationRequired: boolean;
  isCatalogueConfigured: boolean;
  connectionSummary?: CompanyConnectionSummary;
  unanalyzedCallsCount: number;
  totalAnalyzedCalls: number;
  /** One row per distinct audited call. A re-audit of the same call ID is never a return contact. */
  interactions: TimelineCallEntry[];
  kpis: {
    totalCustomers: number;
    repeatCustomersCount: number;
    repeatCustomerRatePct: number;
    totalIssues: number;
    firstContactResolvedCount: number;
    recurringIssuesCount: number;
    repeatIssueRatePct: number;
    repeatCallsCount: number;
    repeatCallRatePct: number;
    unresolvedIssuesCount: number;
    resolvedIssuesCount: number;
    confirmedResolvedCount: number;
    unconfirmedResolvedCount: number;
    reopenedIssuesCount: number;
    needsReviewCount: number;
    avgCallsPerUnresolvedIssue: number;
    avgCallsPerIssue: number;
    avgResolutionHours: number | null;
  };
  breakdowns: {
    byCategory: Array<{
      category: string;
      label: string;
      totalIssues: number;
      recurringIssues: number;
      repeatCalls: number;
      unresolvedCount: number;
    }>;
    byRootCause: Array<{
      category: RootCauseCategory;
      label: string;
      count: number;
      pct: number;
      confirmedCount: number;
      inferredCount: number;
    }>;
    byStatus: Array<{
      status: IssueLifecycleStatus;
      label: string;
      count: number;
    }>;
    byServiceProvider: Array<{
      provider: string;
      issueCount: number;
      repeatCallCount: number;
      unresolvedCount: number;
    }>;
    byServiceArea: ServiceAreaBreakdownItem[];
    agentAccountability: AgentAccountabilityRow[];
    recommendations: OperationalRecommendation[];
  };
  customers: {
    items: CustomerDirectoryItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  issues: {
    items: IssueSummaryItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  filterOptions: {
    categories: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
    rootCauses: Array<{ value: string; label: string }>;
    agents: string[];
    serviceProviders: string[];
    locations: string[];
    products: Array<{value:string;label:string}>;
    services: Array<{value:string;label:string}>;
    serviceAreas: Array<{value:string;label:string}>;
    departments: Array<{value:string;label:string}>;
  };
}

interface InMemoryReviewRecord {
  id: string;
  review_type: string;
  reviewer_name: string | null;
  notes: string;
  responsible_team: string | null;
  previous_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  created_at: string;
}

interface InMemoryStatusHistoryRecord {
  id: string;
  previous_status: string | null;
  new_status: string;
  resolution_confirmation: string;
  changed_by_type: string;
  reason: string;
  created_at: string;
}

interface InMemoryJourneyStore {
  projectionCache: Map<
    string,
    {
      expiresAt: number;
      customers: CustomerDirectoryItem[];
      issues: IssueSummaryItem[];
      timelineCalls: TimelineCallEntry[];
    }
  >;
  customerOverrides: Map<string, Partial<CustomerDirectoryItem>>;
  issueOverrides: Map<string, Partial<IssueSummaryItem>>;
  splitIssues: Map<string, IssueSummaryItem>;
  callOverrides: Map<string, Partial<TimelineCallEntry>>;
  reviewsByIssue: Map<string, InMemoryReviewRecord[]>;
  reviewsByCustomer: Map<string, InMemoryReviewRecord[]>;
  statusHistoryByIssue: Map<string, InMemoryStatusHistoryRecord[]>;
}

const globalForJourney = globalThis as unknown as {
  __zetroJourneyStore?: InMemoryJourneyStore;
};

function getInMemoryStore(): InMemoryJourneyStore {
  if (!globalForJourney.__zetroJourneyStore) {
    globalForJourney.__zetroJourneyStore = {
      projectionCache: new Map(),
      customerOverrides: new Map(),
      issueOverrides: new Map(),
      splitIssues: new Map(),
      callOverrides: new Map(),
      reviewsByIssue: new Map(),
      reviewsByCustomer: new Map(),
      statusHistoryByIssue: new Map(),
    };
  }
  return globalForJourney.__zetroJourneyStore;
}

export function invalidateInMemoryJourneyCache(): void {
  getInMemoryStore().projectionCache.clear();
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  const msg = "message" in error ? String((error as { message?: unknown }).message) : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /schema cache/i.test(msg)
  );
}

/**
 * Calls OpenAI to enrich the structured issue, repeat match, lifecycle, and root cause.
 * Safely returns null on timeout or error so the deterministic engine seamlessly handles it.
 */
async function runLlmJourneyAnalysis(params: {
  callId: string;
  callTitle: string;
  callDate: string;
  agentName?: string | null;
  qaSummary?: string | null;
  qaScore?: number | null;
  qaVerdict?: string | null;
  metadata?: {
    callerPhone?: string | null;
    externalCustomerId?: string | null;
    location?: string | null;
    serviceProvider?: string | null;
    productCategory?: string | null;
  };
  utterances: Array<{ speaker: string; role?: string; text: string }>;
  priorIssues: PriorIssueDigest[];
  catalogueBlock?: string;
}): Promise<JourneyAiAnalysisOutput | null> {
  try {
    const env = getServerEnv();
    const openai = getOpenAI();
    const response = await withRetries(() =>
      openai.chat.completions.create({
        model: env.aiFastModel || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildCustomerJourneySystemPrompt(params.catalogueBlock) },
          { role: "user", content: buildCustomerJourneyUserPrompt(params) },
        ],
      }),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<JourneyAiAnalysisOutput>;
    if (!parsed.extracted_issue || !parsed.repeat_detection || !parsed.root_cause) {
      return null;
    }
    return parsed as JourneyAiAnalysisOutput;
  } catch {
    return null;
  }
}

/**
 * Recomputes and updates aggregate statistics on a `public.customers` row.
 */
export async function refreshCustomerAggregateMetrics(customerId: string): Promise<void> {
  const admin = createAdminClient();

  const [{ data: issues }, { data: issueCalls }] = await Promise.all([
    admin
      .from("customer_issues")
      .select("*")
      .eq("customer_id", customerId)
      .order("first_reported_at", { ascending: true }),
    admin
      .from("issue_calls")
      .select("*, calls(created_at)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }),
  ]);

  const issueRows = issues || [];
  const callRows = issueCalls || [];

  const totalCalls = callRows.length;
  const repeatCallCount = callRows.filter((c) => c.is_repeat_issue).length;
  const recurringIssueCount = issueRows.filter((i) => (i.total_calls || 1) > 1).length;
  const newIssueCount = issueRows.length;
  const resolvedIssueCount = issueRows.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  ).length;
  const unresolvedIssueCount = issueRows.length - resolvedIssueCount;
  const reopenedIssueCount = issueRows.filter(
    (i) => i.status === "reopened" || (i.reopened_count || 0) > 0,
  ).length;
  const escalatedIssueCount = issueRows.filter((i) => i.status === "escalated").length;

  // Dates & average hours between calls
  const timestamps = callRows
    .map((c) => {
      const callObj = Array.isArray(c.calls) ? c.calls[0] : c.calls;
      const dt = (callObj as { created_at?: string } | null)?.created_at || c.created_at;
      return new Date(dt).getTime();
    })
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  let avgHoursBetweenCalls: number | null = null;
  if (timestamps.length >= 2) {
    let totalHours = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalHours += Math.max(0, (timestamps[i] - timestamps[i - 1]) / (1000 * 3600));
    }
    avgHoursBetweenCalls = Number((totalHours / (timestamps.length - 1)).toFixed(1));
  }

  // Top issue categories
  const catCounts = new Map<string, number>();
  for (const iss of issueRows) {
    catCounts.set(iss.category, (catCounts.get(iss.category) || 0) + (iss.total_calls || 1));
  }
  const topIssueCategories = Array.from(catCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat]) => cat);

  const riskLevel = computeCustomerRiskLevel({
    repeatCallCount,
    unresolvedIssueCount,
    reopenedIssueCount,
    escalatedIssueCount,
  });

  await admin
    .from("customers")
    .update({
      total_calls: totalCalls,
      repeat_call_count: repeatCallCount,
      recurring_issue_count: recurringIssueCount,
      new_issue_count: newIssueCount,
      unresolved_issue_count: unresolvedIssueCount,
      resolved_issue_count: resolvedIssueCount,
      reopened_issue_count: reopenedIssueCount,
      avg_hours_between_calls: avgHoursBetweenCalls,
      top_issue_categories: topIssueCategories,
      risk_level: riskLevel,
      first_interaction_at: timestamps.length
        ? new Date(timestamps[0]).toISOString()
        : null,
      last_interaction_at: timestamps.length
        ? new Date(timestamps[timestamps.length - 1]).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);
}

/**
 * Phase 7: Automated, Idempotent Single-Call Customer Journey Analysis
 * Safe to invoke after transcription, after QA scoring, or during batch backfill.
 * Never throws or corrupts existing call/QA records if an error occurs.
 */
export async function analyzeCallCustomerJourney(
  callId: string,
  options: { force?: boolean; skipLlm?: boolean } = {},
): Promise<{
  ok: boolean;
  skipped?: boolean;
  migrationRequired?: boolean;
  customerId?: string;
  issueId?: string;
  matchClassification?: MatchClassification;
  error?: string;
}> {
  const admin = createAdminClient();
  invalidateInMemoryJourneyCache();

  try {
    // 1. Check idempotency if not forced
    if (!options.force) {
      const { data: existingLink, error: linkCheckError } = await admin
        .from("issue_calls")
        .select("id, customer_id, issue_id, match_classification")
        .eq("call_id", callId)
        .maybeSingle();

      if (linkCheckError && isMissingTableError(linkCheckError)) {
        return { ok: false, migrationRequired: true };
      }
      if (linkCheckError) return { ok: false, error: linkCheckError.message };

      if (existingLink) {
        return {
          ok: true,
          skipped: true,
          customerId: existingLink.customer_id,
          issueId: existingLink.issue_id,
          matchClassification: existingLink.match_classification as MatchClassification,
        };
      }
    }

    // 2. Load the call, agent, utterances, and QA score in parallel
    const [{ data: call, error: callError }, { data: utterances }] = await Promise.all([
      admin
        .from("calls")
        .select("*, agents(name), call_scores(*)")
        .eq("id", callId)
        .single(),
      admin
        .from("utterances")
        .select("*")
        .eq("call_id", callId)
        .order("sequence", { ascending: true }),
    ]);

    if (callError || !call) {
      return { ok: false, error: callError?.message || "Call not found" };
    }

    const turns: CallTranscriptTurn[] = (utterances || []).map((u) => ({
      speaker: u.speaker_label || "Speaker",
      role: u.role || "unknown",
      text: u.text || "",
      start_ms: u.start_ms,
      end_ms: u.end_ms,
    }));

    const [membership, teamScope] = await Promise.all([
      getMembership(call.user_id).catch(() => null),
      getTeamScope(call.user_id).catch(() => [call.user_id]),
    ]);
    const workspaceId = membership?.workspaceId || null;
    const defaultCountry = resolveCountryIso(membership?.country);

    const scoreObj = Array.isArray(call.call_scores)
      ? call.call_scores[0]
      : call.call_scores;
    const agentObj = Array.isArray(call.agents) ? call.agents[0] : call.agents;
    const agentName = (agentObj as { name?: string } | null)?.name || null;

    // 3. Extract structured issue baseline
    const baselineIssue = extractStructuredIssueFromCall({
      title: call.title,
      fileName: call.file_name,
      qaSummary: scoreObj?.summary || null,
      utterances: turns,
      callerPhone: call.caller_phone || null,
      externalCustomerId: call.external_customer_ref || null,
      location: call.location || null,
      serviceProvider: call.service_provider || null,
      productCategory: call.product_category || null,
      defaultCountry,
    });

    // 4. Customer Identity Matching (Phase 2)
    const candidateIdentifiers = extractCandidateIdentifiers({
      explicitCustomerId:
        call.external_customer_ref || baselineIssue.extracted_customer_id,
      callerPhone: call.caller_phone || baselineIssue.extracted_phone,
      fileName: call.file_name,
      title: call.title,
      utterances: turns,
      defaultCountry,
    });

    const { data: existingCustomers, error: custLoadError } = await admin
      .from("customers")
      .select("*, customer_identifiers(*)")
      .in("user_id", teamScope);

    if (custLoadError && isMissingTableError(custLoadError)) {
      return { ok: false, migrationRequired: true };
    }

    const profiles: ExistingCustomerProfile[] = (existingCustomers || []).map((c) => ({
      id: c.id,
      workspace_id: c.workspace_id,
      user_id: c.user_id,
      primary_identifier: c.primary_identifier,
      display_label: c.display_label,
      normalized_phone: c.normalized_phone,
      external_customer_id: c.external_customer_id,
      crm_id: c.crm_id,
      country_code: c.country_code,
      identifiers: Array.isArray(c.customer_identifiers)
        ? c.customer_identifiers
        : [],
    }));

    const identityDecision = matchCustomerProfile(candidateIdentifiers, profiles);

    let customerId = identityDecision.matchedCustomer?.id || null;
    if (!customerId) {
      const primaryCand = identityDecision.matchedBy;
      const normPhone =
        candidateIdentifiers.find(
          (c) => c.idType === "msisdn" || c.idType === "extracted_phone",
        )?.normalizedValue || null;
      const extId =
        candidateIdentifiers.find(
          (c) => c.idType === "customer_id" || c.idType === "extracted_id",
        )?.normalizedValue || null;
      const crmId =
        candidateIdentifiers.find(
          (c) => c.idType === "crm_id" || c.idType === "account_number",
        )?.normalizedValue || null;

      const fallbackCode = `CALLER-${call.id.slice(0, 6).toUpperCase()}`;
      const primaryIdentifier =
        extId || normPhone || crmId || primaryCand?.normalizedValue || fallbackCode;
      const displayLabel = normPhone
        ? formatPhoneReadable(normPhone)
        : extId || crmId || `Caller (${call.title?.slice(0, 24) || fallbackCode})`;

      const { data: createdCustomer, error: createCustErr } = await admin
        .from("customers")
        .insert({
          workspace_id: workspaceId,
          user_id: call.user_id,
          primary_identifier: primaryIdentifier,
          display_label: displayLabel,
          normalized_phone: normPhone,
          external_customer_id: extId,
          crm_id: crmId,
          country_code: primaryCand?.countryCode || defaultCountry,
          needs_identity_review:
            !primaryCand || identityDecision.needsIdentityReview,
          first_interaction_at: call.created_at,
          last_interaction_at: call.created_at,
        })
        .select("id")
        .single();

      if (createCustErr || !createdCustomer) {
        return {
          ok: false,
          error: createCustErr?.message || "Failed to create customer profile",
        };
      }
      customerId = createdCustomer.id;
    } else if (identityDecision.needsIdentityReview) {
      await admin
        .from("customers")
        .update({ needs_identity_review: true })
        .eq("id", customerId);
    }

    // Save any newly discovered identifiers for this customer in parallel
    await Promise.all(
      candidateIdentifiers.map(async (cand, i) => {
        const { data: existingIdRow } = await admin
          .from("customer_identifiers")
          .select("id")
          .eq("customer_id", customerId)
          .eq("normalized_value", cand.normalizedValue)
          .maybeSingle();

        if (!existingIdRow) {
          await admin.from("customer_identifiers").insert({
            customer_id: customerId,
            workspace_id: workspaceId,
            user_id: call.user_id,
            id_type: cand.idType,
            raw_value: cand.rawValue,
            normalized_value: cand.normalizedValue,
            country_code: cand.countryCode || defaultCountry,
            source: cand.source,
            confidence: cand.confidence,
            is_primary: i === 0,
          });
        }
      }),
    );

    // A new audit row is not necessarily a new customer contact. Detect an
    // already-analysed physical recording before issue comparison so it cannot
    // create a second issue, inflate repeat-contact counts, or change lifecycle.
    const currentRecordingKey = recordingIdentityKey({
      callId,
      fileName: call.file_name,
      title: call.title,
      durationSeconds: call.duration_seconds,
      audioFingerprint: call.audio_fingerprint,
    });
    if (!currentRecordingKey.startsWith("call:")) {
      const { data: previousCustomerAudits } = await admin
        .from("issue_calls")
        .select("*, calls(file_name, title, duration_seconds)")
        .eq("customer_id", customerId)
        .neq("call_id", callId);
      const duplicate = (previousCustomerAudits || []).find((row) => {
        const priorCall = Array.isArray(row.calls) ? row.calls[0] : row.calls;
        return priorCall && recordingIdentityKey({
          callId: row.call_id,
          fileName: priorCall.file_name,
          title: priorCall.title,
          durationSeconds: priorCall.duration_seconds,
        }) === currentRecordingKey;
      });

      if (duplicate) {
        const {
          id: _id,
          calls: _calls,
          created_at: _createdAt,
          updated_at: _updatedAt,
          call_id: _oldCallId,
          ...canonicalAudit
        } = duplicate;
        await Promise.all([
          admin.from("calls").update({ customer_id: customerId }).eq("id", callId),
          admin.from("issue_calls").upsert(
            {
              ...canonicalAudit,
              call_id: callId,
              match_reason: `Repeated audit of recording ${duplicate.call_id}; counted as one customer contact.`,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "call_id" },
          ),
        ]);
        return {
          ok: true,
          skipped: true,
          customerId: customerId ?? undefined,
          issueId: duplicate.issue_id,
          matchClassification: duplicate.match_classification as MatchClassification,
        };
      }
    }

    // Link call.customer_id and fetch prior issues in parallel
    const [, { data: priorIssueRows }] = await Promise.all([
      admin
        .from("calls")
        .update({
          customer_id: customerId,
          ...(baselineIssue.extracted_phone && !call.caller_phone
            ? { caller_phone: baselineIssue.extracted_phone }
            : {}),
        })
        .eq("id", callId).throwOnError(),
      admin
        .from("customer_issues")
        .select("*, issue_calls!issue_calls_issue_id_fkey(call_id, created_at, extracted_issue_summary, call_resolution_state)")
        .eq("customer_id", customerId)
        .order("latest_reported_at", { ascending: false })
        .limit(8).throwOnError(),
    ]);

    const priorDigests: Array<
      PriorIssueDigest & { summary_embedding?: number[] | null }
    > = (priorIssueRows || [])
      .filter((row) => {
        const linkedCalls = Array.isArray(row.issue_calls) ? row.issue_calls : [];
        if (
          linkedCalls.length === 1 &&
          (linkedCalls[0] as { call_id?: string }).call_id === callId
        ) {
          return false;
        }
        return true;
      })
      .map((row) => ({
        issue_id: row.id,
        issue_code: row.issue_code,
        title: row.title,
        category: row.category,
        subcategory: row.subcategory,
        product_service: row.product_service,
        symptoms: row.symptoms || [],
        location: row.location,
        service_provider: row.service_provider,
        status: row.status as IssueLifecycleStatus,
        resolution_confirmation: row.resolution_confirmation as ResolutionConfirmation,
        first_reported_at: row.first_reported_at,
        latest_reported_at: row.latest_reported_at,
        total_calls: row.total_calls || 1,
        summary: row.summary || "",
        summary_embedding: Array.isArray(row.summary_embedding)
          ? (row.summary_embedding as number[])
          : null,
        recent_call_notes: (Array.isArray(row.issue_calls) ? row.issue_calls : [])
          .slice(0, 4)
          .map((ic: Record<string, unknown>) => ({
            call_id: String(ic.call_id || ""),
            date: String(ic.created_at || ""),
            summary: String(ic.extracted_issue_summary || ""),
            resolution_state: String(ic.call_resolution_state || "unconfirmed"),
          })),
      }));

    // 6. Optional LLM + Embedding Enrichment with Company Catalogue
    const catalogue = await getCompanyCatalogue(call.user_id, workspaceId);
    const catalogueBlock = catalogue.isConfigured ? formatCatalogueForPrompt(catalogue) : undefined;

    let aiResult: JourneyAiAnalysisOutput | null = null;
    if (!options.skipLlm && turns.length > 0) {
      aiResult = await runLlmJourneyAnalysis({
        callId,
        callTitle: call.title || "Call",
        callDate: call.created_at,
        agentName,
        qaSummary: scoreObj?.summary || null,
        qaScore: scoreObj?.overall_score ?? null,
        qaVerdict: scoreObj?.verdict ?? null,
        metadata: {
          callerPhone: call.caller_phone || baselineIssue.extracted_phone,
          externalCustomerId:
            call.external_customer_ref || baselineIssue.extracted_customer_id,
          location: call.location || baselineIssue.location,
          serviceProvider: call.service_provider || baselineIssue.service_provider,
          productCategory: call.product_category || baselineIssue.product_service,
        },
        utterances: turns,
        priorIssues: priorDigests,
        catalogueBlock,
      });
    }

    const classification = validateCatalogueClassification(catalogue, aiResult?.catalogue_classification);
    const matchedServiceArea = classification.serviceAreas[0] || null;
    const matchedProduct = classification.products[0] || null;
    const matchedService = classification.services[0] || null;
    const finalExtracted = {
      ...baselineIssue,
      ...(aiResult?.extracted_issue
        ? {
          title: aiResult.extracted_issue.title || baselineIssue.title,
          category: ISSUE_CATEGORIES.includes(
            aiResult.extracted_issue.category as IssueCategory,
          )
            ? (aiResult.extracted_issue.category as IssueCategory)
            : baselineIssue.category,
          subcategory:
            aiResult.extracted_issue.subcategory || baselineIssue.subcategory,
          product_service:
            aiResult.extracted_issue.product_service ||
            baselineIssue.product_service,
          symptoms: aiResult.extracted_issue.symptoms?.length
            ? aiResult.extracted_issue.symptoms
            : baselineIssue.symptoms,
          location: aiResult.extracted_issue.location || baselineIssue.location,
          service_provider:
            aiResult.extracted_issue.service_provider ||
            baselineIssue.service_provider,
          summary: aiResult.extracted_issue.summary || baselineIssue.summary,
        }
        : {}),
    };

    if (!options.skipLlm) {
      try {
        finalExtracted.embedding = await embedQuery(
          `${finalExtracted.title} ${finalExtracted.category} ${finalExtracted.summary}`,
        );
      } catch {
        finalExtracted.embedding = null;
      }
    }

    // 7. Repeat Call & Issue Comparison (Phase 4)
    const deterministicComparison = compareWithPreviousIssues({
      currentIssue: finalExtracted,
      currentCallDate: call.created_at,
      currentTranscriptText: turns.map((t) => t.text).join(" "),
      priorIssues: priorDigests,
    });

    let matchClassification = deterministicComparison.matchClassification;
    let matchedPreviousIssueId = deterministicComparison.matchedPreviousIssueId;
    let matchConfidence = deterministicComparison.confidence;
    let matchReason = deterministicComparison.reason;
    let isRepeatCustomer = deterministicComparison.isRepeatCustomer;
    let isRepeatIssue = deterministicComparison.isRepeatIssue;

    if (
      aiResult?.repeat_detection &&
      priorDigests.length > 0 &&
      MATCH_CLASSIFICATIONS.includes(
        aiResult.repeat_detection.match_classification as MatchClassification,
      )
    ) {
      const aiMatchId = aiResult.repeat_detection.matched_previous_issue_id;
      const validPrior = priorDigests.find((p) => p.issue_id === aiMatchId);
      if (validPrior && validPrior.category === finalExtracted.category) {
        matchClassification = aiResult.repeat_detection.match_classification;
        matchedPreviousIssueId = validPrior.issue_id;
        matchConfidence = Number(
          (
            (deterministicComparison.confidence +
              (aiResult.repeat_detection.confidence || 0.8)) /
            2
          ).toFixed(2),
        );
        matchReason = aiResult.repeat_detection.reason || deterministicComparison.reason;
        isRepeatIssue =
          matchClassification === "same_issue" ||
          matchClassification === "related_issue" ||
          matchClassification === "reopened_issue";
      }
    }

    const matchedPriorDigest = priorDigests.find(
      (p) => p.issue_id === matchedPreviousIssueId,
    );

    const interactionNumber =
      isRepeatIssue && matchedPriorDigest
        ? (matchedPriorDigest.total_calls || 1) + 1
        : 1;

    const { count: priorCustomerCallCount } = await admin
      .from("issue_calls")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .neq("call_id", callId);

    const customerContactSequence = (priorCustomerCallCount ?? 0) + 1;
    if (customerContactSequence > 1) {
      isRepeatCustomer = true;
    }

    // 8. Issue Lifecycle Evaluation (Phase 5)
    const lifecycle = evaluateIssueLifecycle({
      matchClassification,
      previousIssueStatus: matchedPriorDigest?.status || null,
      utterances: turns,
      interactionNumber,
      aiSuggestedStatus: aiResult?.lifecycle?.recommended_issue_status || null,
      aiResolutionConfirmation:
        aiResult?.lifecycle?.resolution_confirmation || null,
      aiCallResolutionState:
        aiResult?.lifecycle?.call_resolution_state || null,
      aiReason: aiResult?.lifecycle?.status_change_reason || null,
    });

    // 9. Root Cause & Responsibility Evaluation (Phase 6)
    const rootCause = evaluateRootCauseIntelligence({
      category: finalExtracted.category,
      utterances: turns,
      priorCallSummaries: matchedPriorDigest?.recent_call_notes || [],
      interactionNumber,
      qaScore: scoreObj?.overall_score ?? null,
      qaComplianceFindings: scoreObj?.compliance_findings ?? null,
      aiRootCause: aiResult?.root_cause || null,
    });

    // 10. Create or Update Customer Issue record
    let issueId = matchedPriorDigest && isRepeatIssue ? matchedPriorDigest.issue_id : null;

    if (issueId && matchedPriorDigest) {
      const mergedSymptoms = Array.from(
        new Set([...(matchedPriorDigest.symptoms || []), ...finalExtracted.symptoms]),
      ).slice(0, 10);

      await admin
        .from("customer_issues")
        .update({
          status: lifecycle.newStatus,
          resolution_confirmation: lifecycle.resolutionConfirmation,
          latest_reported_at: call.created_at,
          resolved_at:
            lifecycle.newStatus === "resolved" || lifecycle.newStatus === "closed"
              ? call.created_at
              : null,
          reopened_count: lifecycle.isReopened
            ? (priorIssueRows?.find((r) => r.id === issueId)?.reopened_count || 0) + 1
            : priorIssueRows?.find((r) => r.id === issueId)?.reopened_count || 0,
          repeat_interaction_count: Math.max(0, interactionNumber - 1),
          total_calls: interactionNumber,
          symptoms: mergedSymptoms,
          location: finalExtracted.location || matchedPriorDigest.location,
          service_provider:
            finalExtracted.service_provider || matchedPriorDigest.service_provider,
          primary_root_cause: rootCause.primaryCategory,
          primary_root_cause_detail: rootCause.primarySubcategory,
          secondary_root_cause: rootCause.secondaryCategory,
          secondary_root_cause_detail: rootCause.secondarySubcategory,
          root_cause_evidence_type: rootCause.evidenceType,
          root_cause_confidence: rootCause.confidence,
          root_cause_explanation: rootCause.explanation,
          responsible_team: rootCause.responsibleTeam,
          recommended_action: rootCause.recommendedAction,
          summary: finalExtracted.summary,
          ...(finalExtracted.embedding
            ? { summary_embedding: finalExtracted.embedding }
            : {}),
          ...(matchedServiceArea ? { service_area_id: matchedServiceArea.id, service_area_name: matchedServiceArea.name } : {}),
          ...(matchedService ? { service_id: matchedService.id, service_name: matchedService.name } : {}),
          ...(matchedProduct ? { product_id: matchedProduct.id, product_name: matchedProduct.name } : {}),
          needs_review:
            (catalogue.isConfigured && classification.requiresReview) ||
            matchClassification === "needs_review" ||
            matchConfidence < 0.65,
          ...(!catalogue.migrationRequired && !catalogue.upgradeRequired ? {journey_requires_review: matchClassification === "needs_review" || matchConfidence < 0.65} : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    } else {
      const issueCode = `ISS-${Math.floor(1000 + Math.random() * 9000)}-${call.id
        .slice(0, 4)
        .toUpperCase()}`;

      const { data: createdIssue, error: issueCreateErr } = await admin
        .from("customer_issues")
        .insert({
          customer_id: customerId,
          workspace_id: workspaceId,
          user_id: call.user_id,
          issue_code: issueCode,
          title: finalExtracted.title,
          category: finalExtracted.category,
          subcategory: finalExtracted.subcategory,
          product_service: matchedService?.name || matchedProduct?.name || "Unclassified",
          service_area_id: matchedServiceArea?.id || null,
          service_area_name: matchedServiceArea?.name || null,
          service_id: matchedService?.id || null,
          service_name: matchedService?.name || null,
          product_id: matchedProduct?.id || null,
          product_name: matchedProduct?.name || null,
          symptoms: finalExtracted.symptoms,
          location: finalExtracted.location,
          service_provider: finalExtracted.service_provider,
          status: lifecycle.newStatus,
          resolution_confirmation: lifecycle.resolutionConfirmation,
          first_reported_at: call.created_at,
          latest_reported_at: call.created_at,
          resolved_at:
            lifecycle.newStatus === "resolved" ? call.created_at : null,
          reopened_count: 0,
          repeat_interaction_count: 0,
          total_calls: 1,
          primary_root_cause: rootCause.primaryCategory,
          primary_root_cause_detail: rootCause.primarySubcategory,
          secondary_root_cause: rootCause.secondaryCategory,
          secondary_root_cause_detail: rootCause.secondarySubcategory,
          root_cause_evidence_type: rootCause.evidenceType,
          root_cause_confidence: rootCause.confidence,
          root_cause_explanation: rootCause.explanation,
          responsible_team: rootCause.responsibleTeam,
          recommended_action: rootCause.recommendedAction,
          summary: finalExtracted.summary,
          summary_embedding: finalExtracted.embedding || null,
          needs_review: matchClassification === "needs_review",
          ...(!catalogue.migrationRequired && !catalogue.upgradeRequired ? {journey_requires_review: matchClassification === "needs_review" || matchConfidence < 0.65} : {}),
        })
        .select("id")
        .single();

      if (issueCreateErr || !createdIssue) {
        return {
          ok: false,
          error: issueCreateErr?.message || "Failed to create customer issue",
        };
      }
      issueId = createdIssue.id;
    }

    // 11. Upsert issue_calls, record Root Cause snapshot, and Status History in parallel
    await Promise.all([
      admin.from("issue_calls").upsert(
        {
          issue_id: issueId,
          call_id: callId,
          customer_id: customerId,
          workspace_id: workspaceId,
          user_id: call.user_id,
          interaction_number: interactionNumber,
          customer_contact_sequence: customerContactSequence,
          is_repeat_customer: isRepeatCustomer,
          is_repeat_issue: isRepeatIssue,
          match_classification: matchClassification,
          match_confidence: matchConfidence,
          matched_previous_issue_id: matchedPreviousIssueId,
          match_reason: matchReason,
          call_resolution_state: lifecycle.callResolutionState,
          extracted_category: finalExtracted.category,
          extracted_product_service: finalExtracted.product_service,
          extracted_symptoms: finalExtracted.symptoms,
          extracted_issue_summary: finalExtracted.summary,
          transcript_evidence: rootCause.transcriptExcerpts,
          model_version: JOURNEY_MODEL_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_id" },
      ),
      (async () => {
        await admin
          .from("issue_root_causes")
          .update({ is_current: false })
          .eq("issue_id", issueId);
        await admin.from("issue_root_causes").insert({
          issue_id: issueId,
          call_id: callId,
          workspace_id: workspaceId,
          user_id: call.user_id,
          category: rootCause.primaryCategory,
          subcategory: rootCause.primarySubcategory,
          secondary_category: rootCause.secondaryCategory,
          secondary_subcategory: rootCause.secondarySubcategory,
          evidence_type: rootCause.evidenceType,
          confidence: rootCause.confidence,
          explanation: rootCause.explanation,
          recommended_action: rootCause.recommendedAction,
          responsible_category: rootCause.responsibleTeam,
          transcript_excerpts: rootCause.transcriptExcerpts,
          model_version: JOURNEY_MODEL_VERSION,
          is_current: true,
        });
      })(),
      lifecycle.previousStatus !== lifecycle.newStatus
        ? admin.from("issue_status_history").insert({
          issue_id: issueId,
          call_id: callId,
          workspace_id: workspaceId,
          user_id: call.user_id,
          previous_status: lifecycle.previousStatus,
          new_status: lifecycle.newStatus,
          resolution_confirmation: lifecycle.resolutionConfirmation,
          changed_by_type: "ai",
          reason: lifecycle.reason,
        })
        : Promise.resolve(),
    ]);

    // Persist validated catalogue associations using the same tenant as the call.
    if (issueId && catalogue.isConfigured) {
      await persistIssueCatalogueClassification({userId:call.user_id,workspaceId,issueId,callId,classification,raw:aiResult?.catalogue_classification || {},catalogue});
    }

    // 13. Update interactions row if present with resolved catalogue metadata
    try {
      await admin
        .from("interactions")
        .update({
          service_area_id: matchedServiceArea?.id || null,
          service_id: matchedService?.id || null,
          product_id: matchedProduct?.id || null,
        })
        .eq("call_id", callId);
    } catch {
      // safe fallback if interactions table is unpopulated for this call
    }

    // 14. Refresh Customer Aggregate Metrics
    if (customerId) {
      await refreshCustomerAggregateMetrics(customerId);
    }

    return {
      ok: true,
      customerId: customerId ?? undefined,
      issueId: issueId ?? undefined,
      matchClassification,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { ok: false, migrationRequired: true };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Journey analysis failed",
    };
  }
}

/**
 * Classify an already-linked issue against the workspace's active Company Catalogue without
 * creating duplicate issues or disturbing customer-identity history.
 */
export async function classifyExistingIssueWithCatalogue(
  issueId: string,
  callId: string,
  actorUserId: string,
): Promise<{ ok: boolean; skipped?: boolean; classified?: boolean; error?: string }> {
  const admin = createAdminClient();
  invalidateInMemoryJourneyCache();

  try {
    const [membership, { data: issue }, { data: call }, { data: utterances }] = await Promise.all([
      getMembership(actorUserId).catch(() => null),
      admin.from("customer_issues").select("*").eq("id", issueId).maybeSingle(),
      admin.from("calls").select("*, agents(name), call_scores(*)").eq("id", callId).maybeSingle(),
      admin.from("utterances").select("*").eq("call_id", callId).order("sequence", { ascending: true }),
    ]);

    if (!issue || !call) {
      return { ok: false, error: "Issue or call not found for catalogue classification." };
    }

    const workspaceId = issue.workspace_id || membership?.workspaceId || null;
    const catalogue = await getCompanyCatalogue(call.user_id, workspaceId);
    if (!catalogue.isConfigured || catalogue.migrationRequired) {
      return { ok: true, skipped: true };
    }

    const turns: CallTranscriptTurn[] = (utterances || []).map((u) => ({
      speaker: u.speaker_label || "Speaker",
      role: u.role || "unknown",
      text: u.text || "",
      start_ms: u.start_ms,
      end_ms: u.end_ms,
    }));
    if (!turns.length) {
      return { ok: true, skipped: true };
    }

    const scoreObj = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
    const agentObj = Array.isArray(call.agents) ? call.agents[0] : call.agents;
    const agentName = (agentObj as { name?: string } | null)?.name || null;

    const aiResult = await runLlmJourneyAnalysis({
      callId,
      callTitle: call.title || "Call",
      callDate: call.created_at,
      agentName,
      qaSummary: scoreObj?.summary || issue.summary || null,
      qaScore: scoreObj?.overall_score ?? null,
      qaVerdict: scoreObj?.verdict ?? null,
      metadata: {
        callerPhone: call.caller_phone || null,
        externalCustomerId: call.external_customer_ref || null,
        location: call.location || issue.location || null,
        serviceProvider: call.service_provider || issue.service_provider || null,
        productCategory: call.product_category || issue.product_service || null,
      },
      utterances: turns,
      priorIssues: [],
      catalogueBlock: formatCatalogueForPrompt(catalogue),
    });

    const classification = validateCatalogueClassification(
      catalogue,
      aiResult?.catalogue_classification,
    );
    await persistIssueCatalogueClassification({
      userId: call.user_id,
      workspaceId,
      issueId,
      callId,
      classification,
      raw: aiResult?.catalogue_classification || {},
      catalogue,
    });

    await admin
      .from("interactions")
      .update({
        service_area_id: classification.serviceAreas[0]?.id || null,
        service_id: classification.services[0]?.id || null,
        product_id: classification.products[0]?.id || null,
      })
      .eq("call_id", callId);

    return {
      ok: true,
      classified:
        classification.products.length > 0 ||
        classification.services.length > 0 ||
        classification.serviceAreas.length > 0 ||
        Boolean(classification.issueCategory),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Catalogue classification failed",
    };
  }
}

/**
 * Backfills Customer Journey & Repeat Issue Intelligence across all calls in the workspace
 * ordered chronologically (`created_at asc`) so repeat call chains link naturally.
 */
export async function backfillWorkspaceCustomerJourneys(
  userId: string,
  options: { force?: boolean; classifyUnmapped?: boolean; limit?: number; skipLlm?: boolean } = {},
): Promise<{
  ok: boolean;
  migrationRequired?: boolean;
  processed: number;
  skipped: number;
  errors: number;
}> {
  const admin = createAdminClient();
  const teamScope = await getTeamScope(userId);
  const maxCalls = options.limit || (options.classifyUnmapped ? 25 : 50);
  invalidateInMemoryJourneyCache();

  const calls: Array<{ id: string; unmappedIssueId?: string }> = [];
  for (let offset = 0; calls.length < maxCalls; offset += 100) {
    const { data: candidates, error } = await admin
      .from("calls")
      .select("id, created_at")
      .in("user_id", teamScope)
      .in("status", ["transcribed", "completed"])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 99);
    if (error) return { ok: false, processed: 0, skipped: 0, errors: 1 };
    if (!candidates?.length) break;
    if (options.force) {
      calls.push(...candidates.slice(0, maxCalls - calls.length).map((c) => ({ id: c.id })));
    } else {
      const { data: links, error: linkError } = await admin
        .from("issue_calls")
        .select(
          "call_id, issue_id, customer_issues!issue_calls_issue_id_fkey(product_id, service_id, service_area_id, catalogue_issue_category_id)",
        )
        .in("user_id", teamScope)
        .in("call_id", candidates.map(call => call.id));
      if (linkError) return { ok: false, migrationRequired: isMissingTableError(linkError), processed: 0, skipped: 0, errors: 1 };
      const analyzed = new Set<string>();
      const unmappedIssueByCallId = new Map<string, string>();
      for (const link of links || []) {
        analyzed.add(link.call_id);
        if (options.classifyUnmapped && link.issue_id) {
          const iss = Array.isArray(link.customer_issues)
            ? link.customer_issues[0]
            : link.customer_issues;
          if (
            iss &&
            !iss.product_id &&
            !iss.service_id &&
            !iss.service_area_id &&
            !iss.catalogue_issue_category_id
          ) {
            unmappedIssueByCallId.set(link.call_id, link.issue_id);
          }
        }
      }
      for (const call of candidates) {
        if (calls.length >= maxCalls) break;
        if (!analyzed.has(call.id)) {
          calls.push({ id: call.id });
        } else if (options.classifyUnmapped && unmappedIssueByCallId.has(call.id)) {
          calls.push({ id: call.id, unmappedIssueId: unmappedIssueByCallId.get(call.id) });
        }
      }
    }
    if (candidates.length < 100) break;
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const call of calls) {
    if (call.unmappedIssueId && !options.force) {
      const res = await classifyExistingIssueWithCatalogue(call.unmappedIssueId, call.id, userId);
      if (res.ok) {
        if (res.skipped) skipped++;
        else processed++;
      } else {
        errors++;
      }
      continue;
    }

    const res = await analyzeCallCustomerJourney(call.id, {
      force: options.force,
      skipLlm: options.skipLlm ?? calls.length > 5,
    });
    if (res.migrationRequired) {
      return { ok: false, migrationRequired: true, processed: 0, skipped: 0, errors: 0 };
    }
    if (res.ok) {
      if (res.skipped) skipped++;
      else processed++;
    } else {
      errors++;
    }
  }

  return { ok: errors === 0, processed, skipped, errors };
}

/**
 * Synthesizes a live in-memory projection from existing `calls`, `utterances`, and `call_scores`
 * with a 30-second cache and in-memory human review/override persistence when `supabase/customer-journey.sql`
 * tables have not been migrated yet.
 */
async function buildInMemoryProjection(
  teamScope: string[],
  defaultCountry: string,
): Promise<{
  customers: CustomerDirectoryItem[];
  issues: IssueSummaryItem[];
  timelineCalls: TimelineCallEntry[];
}> {
  const store = getInMemoryStore();
  const scopeKey = `${defaultCountry}:${teamScope.slice().sort().join(",")}`;
  const now = Date.now();
  const cached = store.projectionCache.get(scopeKey);

  let baseCustomers: CustomerDirectoryItem[];
  let baseIssues: IssueSummaryItem[];
  let baseTimeline: TimelineCallEntry[];

  if (cached && cached.expiresAt > now) {
    baseCustomers = cached.customers.map((c) => ({ ...c, top_issue_categories: [...c.top_issue_categories] }));
    baseIssues = cached.issues.map((i) => ({ ...i, symptoms: [...i.symptoms] }));
    baseTimeline = cached.timelineCalls.map((t) => ({
      ...t,
      extracted_symptoms: [...t.extracted_symptoms],
      transcript_evidence: [...t.transcript_evidence],
    }));
  } else {
    const admin = createAdminClient();
    const { data: calls } = await admin
      .from("calls")
      .select("*, agents(name), call_scores(*)")
      .in("user_id", teamScope)
      .order("created_at", { ascending: true })
      .limit(120);

    const callRows = calls || [];
    if (!callRows.length) {
      return { customers: [], issues: [], timelineCalls: [] };
    }

    const callIds = callRows.map((c) => c.id);
    const { data: allUtterances } = await admin
      .from("utterances")
      .select("call_id, sequence, speaker_label, role, text")
      .in("call_id", callIds)
      .order("sequence", { ascending: true });

    const uttByCall = new Map<string, CallTranscriptTurn[]>();
    for (const u of allUtterances || []) {
      const list = uttByCall.get(u.call_id) || [];
      list.push({
        speaker: u.speaker_label || "Speaker",
        role: u.role || "unknown",
        text: u.text || "",
      });
      uttByCall.set(u.call_id, list);
    }

    const customerMap = new Map<string, CustomerDirectoryItem>();
    const customerProfiles: ExistingCustomerProfile[] = [];
    const issuesByCustomer = new Map<string, Array<PriorIssueDigest & { full: IssueSummaryItem }>>();
    const allIssues: IssueSummaryItem[] = [];
    const allTimeline: TimelineCallEntry[] = [];

    for (const call of callRows) {
      const turns = uttByCall.get(call.id) || [];
      const scoreObj = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
      const agentObj = Array.isArray(call.agents) ? call.agents[0] : call.agents;
      const agentName = (agentObj as { name?: string } | null)?.name || "Unassigned";

      const extracted = extractStructuredIssueFromCall({
        title: call.title,
        fileName: call.file_name,
        qaSummary: scoreObj?.summary || null,
        utterances: turns,
        defaultCountry,
      });

      const candidates = extractCandidateIdentifiers({
        explicitCustomerId: extracted.extracted_customer_id,
        callerPhone: extracted.extracted_phone,
        fileName: call.file_name,
        title: call.title,
        utterances: turns,
        defaultCountry,
      });

      const match = matchCustomerProfile(candidates, customerProfiles);
      let custId = match.matchedCustomer?.id || null;

      if (!custId) {
        const phoneCand = candidates.find(
          (c) => c.idType === "msisdn" || c.idType === "extracted_phone",
        );
        const idCand = candidates.find(
          (c) => c.idType === "customer_id" || c.idType === "extracted_id",
        );
        const primaryId =
          idCand?.normalizedValue ||
          phoneCand?.normalizedValue ||
          `CALLER-${call.id.slice(0, 6).toUpperCase()}`;
        custId = `cust-${call.id.slice(0, 8)}`;

        const profile: ExistingCustomerProfile = {
          id: custId,
          workspace_id: null,
          user_id: call.user_id,
          primary_identifier: primaryId,
          display_label: phoneCand?.normalizedValue
            ? formatPhoneReadable(phoneCand.normalizedValue)
            : primaryId,
          normalized_phone: phoneCand?.normalizedValue || null,
          external_customer_id: idCand?.normalizedValue || null,
          country_code: defaultCountry,
        };
        customerProfiles.push(profile);

        customerMap.set(custId, {
          id: custId,
          primary_identifier: profile.primary_identifier,
          display_label: profile.display_label,
          normalized_phone: profile.normalized_phone,
          external_customer_id: profile.external_customer_id,
          country_code: defaultCountry,
          total_calls: 0,
          repeat_call_count: 0,
          recurring_issue_count: 0,
          new_issue_count: 0,
          unresolved_issue_count: 0,
          resolved_issue_count: 0,
          reopened_issue_count: 0,
          avg_hours_between_calls: null,
          top_issue_categories: [],
          risk_level: "low",
          needs_identity_review: !phoneCand && !idCand,
          first_interaction_at: call.created_at,
          last_interaction_at: call.created_at,
        });
      }

      const custRecord = customerMap.get(custId)!;
      const custPriorIssues = issuesByCustomer.get(custId) || [];

      const repeatCheck = compareWithPreviousIssues({
        currentIssue: extracted,
        currentCallDate: call.created_at,
        currentTranscriptText: turns.map((t) => t.text).join(" "),
        priorIssues: custPriorIssues,
      });

      const matchedPrior = custPriorIssues.find(
        (p) => p.issue_id === repeatCheck.matchedPreviousIssueId,
      );
      const interactionNumber =
        repeatCheck.isRepeatIssue && matchedPrior ? matchedPrior.total_calls + 1 : 1;

      const lifecycle = evaluateIssueLifecycle({
        matchClassification: repeatCheck.matchClassification,
        previousIssueStatus: matchedPrior?.status || null,
        utterances: turns,
        interactionNumber,
      });

      const rootCause = evaluateRootCauseIntelligence({
        category: extracted.category,
        utterances: turns,
        priorCallSummaries: matchedPrior?.recent_call_notes || [],
        interactionNumber,
        qaScore: scoreObj?.overall_score ?? null,
        qaComplianceFindings: scoreObj?.compliance_findings ?? null,
      });

      let targetIssue: IssueSummaryItem;
      if (repeatCheck.isRepeatIssue && matchedPrior) {
        targetIssue = matchedPrior.full;
        targetIssue.status = lifecycle.newStatus;
        targetIssue.resolution_confirmation = lifecycle.resolutionConfirmation;
        targetIssue.latest_reported_at = call.created_at;
        targetIssue.total_calls = interactionNumber;
        targetIssue.repeat_interaction_count = interactionNumber - 1;
        if (lifecycle.isReopened) targetIssue.reopened_count += 1;
        targetIssue.primary_root_cause = rootCause.primaryCategory;
        targetIssue.primary_root_cause_detail = rootCause.primarySubcategory;
        targetIssue.secondary_root_cause = rootCause.secondaryCategory;
        targetIssue.secondary_root_cause_detail = rootCause.secondarySubcategory;
        targetIssue.root_cause_evidence_type = rootCause.evidenceType;
        targetIssue.root_cause_confidence = rootCause.confidence;
        targetIssue.root_cause_explanation = rootCause.explanation;
        targetIssue.responsible_team = rootCause.responsibleTeam;
        targetIssue.recommended_action = rootCause.recommendedAction;

        matchedPrior.status = lifecycle.newStatus;
        matchedPrior.total_calls = interactionNumber;
        matchedPrior.latest_reported_at = call.created_at;
        matchedPrior.recent_call_notes.push({
          call_id: call.id,
          date: call.created_at,
          agent_name: agentName,
          summary: extracted.summary,
          resolution_state: lifecycle.callResolutionState,
        });
      } else {
        const issueId = `iss-${call.id.slice(0, 8)}`;
        const issueCode = `ISS-${1000 + allIssues.length + 1}`;
        targetIssue = {
          id: issueId,
          issue_code: issueCode,
          customer_id: custId,
          customer_label: custRecord.display_label,
          customer_phone: custRecord.normalized_phone,
          title: extracted.title,
          category: extracted.category,
          subcategory: extracted.subcategory,
          product_service: extracted.product_service,
          symptoms: extracted.symptoms,
          location: extracted.location,
          service_provider: extracted.service_provider,
          status: lifecycle.newStatus,
          resolution_confirmation: lifecycle.resolutionConfirmation,
          first_reported_at: call.created_at,
          latest_reported_at: call.created_at,
          resolved_at: lifecycle.newStatus === "resolved" ? call.created_at : null,
          reopened_count: 0,
          repeat_interaction_count: 0,
          total_calls: 1,
          primary_root_cause: rootCause.primaryCategory,
          primary_root_cause_detail: rootCause.primarySubcategory,
          secondary_root_cause: rootCause.secondaryCategory,
          secondary_root_cause_detail: rootCause.secondarySubcategory,
          root_cause_evidence_type: rootCause.evidenceType,
          root_cause_confidence: rootCause.confidence,
          root_cause_explanation: rootCause.explanation,
          responsible_team: rootCause.responsibleTeam,
          recommended_action: rootCause.recommendedAction,
          summary: extracted.summary,
          needs_review: repeatCheck.needsReview,
          human_verified: false,
        };
        allIssues.push(targetIssue);
        custPriorIssues.push({
          issue_id: issueId,
          issue_code: issueCode,
          title: extracted.title,
          category: extracted.category,
          subcategory: extracted.subcategory,
          product_service: extracted.product_service,
          symptoms: extracted.symptoms,
          location: extracted.location,
          service_provider: extracted.service_provider,
          status: lifecycle.newStatus,
          resolution_confirmation: lifecycle.resolutionConfirmation,
          first_reported_at: call.created_at,
          latest_reported_at: call.created_at,
          total_calls: 1,
          summary: extracted.summary,
          recent_call_notes: [
            {
              call_id: call.id,
              date: call.created_at,
              agent_name: agentName,
              summary: extracted.summary,
              resolution_state: lifecycle.callResolutionState,
            },
          ],
          full: targetIssue,
        });
        issuesByCustomer.set(custId, custPriorIssues);
      }

      custRecord.total_calls += 1;
      if (repeatCheck.isRepeatIssue) custRecord.repeat_call_count += 1;
      custRecord.last_interaction_at = call.created_at;

      allTimeline.push({
        id: `ic-${call.id}`,
        call_id: call.id,
        issue_id: targetIssue.id,
        issue_code: targetIssue.issue_code,
        issue_title: targetIssue.title,
        issue_status: targetIssue.status,
        resolution_confirmation: targetIssue.resolution_confirmation,
        interaction_number: interactionNumber,
        customer_contact_sequence: custRecord.total_calls,
        is_repeat_customer: custRecord.total_calls > 1,
        is_repeat_issue: repeatCheck.isRepeatIssue,
        match_classification: repeatCheck.matchClassification,
        match_confidence: repeatCheck.confidence,
        match_reason: repeatCheck.reason,
        call_resolution_state: lifecycle.callResolutionState,
        extracted_category: extracted.category,
        extracted_product_service: extracted.product_service,
        extracted_symptoms: extracted.symptoms,
        extracted_issue_summary: extracted.summary,
        transcript_evidence: rootCause.transcriptExcerpts,
        human_review_status: null,
        call_title: call.title || call.file_name || "Call",
        call_date: call.created_at,
        call_status: call.status,
        duration_seconds: call.duration_seconds,
        agent_id: call.agent_id,
        agent_name: agentName,
        qa_score: scoreObj?.overall_score ?? null,
        qa_verdict: scoreObj?.verdict ?? null,
        qa_sentiment: scoreObj?.customer_sentiment ?? null,
        qa_summary: scoreObj?.summary ?? null,
        primary_root_cause: rootCause.primaryCategory,
        root_cause_evidence_type: rootCause.evidenceType,
      });
    }

    // Finalize customer aggregates
    for (const [custId, cust] of customerMap.entries()) {
      const custIssues = (issuesByCustomer.get(custId) || []).map((x) => x.full);
      cust.new_issue_count = custIssues.length;
      cust.recurring_issue_count = custIssues.filter((i) => i.total_calls > 1).length;
      cust.resolved_issue_count = custIssues.filter(
        (i) => i.status === "resolved" || i.status === "closed",
      ).length;
      cust.unresolved_issue_count = custIssues.length - cust.resolved_issue_count;
      cust.reopened_issue_count = custIssues.filter((i) => i.reopened_count > 0).length;
      cust.top_issue_categories = Array.from(new Set(custIssues.map((i) => i.category))).slice(0, 3);
      cust.risk_level = computeCustomerRiskLevel({
        repeatCallCount: cust.repeat_call_count,
        unresolvedIssueCount: cust.unresolved_issue_count,
        reopenedIssueCount: cust.reopened_issue_count,
        escalatedIssueCount: custIssues.filter((i) => i.status === "escalated").length,
      });
    }

    baseCustomers = Array.from(customerMap.values()).sort(
      (a, b) =>
        new Date(b.last_interaction_at || 0).getTime() -
        new Date(a.last_interaction_at || 0).getTime(),
    );
    baseIssues = allIssues.sort(
      (a, b) =>
        new Date(b.latest_reported_at).getTime() -
        new Date(a.latest_reported_at).getTime(),
    );
    baseTimeline = allTimeline;

    store.projectionCache.set(scopeKey, {
      expiresAt: now + 30_000,
      customers: baseCustomers,
      issues: baseIssues,
      timelineCalls: baseTimeline,
    });
  }

  // Apply any in-memory human reviews & identity overrides on top of the projection
  for (const splitIss of store.splitIssues.values()) {
    if (!baseIssues.some((i) => i.id === splitIss.id)) {
      baseIssues.unshift({ ...splitIss });
    }
  }

  for (let i = 0; i < baseIssues.length; i++) {
    const ov = store.issueOverrides.get(baseIssues[i].id);
    if (ov) {
      baseIssues[i] = { ...baseIssues[i], ...ov };
    }
  }

  for (let i = 0; i < baseCustomers.length; i++) {
    const cust = baseCustomers[i];
    const ov = store.customerOverrides.get(cust.id);
    const mergedCust = ov ? { ...cust, ...ov } : { ...cust };
    const custIssues = baseIssues.filter((iss) => iss.customer_id === mergedCust.id);
    if (custIssues.length > 0) {
      mergedCust.new_issue_count = custIssues.length;
      mergedCust.recurring_issue_count = custIssues.filter((x) => x.total_calls > 1).length;
      mergedCust.resolved_issue_count = custIssues.filter(
        (x) => x.status === "resolved" || x.status === "closed",
      ).length;
      mergedCust.unresolved_issue_count =
        custIssues.length - mergedCust.resolved_issue_count;
      mergedCust.reopened_issue_count = custIssues.filter((x) => x.reopened_count > 0).length;
      for (const iss of custIssues) {
        iss.customer_label = mergedCust.display_label;
        iss.customer_phone = mergedCust.normalized_phone;
      }
    }
    baseCustomers[i] = mergedCust;
  }

  const issueLookup = new Map(baseIssues.map((i) => [i.id, i]));
  for (let i = 0; i < baseTimeline.length; i++) {
    const tc = baseTimeline[i];
    const callOv = store.callOverrides.get(tc.call_id);
    const updatedTc = callOv ? { ...tc, ...callOv } : { ...tc };
    const parentIss = issueLookup.get(updatedTc.issue_id);
    if (parentIss) {
      updatedTc.issue_code = parentIss.issue_code;
      updatedTc.issue_title = parentIss.title;
      updatedTc.issue_status = parentIss.status;
      updatedTc.resolution_confirmation = parentIss.resolution_confirmation;
      updatedTc.primary_root_cause = parentIss.primary_root_cause;
      updatedTc.root_cause_evidence_type = parentIss.root_cause_evidence_type;
    }
    baseTimeline[i] = updatedTc;
  }

  return {
    customers: baseCustomers,
    issues: baseIssues,
    timelineCalls: baseTimeline,
  };
}

/**
 * Loads the complete Customer Intelligence Overview, Directory, Repeat Calls Dashboard,
 * and Operational Accountability Analytics with server-side filtering and pagination.
 */
export async function getCustomerIntelligenceOverview(
  userId: string,
  filters: CustomerIntelligenceFilters = {},
): Promise<CustomerIntelligenceOverview> {
  const admin = createAdminClient();
  const [teamScope, membership] = await Promise.all([
    getTeamScope(userId),
    getMembership(userId).catch(() => null),
  ]);
  const defaultCountry = resolveCountryIso(membership?.country);
  const catalogue = await getCompanyCatalogue(userId, membership?.workspaceId || null);

  // Check total workspace calls and customers table in parallel
  const [{ count: totalWorkspaceCallsCount, error: callsError }, { data: dbCustomers, error: custErr }] =
    await Promise.all([
      admin
        .from("calls")
        .select("id", { count: "exact", head: true })
        .in("user_id", teamScope)
        .in("status", ["transcribed", "completed"]),
      admin
        .from("customers")
        .select("*")
        .in("user_id", teamScope)
        .order("last_interaction_at", { ascending: false }),
    ]);

  if (callsError) throw new Error("Could not load calls: " + callsError.message);
  if (custErr && !isMissingTableError(custErr)) throw new Error("Could not load customers: " + custErr.message);
  let migrationRequired = false;
  let customersList: CustomerDirectoryItem[] = [];
  let issuesList: IssueSummaryItem[] = [];
  let timelineCallsList: TimelineCallEntry[] = [];

  if (custErr && isMissingTableError(custErr)) {
    migrationRequired = true;
    // Never invent temporary customer records in production. The UI receives an
    // explicit setup state until the durable journey tables are available.
  } else {
    const [
      { data: refreshedCustomers, error: refreshError },
      { data: dbIssues, error: issuesError },
      { data: dbIssueCalls, error: issueCallsError },
    ] = await Promise.all([
      loadAllJourneyRows((from, to) => admin
        .from("customers")
        .select("*")
        .in("user_id", teamScope)
        .order("last_interaction_at", { ascending: false }).order("id").range(from, to)),
      loadAllJourneyRows((from, to) => admin
        .from("customer_issues")
        .select("*, customers(display_label, normalized_phone)")
        .in("user_id", teamScope)
        .order("latest_reported_at", { ascending: false }).order("id").range(from, to)),
      loadAllJourneyRows((from, to) => admin
        .from("issue_calls")
        .select(
          "*, customer_issues!issue_calls_issue_id_fkey(issue_code, title, status, resolution_confirmation, primary_root_cause, root_cause_evidence_type), calls(id, title, file_name, created_at, status, duration_seconds, agent_id, agents(name), call_scores(overall_score, verdict, customer_sentiment, summary))",
        )
        .in("user_id", teamScope)
        .order("created_at", { ascending: false }).order("id").range(from, to)),
    ]);

    const queryError = refreshError || issuesError || issueCallsError;
    if (queryError) throw new Error("Could not load customer history: " + queryError.message);
    customersList = (refreshedCustomers || dbCustomers || []).map((c) => ({
      id: c.id,
      primary_identifier: c.primary_identifier,
      display_label: c.display_label,
      normalized_phone: c.normalized_phone,
      external_customer_id: c.external_customer_id,
      country_code: c.country_code,
      total_calls: c.total_calls || 0,
      repeat_call_count: c.repeat_call_count || 0,
      recurring_issue_count: c.recurring_issue_count || 0,
      new_issue_count: c.new_issue_count || 0,
      unresolved_issue_count: c.unresolved_issue_count || 0,
      resolved_issue_count: c.resolved_issue_count || 0,
      reopened_issue_count: c.reopened_issue_count || 0,
      avg_hours_between_calls:
        c.avg_hours_between_calls == null ? null : Number(c.avg_hours_between_calls),
      top_issue_categories: c.top_issue_categories || [],
      risk_level: (c.risk_level || "low") as CustomerDirectoryItem["risk_level"],
      needs_identity_review: Boolean(c.needs_identity_review),
      first_interaction_at: c.first_interaction_at,
      last_interaction_at: c.last_interaction_at,
    }));

    issuesList = (dbIssues || []).map((iss) => {
      const custObj = Array.isArray(iss.customers) ? iss.customers[0] : iss.customers;
      return {
        id: iss.id,
        issue_code: iss.issue_code,
        customer_id: iss.customer_id,
        customer_label:
          (custObj as { display_label?: string } | null)?.display_label || "Customer",
        customer_phone:
          (custObj as { normalized_phone?: string | null } | null)?.normalized_phone ||
          null,
        title: iss.title,
        category: iss.category,
        subcategory: iss.subcategory,
        product_service: iss.product_service,
        symptoms: iss.symptoms || [],
        location: iss.location,
        service_provider: iss.service_provider,
        status: iss.status as IssueLifecycleStatus,
        resolution_confirmation: iss.resolution_confirmation as ResolutionConfirmation,
        first_reported_at: iss.first_reported_at,
        latest_reported_at: iss.latest_reported_at,
        resolved_at: iss.resolved_at,
        reopened_count: iss.reopened_count || 0,
        repeat_interaction_count: iss.repeat_interaction_count || 0,
        total_calls: iss.total_calls || 1,
        primary_root_cause: iss.primary_root_cause as RootCauseCategory,
        primary_root_cause_detail: iss.primary_root_cause_detail,
        secondary_root_cause: (iss.secondary_root_cause || null) as RootCauseCategory | null,
        secondary_root_cause_detail: iss.secondary_root_cause_detail || null,
        root_cause_evidence_type: iss.root_cause_evidence_type as RootCauseEvidenceType,
        root_cause_confidence: Number(iss.root_cause_confidence ?? 0.5),
        root_cause_explanation: iss.root_cause_explanation,
        responsible_team: iss.responsible_team,
        recommended_action: iss.recommended_action,
        summary: iss.summary || "",
        service_id: iss.service_id || null,
        service_name: iss.service_name || null,
        product_id: iss.product_id || null,
        product_name: iss.product_name || null,
        service_area_id: iss.service_area_id || null,
        service_area_name: iss.service_area_name || null,
        catalogue_issue_category_id: iss.catalogue_issue_category_id || null,
        catalogue_issue_category_name: iss.catalogue_issue_category_name || null,
        needs_review: Boolean(iss.needs_review),
        human_verified: Boolean(iss.human_verified),
      };
    });

    timelineCallsList = (dbIssueCalls || []).map((ic) => {
      const issObj = Array.isArray(ic.customer_issues)
        ? ic.customer_issues[0]
        : ic.customer_issues;
      const callObj = Array.isArray(ic.calls) ? ic.calls[0] : ic.calls;
      const agentObj =
        callObj && "agents" in callObj
          ? Array.isArray(callObj.agents)
            ? callObj.agents[0]
            : callObj.agents
          : null;
      const scoreObj =
        callObj && "call_scores" in callObj
          ? Array.isArray(callObj.call_scores)
            ? callObj.call_scores[0]
            : callObj.call_scores
          : null;

      return {
        id: ic.id,
        call_id: ic.call_id,
        issue_id: ic.issue_id,
        issue_code: (issObj as { issue_code?: string } | null)?.issue_code || "ISS",
        issue_title: (issObj as { title?: string } | null)?.title || "Issue",
        issue_status: ((issObj as { status?: string } | null)?.status ||
          "open") as IssueLifecycleStatus,
        resolution_confirmation: ((issObj as { resolution_confirmation?: string } | null)
          ?.resolution_confirmation || "unconfirmed") as ResolutionConfirmation,
        interaction_number: ic.interaction_number || 1,
        customer_contact_sequence: ic.customer_contact_sequence || 1,
        is_repeat_customer: Boolean(ic.is_repeat_customer),
        is_repeat_issue: Boolean(ic.is_repeat_issue),
        match_classification: ic.match_classification as MatchClassification,
        match_confidence: Number(ic.match_confidence ?? 1),
        match_reason: ic.match_reason || "",
        call_resolution_state: ic.call_resolution_state || "unconfirmed",
        extracted_category: ic.extracted_category,
        extracted_product_service: ic.extracted_product_service,
        extracted_symptoms: ic.extracted_symptoms || [],
        extracted_issue_summary: ic.extracted_issue_summary || "",
        transcript_evidence: Array.isArray(ic.transcript_evidence)
          ? (ic.transcript_evidence as TranscriptEvidenceExcerpt[])
          : [],
        human_review_status: ic.human_review_status || null,
        call_title:
          (callObj as { title?: string; file_name?: string } | null)?.title ||
          (callObj as { file_name?: string } | null)?.file_name ||
          "Call",
        customer_id: ic.customer_id,
        file_name: (callObj as { file_name?: string | null } | null)?.file_name ?? null,
        call_date:
          (callObj as { created_at?: string } | null)?.created_at || ic.created_at,
        call_status: (callObj as { status?: string } | null)?.status || "completed",
        duration_seconds:
          (callObj as { duration_seconds?: number | null } | null)?.duration_seconds ??
          null,
        agent_id: (callObj as { agent_id?: string | null } | null)?.agent_id ?? null,
        agent_name: (agentObj as { name?: string } | null)?.name || "Unassigned",
        qa_score:
          (scoreObj as { overall_score?: number | null } | null)?.overall_score ?? null,
        qa_verdict: (scoreObj as { verdict?: string | null } | null)?.verdict ?? null,
        qa_sentiment:
          (scoreObj as { customer_sentiment?: string | null } | null)
            ?.customer_sentiment ?? null,
        qa_summary: (scoreObj as { summary?: string | null } | null)?.summary ?? null,
        primary_root_cause: ((issObj as { primary_root_cause?: string } | null)
          ?.primary_root_cause || "unknown_insufficient_evidence") as RootCauseCategory,
        root_cause_evidence_type: ((
          issObj as { root_cause_evidence_type?: string } | null
        )?.root_cause_evidence_type || "insufficient_evidence") as RootCauseEvidenceType,
        recording_key: recordingIdentityKey({
          callId: ic.call_id,
          fileName: (callObj as { file_name?: string | null } | null)?.file_name,
          title: (callObj as { title?: string | null } | null)?.title,
          durationSeconds: (callObj as { duration_seconds?: number | null } | null)?.duration_seconds,
        }),
        audit_count: 1,
        duplicate_call_ids: [],
        audit_dates: [(callObj as { created_at?: string } | null)?.created_at || ic.created_at],
      };
    });
  }

  // Collect available filter options before filtering
  const allAgents = Array.from(
    new Set(timelineCallsList.map((c) => c.agent_name).filter(Boolean)),
  ).sort();
  const allProviders = Array.from(
    new Set(
      issuesList
        .map((i) => i.service_provider)
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();
  const allLocations = Array.from(
    new Set(
      issuesList.map((i) => i.location).filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  if (!catalogue.migrationRequired) {
    const {data:relationships,error:relationshipError}=await loadAllJourneyRows((from,to)=>admin.from("issue_service_relationships").select("*").in("user_id",teamScope).order("id").range(from,to));
    if(relationshipError)throw new Error("Could not load issue catalogue relationships: "+relationshipError.message);
    for(const issue of issuesList){
      const links=(relationships||[]).filter(link=>link.issue_id===issue.id && link.is_current!==false);
      issue.catalogue_products=catalogue.products.filter(p=>p.id===issue.product_id||links.some(link=>link.product_id===p.id)).map(p=>({id:p.id,name:p.name}));
      issue.catalogue_services=catalogue.services.filter(s=>s.id===issue.service_id||links.some(link=>link.service_id===s.id)).map(s=>({id:s.id,name:s.name}));
      issue.catalogue_areas=catalogue.serviceAreas.filter(a=>a.id===issue.service_area_id||links.some(link=>link.service_area_id===a.id)).map(a=>({id:a.id,name:a.name}));
    }
  }
  for(const customer of customersList) customer.top_issue_categories=Array.from(new Set(issuesList.filter(issue=>issue.customer_id===customer.id).map(issue=>issue.catalogue_issue_category_name||"Unclassified"))).slice(0,3);
  // Apply filters
  const searchQuery = (filters.search || "").trim().toLowerCase();
  const normalizedPhoneSearch = searchQuery
    ? normalizePhoneNumber(searchQuery, defaultCountry).e164
    : null;

  const searchCustomerIds = new Set(customersList.filter(customer => {
    if (!searchQuery) return false;
    return [customer.display_label, customer.primary_identifier, customer.external_customer_id || "", customer.normalized_phone || ""].some(value => value.toLowerCase().includes(searchQuery)) || Boolean(normalizedPhoneSearch && customer.normalized_phone === normalizedPhoneSearch);
  }).map(customer => customer.id));
  const filteredIssues = issuesList.filter((iss) => {
    if (filters.repeatCountMin && iss.total_calls < filters.repeatCountMin) return false;
    if (filters.unresolvedOnly && (iss.status === "resolved" || iss.status === "closed")) return false;
    if (filters.category && (filters.category === "unclassified" ? Boolean(iss.catalogue_issue_category_id) : iss.catalogue_issue_category_id !== filters.category)) return false;
    if(filters.product && iss.product_id!==filters.product && !iss.catalogue_products?.some(p=>p.id===filters.product))return false;
    if(filters.service && iss.service_id!==filters.service && !iss.catalogue_services?.some(s=>s.id===filters.service))return false;
    if(filters.serviceArea && iss.service_area_id!==filters.serviceArea && !iss.catalogue_areas?.some(a=>a.id===filters.serviceArea))return false;
    if(filters.department){
      const areaIds=[iss.service_area_id,...(iss.catalogue_areas||[]).map(a=>a.id)].filter(Boolean);
      const belongs=areaIds.some(areaId=>{let current=areaId;const seen=new Set<string>();while(current&&!seen.has(current)){if(current===filters.department)return true;seen.add(current);current=catalogue.serviceAreas.find(a=>a.id===current)?.parentId;}return false;});
      if(!belongs)return false;
    }
    if (filters.status && iss.status !== filters.status) return false;
    if (filters.rootCause && iss.primary_root_cause !== filters.rootCause) return false;
    if (filters.serviceProvider && iss.service_provider !== filters.serviceProvider)
      return false;
    if (filters.location && iss.location !== filters.location) return false;
    if (filters.needsReviewOnly && !iss.needs_review) return false;
    if (filters.dateFrom) {
      if (new Date(iss.latest_reported_at) < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(iss.latest_reported_at) > end) return false;
    }
    if (filters.agent) {
      const hasAgentCall = timelineCallsList.some(
        (c) => c.issue_id === iss.id && c.agent_name === filters.agent,
      );
      if (!hasAgentCall) return false;
    }
    if (searchQuery) {
      const matchesText =
        searchCustomerIds.has(iss.customer_id) ||
        [iss.category, iss.product_service, iss.location, iss.service_provider, iss.responsible_team].some(value => value?.toLowerCase().includes(searchQuery)) ||
        iss.title.toLowerCase().includes(searchQuery) ||
        iss.issue_code.toLowerCase().includes(searchQuery) ||
        iss.customer_label.toLowerCase().includes(searchQuery) ||
        (iss.customer_phone && iss.customer_phone.toLowerCase().includes(searchQuery)) ||
        (normalizedPhoneSearch && iss.customer_phone === normalizedPhoneSearch) ||
        iss.summary.toLowerCase().includes(searchQuery);
      if (!matchesText) return false;
    }
    return true;
  });

  const filteredCustomerIds = new Set(filteredIssues.map((i) => i.customer_id));

  const filteredCustomers = customersList.filter((cust) => {
    if (filters.riskLevel && cust.risk_level !== filters.riskLevel) return false;
    if (
      filters.product || filters.service || filters.serviceArea || filters.department ||
      filters.category ||
      filters.status ||
      filters.rootCause ||
      filters.serviceProvider ||
      filters.location ||
      filters.agent ||
      filters.dateFrom ||
      filters.dateTo
      || filters.unresolvedOnly || filters.repeatCountMin
    ) {
      if (!filteredCustomerIds.has(cust.id)) return false;
    }
    if (filters.needsReviewOnly && !cust.needs_identity_review) {
      if (!filteredCustomerIds.has(cust.id)) return false;
    }
    if (searchQuery) {
      const matchesCust =
        cust.display_label.toLowerCase().includes(searchQuery) ||
        cust.primary_identifier.toLowerCase().includes(searchQuery) ||
        (cust.normalized_phone && cust.normalized_phone.includes(searchQuery)) ||
        (normalizedPhoneSearch && cust.normalized_phone === normalizedPhoneSearch) ||
        (cust.external_customer_id &&
          cust.external_customer_id.toLowerCase().includes(searchQuery)) ||
        filteredCustomerIds.has(cust.id);
      if (!matchesCust) return false;
    }
    return true;
  });

  const filteredIssueIds = new Set(filteredIssues.map((i) => i.id));
  const filteredTimelineCalls = timelineCallsList.filter((tc) =>
    filteredIssueIds.has(tc.issue_id),
  );
  // One physical recording may be uploaded and audited several times. Keep the
  // earliest contact as the real call and retain later rows only as audit metadata.
  // Customer ID is part of the fallback key so similarly named files belonging to
  // different customers can never be merged.
  const uniqueRecordingMap = new Map<string, TimelineCallEntry>();
  for (const call of filteredTimelineCalls
    .slice()
    .sort((a, b) => new Date(a.call_date).getTime() - new Date(b.call_date).getTime())) {
    const key = `${call.customer_id || "unknown"}|${call.recording_key || `call:${call.call_id}`}`;
    const canonical = uniqueRecordingMap.get(key);
    if (!canonical) {
      uniqueRecordingMap.set(key, call);
      continue;
    }
    canonical.audit_count = (canonical.audit_count || 1) + 1;
    canonical.duplicate_call_ids = [...(canonical.duplicate_call_ids || []), call.call_id];
    canonical.audit_dates = [...(canonical.audit_dates || [canonical.call_date]), call.call_date];
  }
  const uniqueTimelineCalls = Array.from(uniqueRecordingMap.values());

  // Compute Executive KPIs
  const totalCustomers = filteredCustomers.length;
  const repeatCustomersCount = filteredCustomers.filter((c) => c.total_calls > 1).length;
  const repeatCustomerRatePct = totalCustomers
    ? Math.round((repeatCustomersCount / totalCustomers) * 100)
    : 0;

  const totalIssues = filteredIssues.length;
  const recurringIssuesCount = filteredIssues.filter((i) => i.total_calls > 1).length;
  const repeatIssueRatePct = totalIssues
    ? Math.round((recurringIssuesCount / totalIssues) * 100)
    : 0;

  const totalAnalyzedCalls = uniqueTimelineCalls.length;
  const repeatCallsCount = uniqueTimelineCalls.filter((c) => c.is_repeat_issue).length;
  const repeatCallRatePct = totalAnalyzedCalls
    ? Math.round((repeatCallsCount / totalAnalyzedCalls) * 100)
    : 0;

  const resolvedIssues = filteredIssues.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  );
  const unresolvedIssues = filteredIssues.filter(
    (i) => i.status !== "resolved" && i.status !== "closed",
  );
  const confirmedResolvedCount = resolvedIssues.filter(
    (i) =>
      i.resolution_confirmation === "customer_confirmed" ||
      i.resolution_confirmation === "operationally_verified",
  ).length;
  const unconfirmedResolvedCount = Math.max(
    0,
    resolvedIssues.length - confirmedResolvedCount,
  );
  const reopenedIssuesCount = filteredIssues.filter(
    (i) => i.status === "reopened" || i.reopened_count > 0,
  ).length;
  const needsReviewCount =
    filteredIssues.filter((i) => i.needs_review).length +
    filteredCustomers.filter((c) => c.needs_identity_review).length;

  const avgCallsPerUnresolvedIssue = unresolvedIssues.length
    ? Number(
      (
        unresolvedIssues.reduce((acc, i) => acc + i.total_calls, 0) /
        unresolvedIssues.length
      ).toFixed(1),
    )
    : 0;

  const resolutionHoursList = resolvedIssues
    .map((i) => {
      if (!i.resolved_at || !i.first_reported_at) return null;
      const diff =
        (new Date(i.resolved_at).getTime() - new Date(i.first_reported_at).getTime()) /
        (1000 * 3600);
      return diff >= 0 ? diff : null;
    })
    .filter((v): v is number => v !== null);

  const avgResolutionHours = resolutionHoursList.length
    ? Number(
      (
        resolutionHoursList.reduce((a, b) => a + b, 0) / resolutionHoursList.length
      ).toFixed(1),
    )
    : null;

  // Breakdowns: 1. By Category
  const catMap = new Map<
    string,
    { totalIssues: number; recurringIssues: number; repeatCalls: number; unresolvedCount: number }
  >();
  for (const iss of filteredIssues) {
    const entry = catMap.get(companyCategory(iss).id) || {
      totalIssues: 0,
      recurringIssues: 0,
      repeatCalls: 0,
      unresolvedCount: 0,
    };
    entry.totalIssues += 1;
    if (iss.total_calls > 1) entry.recurringIssues += 1;
    entry.repeatCalls += Math.max(0, iss.total_calls - 1);
    if (iss.status !== "resolved" && iss.status !== "closed") {
      entry.unresolvedCount += 1;
    }
    catMap.set(companyCategory(iss).id, entry);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, stats]) => ({
      category,
      label: companyCategory(filteredIssues.find(issue => companyCategory(issue).id === category) || {}).label,
      ...stats,
    }))
    .sort((a, b) => b.repeatCalls - a.repeatCalls || b.totalIssues - a.totalIssues);

  // Breakdowns: 1b. By Service Area
  const activeAreas = catalogue.serviceAreas.filter((sa) => sa.isActive);
  const byServiceArea: ServiceAreaBreakdownItem[] = activeAreas.map((sa) => {
    const areaIssues = filteredIssues.filter(
      (i) =>
        i.service_area_id === sa.id || i.catalogue_areas?.some(a=>a.id===sa.id) ||
        (i.service_area_name && i.service_area_name.toLowerCase() === sa.name.toLowerCase()),
    );
    const totalIssues = areaIssues.length;
    const recurringIssues = areaIssues.filter((i) => i.total_calls > 1).length;
    const unresolvedIssues = areaIssues.filter(
      (i) => i.status !== "resolved" && i.status !== "closed",
    ).length;
    const repeatContactRate =
      totalIssues > 0 ? Math.round((recurringIssues / totalIssues) * 100) : 0;
    const resolutionRate =
      totalIssues > 0
        ? Math.round(((totalIssues - unresolvedIssues) / totalIssues) * 100)
        : 0;

    return {
      serviceAreaId: sa.id,
      name: sa.name,
      categoryType: sa.categoryType,
      totalIssues,
      recurringIssues,
      unresolvedIssues,
      repeatContactRate,
      resolutionRate,
    };
  });

  const unassignedAreaIssues = filteredIssues.filter(
    (i) =>
      !i.catalogue_areas?.length && !i.service_area_id &&
      (!i.service_area_name ||
        !activeAreas.some(
          (sa) => sa.name.toLowerCase() === i.service_area_name?.toLowerCase(),
        )),
  );
  if (unassignedAreaIssues.length > 0 && activeAreas.length > 0) {
    const totalIssues = unassignedAreaIssues.length;
    const recurringIssues = unassignedAreaIssues.filter((i) => i.total_calls > 1).length;
    const unresolvedIssues = unassignedAreaIssues.filter(
      (i) => i.status !== "resolved" && i.status !== "closed",
    ).length;
    byServiceArea.push({
      serviceAreaId: "unassigned",
      name: "General / Unassigned",
      categoryType: "general",
      totalIssues,
      recurringIssues,
      unresolvedIssues,
      repeatContactRate:
        totalIssues > 0 ? Math.round((recurringIssues / totalIssues) * 100) : 0,
      resolutionRate:
        totalIssues > 0
          ? Math.round(((totalIssues - unresolvedIssues) / totalIssues) * 100)
          : 0,
    });
  }

  byServiceArea.sort(
    (a, b) => b.recurringIssues - a.recurringIssues || b.totalIssues - a.totalIssues,
  );

  // Breakdowns: 2. By Root Cause
  const rcMap = new Map<
    RootCauseCategory,
    { count: number; confirmedCount: number; inferredCount: number }
  >();
  for (const iss of filteredIssues) {
    const rc = iss.primary_root_cause || "unknown_insufficient_evidence";
    const entry = rcMap.get(rc) || { count: 0, confirmedCount: 0, inferredCount: 0 };
    entry.count += 1;
    if (iss.root_cause_evidence_type === "confirmed_evidence") {
      entry.confirmedCount += 1;
    } else if (
      iss.root_cause_evidence_type === "ai_inference" ||
      iss.root_cause_evidence_type === "possible_contributing_factor"
    ) {
      entry.inferredCount += 1;
    }
    rcMap.set(rc, entry);
  }
  const byRootCause = Array.from(rcMap.entries())
    .map(([category, stats]) => ({
      category,
      label: ROOT_CAUSE_LABELS[category] || category,
      count: stats.count,
      pct: totalIssues ? Math.round((stats.count / totalIssues) * 100) : 0,
      confirmedCount: stats.confirmedCount,
      inferredCount: stats.inferredCount,
    }))
    .sort((a, b) => b.count - a.count);

  // Breakdowns: 3. By Status
  const statusMap = new Map<IssueLifecycleStatus, number>();
  for (const iss of filteredIssues) {
    statusMap.set(iss.status, (statusMap.get(iss.status) || 0) + 1);
  }
  const byStatus = ISSUE_STATUSES.map((status) => ({
    status,
    label: ISSUE_STATUS_LABELS[status],
    count: statusMap.get(status) || 0,
  })).filter((s) => s.count > 0);

  // Breakdowns: 4. By Service Provider / Field Team
  const spMap = new Map<
    string,
    { issueCount: number; repeatCallCount: number; unresolvedCount: number }
  >();
  for (const iss of filteredIssues) {
    const provider =
      iss.service_provider ||
      (iss.primary_root_cause === "service_provider_technician"
        ? "Field Technician Dispatch"
        : null);
    if (!provider) continue;
    const entry = spMap.get(provider) || {
      issueCount: 0,
      repeatCallCount: 0,
      unresolvedCount: 0,
    };
    entry.issueCount += 1;
    entry.repeatCallCount += Math.max(0, iss.total_calls - 1);
    if (iss.status !== "resolved" && iss.status !== "closed") {
      entry.unresolvedCount += 1;
    }
    spMap.set(provider, entry);
  }
  const byServiceProvider = Array.from(spMap.entries())
    .map(([provider, stats]) => ({ provider, ...stats }))
    .sort((a, b) => b.repeatCallCount - a.repeatCallCount);

  // Breakdowns: 5. Agent Accountability (with fair denominators and sample size thresholds!)
  const agentStatsMap = new Map<
    string,
    {
      totalCalls: number;
      repeatIssueCalls: number;
      agentRootCauses: number;
      externalRootCauses: number;
      scores: number[];
    }
  >();
  for (const tc of uniqueTimelineCalls) {
    const name = tc.agent_name || "Unassigned";
    const entry = agentStatsMap.get(name) || {
      totalCalls: 0,
      repeatIssueCalls: 0,
      agentRootCauses: 0,
      externalRootCauses: 0,
      scores: [],
    };
    entry.totalCalls += 1;
    if (tc.is_repeat_issue) entry.repeatIssueCalls += 1;
    if (tc.is_repeat_issue && tc.primary_root_cause === "agent_related") {
      entry.agentRootCauses += 1;
    } else if (
      tc.primary_root_cause !== "unknown_insufficient_evidence" &&
      tc.is_repeat_issue
    ) {
      entry.externalRootCauses += 1;
    }
    if (tc.qa_score != null) entry.scores.push(tc.qa_score);
    agentStatsMap.set(name, entry);
  }

  const agentAccountability: AgentAccountabilityRow[] = Array.from(
    agentStatsMap.entries(),
  )
    .map(([agent_name, st]) => {
      const sampleAdequate = st.totalCalls >= 3;
      const repeatRate = st.totalCalls
        ? Math.round((st.repeatIssueCalls / st.totalCalls) * 100)
        : null;
      const avgQa = st.scores.length
        ? Math.round(st.scores.reduce((a, b) => a + b, 0) / st.scores.length)
        : null;

      let fairnessNote = "Balanced call distribution";
      if (!sampleAdequate) {
        fairnessNote = `Low sample size (${st.totalCalls} call${st.totalCalls === 1 ? "" : "s"}) — rate is informational only`;
      } else if (st.repeatIssueCalls > 0 && st.agentRootCauses === 0) {
        fairnessNote =
          "Handled repeat calls caused by external technician/network delays (not agent error)";
      } else if (st.agentRootCauses > 0) {
        fairnessNote = `${st.agentRootCauses} interaction(s) flagged for agent escalation/procedure review`;
      }

      return {
        agent_name,
        total_calls_handled: st.totalCalls,
        repeat_issue_calls_handled: st.repeatIssueCalls,
        repeat_rate_pct: repeatRate,
        agent_related_root_cause_count: st.agentRootCauses,
        external_or_technical_root_cause_count: st.externalRootCauses,
        avg_qa_score: avgQa,
        sample_size_adequate: sampleAdequate,
        fairness_note: fairnessNote,
      };
    })
    .sort((a, b) => b.total_calls_handled - a.total_calls_handled);

  // Breakdowns: 6. Evidence-Based Operational Recommendations
  const recommendations: OperationalRecommendation[] = [];

  const techIssues = filteredIssues.filter(
    (i) => i.primary_root_cause === "service_provider_technician",
  );
  if (techIssues.length > 0) {
    const callSum = techIssues.reduce((acc, i) => acc + i.total_calls, 0);
    recommendations.push({
      id: "rec-tech-sla",
      priority: "critical",
      title: "Enforce Field Technician Visit SLA & Dispatch Confirmation",
      category: "Service Provider / Technician",
      responsible_team: "Field Technician Dispatch & Partner Ops",
      affected_issues_count: techIssues.length,
      affected_calls_count: callSum,
      evidence_type: "confirmed_evidence",
      explanation: `${techIssues.length} issue(s) (${callSum} calls) show customers calling back because promised technician visits were delayed or incomplete.`,
      recommended_action:
        "Require automated SMS/dispatch ticket confirmation within 4 hours of escalation and prevent ticket closure without customer restoration confirmation.",
    });
  }

  const networkIssues = filteredIssues.filter(
    (i) => i.primary_root_cause === "network_technical",
  );
  if (networkIssues.length > 0) {
    const callSum = networkIssues.reduce((acc, i) => acc + i.total_calls, 0);
    recommendations.push({
      id: "rec-noc-proactive",
      priority: "high",
      title: "Proactive Outage Notification & Line Stability Diagnostics",
      category: "Network / Technical",
      responsible_team: "Network Operations Center (NOC)",
      affected_issues_count: networkIssues.length,
      affected_calls_count: callSum,
      evidence_type: "ai_inference",
      explanation: `${networkIssues.length} connectivity/network issue(s) generated ${callSum} total contacts.`,
      recommended_action:
        "Push proactive IVR/SMS outage updates to affected MSISDNs so customers do not need to call repeatedly for restoration status.",
    });
  }

  const agentIssues = filteredIssues.filter(
    (i) => i.primary_root_cause === "agent_related",
  );
  if (agentIssues.length > 0) {
    const callSum = agentIssues.reduce((acc, i) => acc + i.total_calls, 0);
    recommendations.push({
      id: "rec-agent-sop",
      priority: "high",
      title: "First-Contact Ticket Logging & Escalation SOP Coaching",
      category: "Agent-Related",
      responsible_team: "Contact Center QA & Team Leads",
      affected_issues_count: agentIssues.length,
      affected_calls_count: callSum,
      evidence_type: "confirmed_evidence",
      explanation: `${agentIssues.length} issue(s) indicate missing ticket escalation, incomplete troubleshooting, or inaccurate resolution promises on prior calls.`,
      recommended_action:
        "Assign targeted QA coaching on escalation verification and mandatory reference ticket readout before ending technical support calls.",
    });
  }

  if (unconfirmedResolvedCount > 0 || reopenedIssuesCount > 0) {
    recommendations.push({
      id: "rec-resolution-gate",
      priority: "medium",
      title: "Strengthen Post-Call Resolution Verification Gate",
      category: "Operational / Process",
      responsible_team: "Customer Experience & Back-Office QA",
      affected_issues_count: unconfirmedResolvedCount + reopenedIssuesCount,
      affected_calls_count: unconfirmedResolvedCount + reopenedIssuesCount * 2,
      evidence_type: "confirmed_evidence",
      explanation: `${unconfirmedResolvedCount} resolved issue(s) lack customer confirmation and ${reopenedIssuesCount} issue(s) reopened after being marked resolved.`,
      recommended_action:
        "Separate 'Call Completed' from 'Issue Resolved' in CRM workflows and send an automated 24-hour SMS resolution check ('Reply 1 if fixed, 2 if still broken').",
    });
  }

  const connectionSummary = await getCompanyDataConnectionStats(
    userId,
    teamScope,
    membership?.workspaceId ?? null,
  );

  // Pagination
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize || 25));
  const custStart = (page - 1) * pageSize;
  const issStart = (page - 1) * pageSize;

  return {
    migrationRequired,
    isCatalogueConfigured: catalogue.isConfigured,
    connectionSummary,
    unanalyzedCallsCount: Math.max(
      0,
      (totalWorkspaceCallsCount ?? 0) - new Set(timelineCallsList.map(call => call.call_id)).size,
    ),
    totalAnalyzedCalls,
    interactions: uniqueTimelineCalls,
    kpis: {
      totalCustomers,
      repeatCustomersCount,
      repeatCustomerRatePct,
      totalIssues,
      recurringIssuesCount,
      repeatIssueRatePct,
      repeatCallsCount,
      repeatCallRatePct,
      unresolvedIssuesCount: unresolvedIssues.length,
      firstContactResolvedCount: firstContactResolvedCount(filteredIssues),
      resolvedIssuesCount: resolvedIssues.length,
      confirmedResolvedCount,
      unconfirmedResolvedCount,
      reopenedIssuesCount,
      needsReviewCount,
      avgCallsPerUnresolvedIssue,
      avgCallsPerIssue: totalIssues ? filteredIssues.reduce((sum, issue) => sum + issue.total_calls, 0) / totalIssues : 0,
      avgResolutionHours,
    },
    breakdowns: {
      byCategory,
      byServiceArea,
      byRootCause,
      byStatus,
      byServiceProvider,
      agentAccountability,
      recommendations,
    },
    customers: {
      items: filteredCustomers.slice(custStart, custStart + pageSize),
      total: filteredCustomers.length,
      page,
      pageSize,
    },
    issues: {
      items: filteredIssues.slice(issStart, issStart + pageSize),
      total: filteredIssues.length,
      page,
      pageSize,
    },
    filterOptions: {
      categories: [{value:"unclassified",label:"Unclassified"},...catalogue.issueCategories.map(category=>({value:category.id,label:category.name+(category.isActive?"":" (inactive)")}))],
      products: catalogue.products.map(item=>({value:item.id,label:item.name+(item.isActive?"":" (inactive)")})),
      services: catalogue.services.map(item=>({value:item.id,label:item.name+(item.isActive?"":" (inactive)")})),
      serviceAreas: catalogue.serviceAreas.map(item=>({value:item.id,label:item.name+(item.isActive?"":" (inactive)")})),
      departments: catalogue.serviceAreas.filter(item=>item.categoryType==="department").map(item=>({value:item.id,label:item.name})),
      statuses: ISSUE_STATUSES.map((s) => ({
        value: s,
        label: ISSUE_STATUS_LABELS[s],
      })),
      rootCauses: ROOT_CAUSE_CATEGORIES.map((r) => ({
        value: r,
        label: ROOT_CAUSE_LABELS[r],
      })),
      agents: allAgents,
      serviceProviders: allProviders,
      locations: allLocations,
    },
  };
}

/**
 * Loads the complete Customer Profile / Journey Detail (`/customers/[id]`)
 */
export async function getCustomerJourneyDetail(
  userId: string,
  customerId: string,
): Promise<{
  customer: CustomerDirectoryItem | null;
  identifiers: Array<{
    id: string;
    id_type: string;
    raw_value: string;
    normalized_value: string;
    source: string;
    confidence: number;
    verified_by_human: boolean;
  }>;
  issues: IssueSummaryItem[];
  timeline: TimelineCallEntry[];
  reviews: Array<{
    id: string;
    review_type: string;
    reviewer_name: string | null;
    notes: string;
    responsible_team: string | null;
    previous_value: Record<string, unknown>;
    new_value: Record<string, unknown>;
    created_at: string;
  }>;
  migrationRequired: boolean;
}> {
  const admin = createAdminClient();
  const [teamScope, membership] = await Promise.all([
    getTeamScope(userId),
    getMembership(userId).catch(() => null),
  ]);
  const defaultCountry = resolveCountryIso(membership?.country);
  const { data: customerRow, error: custErr } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .in("user_id", teamScope)
    .maybeSingle();

  if (custErr && isMissingTableError(custErr)) {
    if (process.env.ZETRO_ENABLE_LEGACY_PREVIEW !== "true") return { customer: null, identifiers: [], issues: [], timeline: [], reviews: [], migrationRequired: true };
    const store = getInMemoryStore();
    const projected = await buildInMemoryProjection(teamScope, defaultCountry);
    const cust = projected.customers.find((c) => c.id === customerId) || null;
    const custReviews = store.reviewsByCustomer.get(customerId) || [];
    return {
      customer: cust,
      identifiers: cust
        ? [
          {
            id: `id-${cust.id}`,
            id_type: cust.normalized_phone ? "msisdn" : "customer_id",
            raw_value: cust.normalized_phone || cust.primary_identifier,
            normalized_value: cust.normalized_phone || cust.primary_identifier,
            source: cust.needs_identity_review ? "metadata" : "verified",
            confidence: cust.needs_identity_review ? 0.92 : 1.0,
            verified_by_human: !cust.needs_identity_review,
          },
        ]
        : [],
      issues: projected.issues.filter((i) => i.customer_id === customerId),
      timeline: projected.timelineCalls
        .filter((t) =>
          projected.issues.some(
            (i) => i.customer_id === customerId && i.id === t.issue_id,
          ),
        )
        .sort(
          (a, b) =>
            new Date(a.call_date).getTime() - new Date(b.call_date).getTime(),
        ),
      reviews: custReviews,
      migrationRequired: true,
    };
  }

  if (!customerRow) {
    return {
      customer: null,
      identifiers: [],
      issues: [],
      timeline: [],
      reviews: [],
      migrationRequired: false,
    };
  }

  const [
    { data: idRows },
    { data: issueRows },
    { data: callLinkRows },
    { data: reviewRows },
  ] = await Promise.all([
    admin
      .from("customer_identifiers")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false }).throwOnError(),
    admin
      .from("customer_issues")
      .select("*")
      .eq("customer_id", customerId)
      .order("first_reported_at", { ascending: false }).throwOnError(),
    admin
      .from("issue_calls")
      .select(
        "*, customer_issues!issue_calls_issue_id_fkey(issue_code, title, status, resolution_confirmation, primary_root_cause, root_cause_evidence_type), calls(id, title, file_name, created_at, status, duration_seconds, agent_id, agents(name), call_scores(overall_score, verdict, customer_sentiment, summary))",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }).throwOnError(),
    admin
      .from("issue_reviews")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }).throwOnError(),
  ]);

  const customer: CustomerDirectoryItem = {
    id: customerRow.id,
    primary_identifier: customerRow.primary_identifier,
    display_label: customerRow.display_label,
    normalized_phone: customerRow.normalized_phone,
    external_customer_id: customerRow.external_customer_id,
    country_code: customerRow.country_code,
    total_calls: customerRow.total_calls || 0,
    repeat_call_count: customerRow.repeat_call_count || 0,
    recurring_issue_count: customerRow.recurring_issue_count || 0,
    new_issue_count: customerRow.new_issue_count || 0,
    unresolved_issue_count: customerRow.unresolved_issue_count || 0,
    resolved_issue_count: customerRow.resolved_issue_count || 0,
    reopened_issue_count: customerRow.reopened_issue_count || 0,
    avg_hours_between_calls:
      customerRow.avg_hours_between_calls == null
        ? null
        : Number(customerRow.avg_hours_between_calls),
    top_issue_categories: customerRow.top_issue_categories || [],
    risk_level: (customerRow.risk_level || "low") as CustomerDirectoryItem["risk_level"],
    needs_identity_review: Boolean(customerRow.needs_identity_review),
    first_interaction_at: customerRow.first_interaction_at,
    last_interaction_at: customerRow.last_interaction_at,
  };

  const issues: IssueSummaryItem[] = (issueRows || []).map((iss) => ({
    id: iss.id,
    issue_code: iss.issue_code,
    customer_id: iss.customer_id,
    customer_label: customer.display_label,
    customer_phone: customer.normalized_phone,
    title: iss.title,
    category: iss.category,
    catalogue_issue_category_id: iss.catalogue_issue_category_id || null,
    catalogue_issue_category_name: iss.catalogue_issue_category_name || null,
    service_id:iss.service_id,service_name:iss.service_name,product_id:iss.product_id,product_name:iss.product_name,service_area_id:iss.service_area_id,service_area_name:iss.service_area_name,
    subcategory: iss.subcategory,
    product_service: iss.product_service,
    symptoms: iss.symptoms || [],
    location: iss.location,
    service_provider: iss.service_provider,
    status: iss.status as IssueLifecycleStatus,
    resolution_confirmation: iss.resolution_confirmation as ResolutionConfirmation,
    first_reported_at: iss.first_reported_at,
    latest_reported_at: iss.latest_reported_at,
    resolved_at: iss.resolved_at,
    reopened_count: iss.reopened_count || 0,
    repeat_interaction_count: iss.repeat_interaction_count || 0,
    total_calls: iss.total_calls || 1,
    primary_root_cause: iss.primary_root_cause as RootCauseCategory,
    primary_root_cause_detail: iss.primary_root_cause_detail,
    secondary_root_cause: (iss.secondary_root_cause || null) as RootCauseCategory | null,
    secondary_root_cause_detail: iss.secondary_root_cause_detail || null,
    root_cause_evidence_type: iss.root_cause_evidence_type as RootCauseEvidenceType,
    root_cause_confidence: Number(iss.root_cause_confidence ?? 0.5),
    root_cause_explanation: iss.root_cause_explanation,
    responsible_team: iss.responsible_team,
    recommended_action: iss.recommended_action,
    summary: iss.summary || "",
    needs_review: Boolean(iss.needs_review),
    human_verified: Boolean(iss.human_verified),
  }));

  const historicalLinks=await getHistoricalCatalogueLinks(userId,membership?.workspaceId||null,issues.map(issue=>issue.id));
  for(const issue of issues){const links=historicalLinks.filter(link=>link.issueId===issue.id);issue.catalogue_products=links.flatMap(link=>link.product?[{id:link.product.id,name:link.product.name}]:[]);issue.catalogue_services=links.flatMap(link=>link.service?[{id:link.service.id,name:link.service.name}]:[]);}
  customer.top_issue_categories=Array.from(new Set(issues.map(issue=>issue.catalogue_issue_category_name||"Unclassified"))).slice(0,3);
  const timeline: TimelineCallEntry[] = (callLinkRows || [])
    .map((ic) => {
      const issObj = Array.isArray(ic.customer_issues)
        ? ic.customer_issues[0]
        : ic.customer_issues;
      const callObj = Array.isArray(ic.calls) ? ic.calls[0] : ic.calls;
      const agentObj =
        callObj && "agents" in callObj
          ? Array.isArray(callObj.agents)
            ? callObj.agents[0]
            : callObj.agents
          : null;
      const scoreObj =
        callObj && "call_scores" in callObj
          ? Array.isArray(callObj.call_scores)
            ? callObj.call_scores[0]
            : callObj.call_scores
          : null;

      return {
        id: ic.id,
        call_id: ic.call_id,
        issue_id: ic.issue_id,
        issue_code: (issObj as { issue_code?: string } | null)?.issue_code || "ISS",
        issue_title: (issObj as { title?: string } | null)?.title || "Issue",
        issue_status: ((issObj as { status?: string } | null)?.status ||
          "open") as IssueLifecycleStatus,
        resolution_confirmation: ((issObj as { resolution_confirmation?: string } | null)
          ?.resolution_confirmation || "unconfirmed") as ResolutionConfirmation,
        interaction_number: ic.interaction_number || 1,
        customer_contact_sequence: ic.customer_contact_sequence || 1,
        is_repeat_customer: Boolean(ic.is_repeat_customer),
        is_repeat_issue: Boolean(ic.is_repeat_issue),
        match_classification: ic.match_classification as MatchClassification,
        match_confidence: Number(ic.match_confidence ?? 1),
        match_reason: ic.match_reason || "",
        call_resolution_state: ic.call_resolution_state || "unconfirmed",
        extracted_category: ic.extracted_category,
        extracted_product_service: ic.extracted_product_service,
        extracted_symptoms: ic.extracted_symptoms || [],
        extracted_issue_summary: ic.extracted_issue_summary || "",
        transcript_evidence: Array.isArray(ic.transcript_evidence)
          ? (ic.transcript_evidence as TranscriptEvidenceExcerpt[])
          : [],
        human_review_status: ic.human_review_status || null,
        call_title:
          (callObj as { title?: string; file_name?: string } | null)?.title ||
          (callObj as { file_name?: string } | null)?.file_name ||
          "Call",
        call_date:
          (callObj as { created_at?: string } | null)?.created_at || ic.created_at,
        call_status: (callObj as { status?: string } | null)?.status || "completed",
        duration_seconds:
          (callObj as { duration_seconds?: number | null } | null)?.duration_seconds ??
          null,
        agent_id: (callObj as { agent_id?: string | null } | null)?.agent_id ?? null,
        agent_name: (agentObj as { name?: string } | null)?.name || "Unassigned",
        qa_score:
          (scoreObj as { overall_score?: number | null } | null)?.overall_score ?? null,
        qa_verdict: (scoreObj as { verdict?: string | null } | null)?.verdict ?? null,
        qa_sentiment:
          (scoreObj as { customer_sentiment?: string | null } | null)
            ?.customer_sentiment ?? null,
        qa_summary: (scoreObj as { summary?: string | null } | null)?.summary ?? null,
        primary_root_cause: ((issObj as { primary_root_cause?: string } | null)
          ?.primary_root_cause || "unknown_insufficient_evidence") as RootCauseCategory,
        root_cause_evidence_type: ((
          issObj as { root_cause_evidence_type?: string } | null
        )?.root_cause_evidence_type || "insufficient_evidence") as RootCauseEvidenceType,
      };
    })
    .sort(
      (a, b) => new Date(a.call_date).getTime() - new Date(b.call_date).getTime(),
    );

  return {
    customer,
    identifiers: (idRows || []).map((r) => ({
      id: r.id,
      id_type: r.id_type,
      raw_value: r.raw_value,
      normalized_value: r.normalized_value,
      source: r.source,
      confidence: Number(r.confidence ?? 1),
      verified_by_human: Boolean(r.verified_by_human),
    })),
    issues,
    timeline,
    reviews: (reviewRows || []).map((r) => ({
      id: r.id,
      review_type: r.review_type,
      reviewer_name: r.reviewer_name,
      notes: r.notes || "",
      responsible_team: r.responsible_team,
      previous_value: (r.previous_value as Record<string, unknown>) || {},
      new_value: (r.new_value as Record<string, unknown>) || {},
      created_at: r.created_at,
    })),
    migrationRequired: false,
  };
}

/**
 * Loads the complete Issue Investigation Detail (`/customers/issues/[issueId]`)
 */
export async function getIssueInvestigationDetail(
  userId: string,
  issueId: string,
): Promise<{
  issue: IssueSummaryItem | null;
  customer: CustomerDirectoryItem | null;
  calls: TimelineCallEntry[];
  rootCauses: Array<{
    id: string;
    category: RootCauseCategory;
    subcategory: string;
    secondary_category: string | null;
    evidence_type: RootCauseEvidenceType;
    confidence: number;
    explanation: string;
    recommended_action: string;
    responsible_category: string;
    transcript_excerpts: TranscriptEvidenceExcerpt[];
    is_current: boolean;
    human_status: string | null;
    created_at: string;
  }>;
  statusHistory: Array<{
    id: string;
    previous_status: string | null;
    new_status: string;
    resolution_confirmation: string;
    changed_by_type: string;
    reason: string;
    created_at: string;
  }>;
  reviews: Array<{
    id: string;
    review_type: string;
    reviewer_name: string | null;
    notes: string;
    responsible_team: string | null;
    previous_value: Record<string, unknown>;
    new_value: Record<string, unknown>;
    created_at: string;
  }>;
  migrationRequired: boolean;
}> {
  const admin = createAdminClient();
  const [teamScope, membership] = await Promise.all([
    getTeamScope(userId),
    getMembership(userId).catch(() => null),
  ]);
  const defaultCountry = resolveCountryIso(membership?.country);
  const { data: issRow, error: issErr } = await admin
    .from("customer_issues")
    .select("*")
    .eq("id", issueId)
    .in("user_id", teamScope)
    .maybeSingle();

  if (issErr && isMissingTableError(issErr)) {
    if (process.env.ZETRO_ENABLE_LEGACY_PREVIEW !== "true") return { issue: null, customer: null, calls: [], rootCauses: [], statusHistory: [], reviews: [], migrationRequired: true };
    const store = getInMemoryStore();
    const projected = await buildInMemoryProjection(teamScope, defaultCountry);
    const iss = projected.issues.find((i) => i.id === issueId) || null;
    const cust = iss
      ? projected.customers.find((c) => c.id === iss.customer_id) || null
      : null;
    const calls = projected.timelineCalls.filter((t) => t.issue_id === issueId);
    const storedHistory = store.statusHistoryByIssue.get(issueId) || [];
    const storedReviews = store.reviewsByIssue.get(issueId) || [];
    return {
      issue: iss,
      customer: cust,
      calls,
      rootCauses: iss
        ? [
          {
            id: `rc-${iss.id}`,
            category: iss.primary_root_cause,
            subcategory: iss.primary_root_cause_detail || "general",
            secondary_category: iss.secondary_root_cause,
            evidence_type: iss.root_cause_evidence_type,
            confidence: iss.root_cause_confidence,
            explanation: iss.root_cause_explanation || "",
            recommended_action: iss.recommended_action || "",
            responsible_category: iss.responsible_team || "Operations",
            transcript_excerpts: calls.flatMap((c) => c.transcript_evidence),
            is_current: true,
            human_status: iss.human_verified ? "confirmed" : null,
            created_at: iss.latest_reported_at,
          },
        ]
        : [],
      statusHistory: iss
        ? [
          {
            id: `sh-init-${iss.id}`,
            previous_status: null,
            new_status: "open",
            resolution_confirmation: "unconfirmed",
            changed_by_type: "ai",
            reason: "Initial issue lifecycle created from call interaction timeline",
            created_at: iss.first_reported_at,
          },
          ...storedHistory,
        ]
        : [],
      reviews: storedReviews,
      migrationRequired: true,
    };
  }

  if (!issRow) {
    return {
      issue: null,
      customer: null,
      calls: [],
      rootCauses: [],
      statusHistory: [],
      reviews: [],
      migrationRequired: false,
    };
  }

  const [
    { data: custRow },
    { data: callLinkRows },
    { data: rcRows },
    { data: shRows },
    { data: revRows },
  ] = await Promise.all([
    admin
      .from("customers")
      .select("*")
      .eq("id", issRow.customer_id)
      .maybeSingle().throwOnError(),
    admin
      .from("issue_calls")
      .select(
        "*, calls(id, title, file_name, created_at, status, duration_seconds, agent_id, agents(name), call_scores(overall_score, verdict, customer_sentiment, summary))",
      )
      .eq("issue_id", issueId)
      .order("interaction_number", { ascending: true }).throwOnError(),
    admin
      .from("issue_root_causes")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false }).throwOnError(),
    admin
      .from("issue_status_history")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true }).throwOnError(),
    admin
      .from("issue_reviews")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false }).throwOnError(),
  ]);

  const customer: CustomerDirectoryItem | null = custRow
    ? {
      id: custRow.id,
      primary_identifier: custRow.primary_identifier,
      display_label: custRow.display_label,
      normalized_phone: custRow.normalized_phone,
      external_customer_id: custRow.external_customer_id,
      country_code: custRow.country_code,
      total_calls: custRow.total_calls || 0,
      repeat_call_count: custRow.repeat_call_count || 0,
      recurring_issue_count: custRow.recurring_issue_count || 0,
      new_issue_count: custRow.new_issue_count || 0,
      unresolved_issue_count: custRow.unresolved_issue_count || 0,
      resolved_issue_count: custRow.resolved_issue_count || 0,
      reopened_issue_count: custRow.reopened_issue_count || 0,
      avg_hours_between_calls:
        custRow.avg_hours_between_calls == null
          ? null
          : Number(custRow.avg_hours_between_calls),
      top_issue_categories: custRow.top_issue_categories || [],
      risk_level: (custRow.risk_level || "low") as CustomerDirectoryItem["risk_level"],
      needs_identity_review: Boolean(custRow.needs_identity_review),
      first_interaction_at: custRow.first_interaction_at,
      last_interaction_at: custRow.last_interaction_at,
    }
    : null;

  const issue: IssueSummaryItem = {
    id: issRow.id,
    issue_code: issRow.issue_code,
    customer_id: issRow.customer_id,
    customer_label: customer?.display_label || "Customer",
    customer_phone: customer?.normalized_phone || null,
    title: issRow.title,
    category: issRow.category,
    catalogue_issue_category_id: issRow.catalogue_issue_category_id || null,
    catalogue_issue_category_name: issRow.catalogue_issue_category_name || null,
    subcategory: issRow.subcategory,
    product_service: issRow.product_service,
    symptoms: issRow.symptoms || [],
    location: issRow.location,
    service_provider: issRow.service_provider,
    status: issRow.status as IssueLifecycleStatus,
    resolution_confirmation: issRow.resolution_confirmation as ResolutionConfirmation,
    first_reported_at: issRow.first_reported_at,
    latest_reported_at: issRow.latest_reported_at,
    resolved_at: issRow.resolved_at,
    reopened_count: issRow.reopened_count || 0,
    repeat_interaction_count: issRow.repeat_interaction_count || 0,
    total_calls: issRow.total_calls || 1,
    primary_root_cause: issRow.primary_root_cause as RootCauseCategory,
    primary_root_cause_detail: issRow.primary_root_cause_detail,
    secondary_root_cause: (issRow.secondary_root_cause || null) as RootCauseCategory | null,
    secondary_root_cause_detail: issRow.secondary_root_cause_detail || null,
    root_cause_evidence_type: issRow.root_cause_evidence_type as RootCauseEvidenceType,
    root_cause_confidence: Number(issRow.root_cause_confidence ?? 0.5),
    root_cause_explanation: issRow.root_cause_explanation,
    responsible_team: issRow.responsible_team,
    recommended_action: issRow.recommended_action,
    summary: issRow.summary || "",
    needs_review: Boolean(issRow.needs_review),
    human_verified: Boolean(issRow.human_verified),
  };

  const calls: TimelineCallEntry[] = (callLinkRows || []).map((ic) => {
    const callObj = Array.isArray(ic.calls) ? ic.calls[0] : ic.calls;
    const agentObj =
      callObj && "agents" in callObj
        ? Array.isArray(callObj.agents)
          ? callObj.agents[0]
          : callObj.agents
        : null;
    const scoreObj =
      callObj && "call_scores" in callObj
        ? Array.isArray(callObj.call_scores)
          ? callObj.call_scores[0]
          : callObj.call_scores
        : null;

    return {
      id: ic.id,
      call_id: ic.call_id,
      issue_id: ic.issue_id,
      issue_code: issue.issue_code,
      issue_title: issue.title,
      issue_status: issue.status,
      resolution_confirmation: issue.resolution_confirmation,
      interaction_number: ic.interaction_number || 1,
      customer_contact_sequence: ic.customer_contact_sequence || 1,
      is_repeat_customer: Boolean(ic.is_repeat_customer),
      is_repeat_issue: Boolean(ic.is_repeat_issue),
      match_classification: ic.match_classification as MatchClassification,
      match_confidence: Number(ic.match_confidence ?? 1),
      match_reason: ic.match_reason || "",
      call_resolution_state: ic.call_resolution_state || "unconfirmed",
      extracted_category: ic.extracted_category,
      extracted_product_service: ic.extracted_product_service,
      extracted_symptoms: ic.extracted_symptoms || [],
      extracted_issue_summary: ic.extracted_issue_summary || "",
      transcript_evidence: Array.isArray(ic.transcript_evidence)
        ? (ic.transcript_evidence as TranscriptEvidenceExcerpt[])
        : [],
      human_review_status: ic.human_review_status || null,
      call_title:
        (callObj as { title?: string; file_name?: string } | null)?.title ||
        (callObj as { file_name?: string } | null)?.file_name ||
        "Call",
      call_date:
        (callObj as { created_at?: string } | null)?.created_at || ic.created_at,
      call_status: (callObj as { status?: string } | null)?.status || "completed",
      duration_seconds:
        (callObj as { duration_seconds?: number | null } | null)?.duration_seconds ??
        null,
      agent_id: (callObj as { agent_id?: string | null } | null)?.agent_id ?? null,
      agent_name: (agentObj as { name?: string } | null)?.name || "Unassigned",
      qa_score:
        (scoreObj as { overall_score?: number | null } | null)?.overall_score ?? null,
      qa_verdict: (scoreObj as { verdict?: string | null } | null)?.verdict ?? null,
      qa_sentiment:
        (scoreObj as { customer_sentiment?: string | null } | null)
          ?.customer_sentiment ?? null,
      qa_summary: (scoreObj as { summary?: string | null } | null)?.summary ?? null,
      primary_root_cause: issue.primary_root_cause,
      root_cause_evidence_type: issue.root_cause_evidence_type,
    };
  });

  return {
    issue,
    customer,
    calls,
    rootCauses: (rcRows || []).map((r) => ({
      id: r.id,
      category: r.category as RootCauseCategory,
      subcategory: r.subcategory || "general",
      secondary_category: r.secondary_category || null,
      evidence_type: r.evidence_type as RootCauseEvidenceType,
      confidence: Number(r.confidence ?? 0.5),
      explanation: r.explanation || "",
      recommended_action: r.recommended_action || "",
      responsible_category: r.responsible_category || "",
      transcript_excerpts: Array.isArray(r.transcript_excerpts)
        ? (r.transcript_excerpts as TranscriptEvidenceExcerpt[])
        : [],
      is_current: Boolean(r.is_current),
      human_status: r.human_status || null,
      created_at: r.created_at,
    })),
    statusHistory: (shRows || []).map((s) => ({
      id: s.id,
      previous_status: s.previous_status,
      new_status: s.new_status,
      resolution_confirmation: s.resolution_confirmation,
      changed_by_type: s.changed_by_type,
      reason: s.reason || "",
      created_at: s.created_at,
    })),
    reviews: (revRows || []).map((r) => ({
      id: r.id,
      review_type: r.review_type,
      reviewer_name: r.reviewer_name,
      notes: r.notes || "",
      responsible_team: r.responsible_team,
      previous_value: (r.previous_value as Record<string, unknown>) || {},
      new_value: (r.new_value as Record<string, unknown>) || {},
      created_at: r.created_at,
    })),
    migrationRequired: false,
  };
}

/**
 * Phase 11: Human Review & Correction Handler
 * Stores human corrections in `public.issue_reviews` (or in-memory store if migration is pending)
 * while updating the active issue/call/customer state and preserving audit history.
 */
export async function submitHumanIssueReview(params: {
  reviewerId: string;
  reviewerName: string;
  issueId: string;
  callId?: string | null;
  reviewType:
  | "confirm_match"
  | "reject_match"
  | "reassign_customer"
  | "update_category"
  | "confirm_root_cause"
  | "reject_root_cause"
  | "update_status"
  | "confirm_resolution"
  | "assign_team"
  | "investigation_note";
  newStatus?: IssueLifecycleStatus;
  resolutionConfirmation?: ResolutionConfirmation;
  newCategory?: IssueCategory;
  newSubcategory?: string;
  newRootCause?: RootCauseCategory;
  newRootCauseDetail?: string;
  responsibleTeam?: string;
  targetCustomerIdentifier?: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const [teamScope, membership] = await Promise.all([
    getTeamScope(params.reviewerId),
    getMembership(params.reviewerId).catch(() => null),
  ]);
  const defaultCountry = resolveCountryIso(membership?.country);

  const { data: issue, error: issErr } = await admin
    .from("customer_issues")
    .select("*")
    .eq("id", params.issueId)
    .in("user_id", teamScope)
    .maybeSingle();

  // If the customer_issues table hasn't been created yet, persist the review in the in-memory store!
  if (issErr && isMissingTableError(issErr)) {
    if (process.env.ZETRO_ENABLE_LEGACY_PREVIEW !== "true") return { ok: false, error: "Customer intelligence database setup is required before reviews can be saved." };
    const store = getInMemoryStore();
    const projected = await buildInMemoryProjection(teamScope, defaultCountry);
    const targetIss = projected.issues.find((i) => i.id === params.issueId);
    if (!targetIss) {
      return { ok: false, error: "Issue not found in workspace" };
    }

    if (params.callId && !projected.timelineCalls.some(call => call.call_id === params.callId && call.issue_id === params.issueId)) return { ok: false, error: "Call does not belong to this issue" };
    const prevValue: Record<string, unknown> = {
      status: targetIss.status,
      resolution_confirmation: targetIss.resolution_confirmation,
      category: targetIss.category,
      primary_root_cause: targetIss.primary_root_cause,
      responsible_team: targetIss.responsible_team,
    };

    const currentOverride = store.issueOverrides.get(targetIss.id) || {};
    const nextOverride: Partial<IssueSummaryItem> = {
      ...currentOverride,
      ...issueReviewFlags(params.reviewType),
    };

    const nowIso = new Date().toISOString();

    if (params.reviewType === "update_status" || params.reviewType === "confirm_resolution") {
      const nextStatus =
        params.newStatus ||
        (params.reviewType === "confirm_resolution" ? "resolved" : targetIss.status);
      const nextConf =
        params.resolutionConfirmation ||
        (params.reviewType === "confirm_resolution"
          ? "operationally_verified"
          : targetIss.resolution_confirmation);

      if (ISSUE_STATUSES.includes(nextStatus)) {
        nextOverride.status = nextStatus;
        if (nextStatus === "resolved" || nextStatus === "closed") {
          nextOverride.resolved_at = nowIso;
        }
      }
      if (RESOLUTION_CONFIRMATIONS.includes(nextConf)) {
        nextOverride.resolution_confirmation = nextConf;
      }

      Object.assign(nextOverride, lifecycleReviewFields(nextStatus, targetIss.reopened_count, targetIss.status, nowIso));
      const histList = store.statusHistoryByIssue.get(targetIss.id) || [];
      histList.push({
        id: `sh-${Date.now()}`,
        previous_status: targetIss.status,
        new_status: nextOverride.status || targetIss.status,
        resolution_confirmation:
          nextOverride.resolution_confirmation || targetIss.resolution_confirmation,
        changed_by_type: "human",
        reason:
          params.notes ||
          `Human reviewer (${params.reviewerName}) updated lifecycle status.`,
        created_at: nowIso,
      });
      store.statusHistoryByIssue.set(targetIss.id, histList);
    }

    if (params.reviewType === "update_category" && params.newCategory) {
      if (ISSUE_CATEGORIES.includes(params.newCategory)) {
        nextOverride.category = params.newCategory;
      }
    }

    if (
      params.reviewType === "confirm_root_cause" ||
      params.reviewType === "reject_root_cause"
    ) {
      if (params.newRootCause && ROOT_CAUSE_CATEGORIES.includes(params.newRootCause)) {
        nextOverride.primary_root_cause = params.newRootCause;
      }
      if (params.reviewType === "confirm_root_cause") {
        nextOverride.root_cause_evidence_type = "confirmed_evidence";
        nextOverride.root_cause_confidence = 1.0;
      }
    }

    if (params.responsibleTeam) {
      nextOverride.responsible_team = params.responsibleTeam.trim();
    }

    if (params.reviewType === "confirm_match" && params.callId) {
      store.callOverrides.set(params.callId, {
        ...(store.callOverrides.get(params.callId) || {}),
        human_review_status: "confirmed",
      });
    }

    if (params.reviewType === "reject_match" && params.callId) {
      const callEntry = projected.timelineCalls.find((c) => c.call_id === params.callId);
      if (callEntry) {
        const splitId = `iss-split-${params.callId.slice(0, 6)}`;
        const splitCode = `ISS-SPLIT-${params.callId.slice(0, 4).toUpperCase()}`;
        const splitIssue: IssueSummaryItem = {
          ...targetIss,
          id: splitId,
          issue_code: splitCode,
          title: `${ISSUE_CATEGORY_LABELS[callEntry.extracted_category || targetIss.category] || "Issue"} (Split by Reviewer)`,
          status: "open",
          resolution_confirmation: "unconfirmed",
          total_calls: 1,
          repeat_interaction_count: 0,
          summary: callEntry.extracted_issue_summary || targetIss.summary,
          human_verified: true,
          needs_review: false,
        };
        store.splitIssues.set(splitId, splitIssue);
        store.callOverrides.set(params.callId, {
          issue_id: splitId,
          interaction_number: 1,
          is_repeat_issue: false,
          match_classification: "new_issue",
          human_review_status: "corrected",
          match_reason: `Human reviewer (${params.reviewerName}) rejected prior issue match and split into standalone issue ${splitCode}.`,
        });
        nextOverride.total_calls = Math.max(1, targetIss.total_calls - 1);
        nextOverride.repeat_interaction_count = Math.max(
          0,
          targetIss.repeat_interaction_count - 1,
        );
      }
    }

    store.issueOverrides.set(targetIss.id, nextOverride);

    const revList = store.reviewsByIssue.get(targetIss.id) || [];
    revList.unshift({
      id: `rev-${Date.now()}`,
      review_type: params.reviewType,
      reviewer_name: params.reviewerName,
      notes: params.notes || "",
      responsible_team:
        params.responsibleTeam || targetIss.responsible_team || null,
      previous_value: prevValue,
      new_value: nextOverride as Record<string, unknown>,
      created_at: nowIso,
    });
    store.reviewsByIssue.set(targetIss.id, revList);

    return { ok: true };
  }

  if (issErr || !issue) {
    return { ok: false, error: issErr?.message || "Issue not found in workspace" };
  }

  if (params.callId) {
    const { data: ownedLink, error: linkError } = await admin.from("issue_calls")
      .select("id").eq("call_id", params.callId).eq("issue_id", issue.id).in("user_id", teamScope).maybeSingle();
    if (linkError || !ownedLink) return { ok: false, error: "Call does not belong to this issue" };
  }
  const previousValue: Record<string, unknown> = {
    status: issue.status,
    resolution_confirmation: issue.resolution_confirmation,
    category: issue.category,
    primary_root_cause: issue.primary_root_cause,
    responsible_team: issue.responsible_team,
    needs_review: issue.needs_review,
  };

  const updates: Record<string, unknown> = {
    ...issueReviewFlags(params.reviewType, Boolean(issue.catalogue_requires_review)),
    updated_at: new Date().toISOString(),
  };
  if ("needs_review" in updates && "journey_requires_review" in issue) updates.journey_requires_review = false;

  if (params.reviewType === "update_status" || params.reviewType === "confirm_resolution") {
    const nextStatus =
      params.newStatus ||
      (params.reviewType === "confirm_resolution" ? "resolved" : issue.status);
    const nextConf =
      params.resolutionConfirmation ||
      (params.reviewType === "confirm_resolution"
        ? "operationally_verified"
        : issue.resolution_confirmation);

    if (ISSUE_STATUSES.includes(nextStatus as IssueLifecycleStatus)) {
      updates.status = nextStatus;
      if (nextStatus === "resolved" || nextStatus === "closed") {
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (RESOLUTION_CONFIRMATIONS.includes(nextConf as ResolutionConfirmation)) {
      updates.resolution_confirmation = nextConf;
    }

    Object.assign(updates, lifecycleReviewFields(nextStatus, issue.reopened_count || 0, issue.status, new Date().toISOString()));
    await admin.from("issue_status_history").insert({
      issue_id: issue.id,
      call_id: params.callId || null,
      workspace_id: issue.workspace_id,
      user_id: issue.user_id,
      previous_status: issue.status,
      new_status: String(updates.status || issue.status),
      resolution_confirmation: String(
        updates.resolution_confirmation || issue.resolution_confirmation,
      ),
      changed_by_type: "human",
      changed_by_user_id: params.reviewerId,
      reason:
        params.notes ||
        `Human reviewer (${params.reviewerName}) updated lifecycle status.`,
    }).throwOnError();
  }

  if (params.reviewType === "update_category" && params.newCategory) {
    if (ISSUE_CATEGORIES.includes(params.newCategory)) {
      updates.category = params.newCategory;
    }
    if (params.newSubcategory) {
      updates.subcategory = params.newSubcategory;
    }
  }

  if (
    params.reviewType === "confirm_root_cause" ||
    params.reviewType === "reject_root_cause"
  ) {
    if (params.newRootCause && ROOT_CAUSE_CATEGORIES.includes(params.newRootCause)) {
      updates.primary_root_cause = params.newRootCause;
    }
    if (params.newRootCauseDetail) {
      updates.primary_root_cause_detail = params.newRootCauseDetail;
    }
    if (params.reviewType === "confirm_root_cause") {
      updates.root_cause_evidence_type = "confirmed_evidence";
      updates.root_cause_confidence = 1.0;
    }
    await admin
      .from("issue_root_causes")
      .update({
        human_status:
          params.reviewType === "confirm_root_cause" ? "confirmed" : "overridden",
        ...(params.newRootCause ? { category: params.newRootCause } : {}),
      })
      .eq("issue_id", issue.id)
      .eq("is_current", true).throwOnError();
  }

  if (params.responsibleTeam) {
    updates.responsible_team = params.responsibleTeam.trim();
  }

  if (params.reviewType === "confirm_match" && params.callId) {
    await admin
      .from("issue_calls")
      .update({ human_review_status: "confirmed" })
      .eq("call_id", params.callId).eq("issue_id", issue.id).throwOnError();
  }

  if (params.reviewType === "reject_match" && params.callId) {
    const { data: callLink } = await admin
      .from("issue_calls")
      .select("*")
      .eq("call_id", params.callId).eq("issue_id", issue.id)
      .maybeSingle();

    if (callLink) {
      const splitCode = `ISS-SPLIT-${params.callId.slice(0, 5).toUpperCase()}`;
      const { data: splitIssue } = await admin
        .from("customer_issues")
        .insert({
          customer_id: issue.customer_id,
          workspace_id: issue.workspace_id,
          user_id: issue.user_id,
          issue_code: splitCode,
          title: `${ISSUE_CATEGORY_LABELS[callLink.extracted_category || issue.category] || "Issue"} (Split by Reviewer)`,
          category: callLink.extracted_category || issue.category,
          product_service: callLink.extracted_product_service || issue.product_service,
          symptoms: callLink.extracted_symptoms || [],
          status: "open",
          resolution_confirmation: "unconfirmed",
          summary: callLink.extracted_issue_summary || issue.summary,
          human_verified: true,
        })
        .select("id")
        .single().throwOnError();

      if (splitIssue) {
        await admin
          .from("issue_calls")
          .update({
            issue_id: splitIssue.id,
            interaction_number: 1,
            is_repeat_issue: false,
            match_classification: "new_issue",
            human_review_status: "corrected",
            match_reason: `Human reviewer (${params.reviewerName}) rejected prior issue match and split into standalone issue ${splitCode}.`,
          })
          .eq("call_id", params.callId).eq("issue_id", issue.id).throwOnError();

        updates.total_calls = Math.max(1, (issue.total_calls || 2) - 1);
        updates.repeat_interaction_count = Math.max(
          0,
          (issue.repeat_interaction_count || 1) - 1,
        );
      }
    }
  }

  await admin.from("customer_issues").update(updates).eq("id", issue.id).throwOnError();

  await admin.from("issue_reviews").insert({
    issue_id: issue.id,
    call_id: params.callId || null,
    customer_id: issue.customer_id,
    workspace_id: issue.workspace_id,
    user_id: issue.user_id,
    reviewer_id: params.reviewerId,
    reviewer_name: params.reviewerName,
    review_type: params.reviewType,
    previous_value: previousValue,
    new_value: updates,
    notes: params.notes || "",
    responsible_team: params.responsibleTeam || issue.responsible_team || null,
  }).throwOnError();

  await refreshCustomerAggregateMetrics(issue.customer_id);
  return { ok: true };
}

/**
 * Allows authorized reviewers to update/verify a customer's primary identity or merge/reassign.
 */
export async function updateCustomerIdentityReview(params: {
  reviewerId: string;
  reviewerName: string;
  customerId: string;
  phoneInput?: string | null;
  externalCustomerId?: string | null;
  displayLabel?: string | null;
  verifyIdentity?: boolean;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const [teamScope, membership] = await Promise.all([
    getTeamScope(params.reviewerId),
    getMembership(params.reviewerId).catch(() => null),
  ]);
  const country = resolveCountryIso(membership?.country);

  const { data: customer, error } = await admin
    .from("customers")
    .select("*")
    .eq("id", params.customerId)
    .in("user_id", teamScope)
    .maybeSingle();

  // If the customers table hasn't been created yet, persist the identity review in memory!
  if (error && isMissingTableError(error)) {
    if (process.env.ZETRO_ENABLE_LEGACY_PREVIEW !== "true") return { ok: false, error: "Customer intelligence database setup is required before identity reviews can be saved." };
    const store = getInMemoryStore();
    const projected = await buildInMemoryProjection(teamScope, country);
    const targetCust = projected.customers.find((c) => c.id === params.customerId);
    if (!targetCust) {
      return { ok: false, error: "Customer not found" };
    }

    const currentOv = store.customerOverrides.get(targetCust.id) || {};
    const nextOv: Partial<CustomerDirectoryItem> = { ...currentOv };

    if (params.phoneInput) {
      const parsed = normalizePhoneNumber(params.phoneInput, country);
      if (!parsed.valid || !parsed.e164) {
        return { ok: false, error: parsed.reason || "Invalid phone number format" };
      }
      nextOv.normalized_phone = parsed.e164;
      nextOv.country_code = parsed.countryCode || country;
      if (!params.displayLabel) {
        nextOv.display_label = formatPhoneReadable(parsed.e164);
      }
    }

    if (params.externalCustomerId) {
      const normId = normalizeCustomerId(params.externalCustomerId);
      if (normId) {
        nextOv.external_customer_id = normId;
        nextOv.primary_identifier = normId;
      }
    }

    if (params.displayLabel?.trim()) {
      nextOv.display_label = params.displayLabel.trim();
    }

    if (params.verifyIdentity) {
      nextOv.needs_identity_review = false;
    }

    store.customerOverrides.set(targetCust.id, nextOv);

    const custReviews = store.reviewsByCustomer.get(targetCust.id) || [];
    custReviews.unshift({
      id: `rev-cust-${Date.now()}`,
      review_type: "reassign_customer",
      reviewer_name: params.reviewerName,
      notes: params.notes || "Human verified/updated customer identity.",
      responsible_team: null,
      previous_value: {
        normalized_phone: targetCust.normalized_phone,
        external_customer_id: targetCust.external_customer_id,
      },
      new_value: nextOv as Record<string, unknown>,
      created_at: new Date().toISOString(),
    });
    store.reviewsByCustomer.set(targetCust.id, custReviews);

    return { ok: true };
  }

  if (error || !customer) {
    return { ok: false, error: error?.message || "Customer not found" };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.phoneInput) {
    const parsed = normalizePhoneNumber(params.phoneInput, country);
    if (!parsed.valid || !parsed.e164) {
      return { ok: false, error: parsed.reason || "Invalid phone number format" };
    }
    updates.normalized_phone = parsed.e164;
    updates.country_code = parsed.countryCode || country;
    if (!params.displayLabel) {
      updates.display_label = formatPhoneReadable(parsed.e164);
    }
    await admin.from("customer_identifiers").insert({
      customer_id: customer.id,
      workspace_id: customer.workspace_id,
      user_id: customer.user_id,
      id_type: "msisdn",
      raw_value: params.phoneInput.trim(),
      normalized_value: parsed.e164,
      country_code: parsed.countryCode || country,
      source: "manual",
      confidence: 1.0,
      is_primary: true,
      verified_by_human: true,
    }).throwOnError();
  }

  if (params.externalCustomerId) {
    const normId = normalizeCustomerId(params.externalCustomerId);
    if (normId) {
      updates.external_customer_id = normId;
      updates.primary_identifier = normId;
      await admin.from("customer_identifiers").insert({
        customer_id: customer.id,
        workspace_id: customer.workspace_id,
        user_id: customer.user_id,
        id_type: "customer_id",
        raw_value: params.externalCustomerId.trim(),
        normalized_value: normId,
        country_code: country,
        source: "manual",
        confidence: 1.0,
        is_primary: true,
        verified_by_human: true,
      }).throwOnError();
    }
  }

  if (params.displayLabel?.trim()) {
    updates.display_label = params.displayLabel.trim();
  }

  if (params.verifyIdentity) {
    updates.needs_identity_review = false;
    await admin
      .from("customer_identifiers")
      .update({ verified_by_human: true })
      .eq("customer_id", customer.id).throwOnError();
  }

  await admin.from("customers").update(updates).eq("id", customer.id).throwOnError();

  await admin.from("issue_reviews").insert({
    customer_id: customer.id,
    workspace_id: customer.workspace_id,
    user_id: customer.user_id,
    reviewer_id: params.reviewerId,
    reviewer_name: params.reviewerName,
    review_type: "reassign_customer",
    previous_value: {
      normalized_phone: customer.normalized_phone,
      external_customer_id: customer.external_customer_id,
      needs_identity_review: customer.needs_identity_review,
    },
    new_value: updates,
    notes: params.notes || "Human verified/updated customer identity.",
  }).throwOnError();

  return { ok: true };
}
