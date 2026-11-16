import { fetchAllRows } from "@/lib/fetch-all";
import { complianceFollowRateFromScore, failedComplianceFromScore } from "@/lib/compliance-engine";
import { scorecardRows } from "@/lib/scorecard-rows";
import { sanitizeDisplayText, sanitizeInlineSnippet } from "@/lib/security/sanitize";
import type { CallScore, CallStatus, MetricEvidence, Verdict } from "@/lib/types";
import {
  dateBucketKey,
  isTimestampInRange,
  type DashboardFilterParams,
} from "@/lib/server/dashboard-filters";
import type { WorkspaceAuthContext } from "@/lib/server/workspace-auth";

export type ScopedCallScoreRow = Omit<
  CallScore,
  "id" | "call_id" | "strengths" | "improvements" | "standards_used"
>;

export type ScopedCallRow = {
  id: string;
  user_id: string;
  agent_id: string | null;
  title: string | null;
  file_name: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  language_mode: string;
  detected_language: string | null;
  status: CallStatus;
  created_at: string;
  completed_at: string | null;
  channel?: string | null;
  team_id?: string | null;
  queue_id?: string | null;
  review_status?: string | null;
  reviewed_at?: string | null;
  agents?: { name: string } | { name: string }[] | null;
  call_scores?: ScopedCallScoreRow[] | ScopedCallScoreRow | null;
};

export type NormalizedCallRecord = {
  id: string;
  title: string;
  fileName: string | null;
  hasAudio: boolean;
  durationSeconds: number | null;
  language: string;
  status: CallStatus;
  channel: "voice" | "whatsapp" | "email" | "chat" | "other";
  agentId: string | null;
  agentName: string;
  teamId: string | null;
  teamName: string | null;
  queueId: string | null;
  queueName: string | null;
  reviewStatus: "pending" | "approved" | "needs_coaching" | "escalated";
  reviewedAt: string | null;
  createdAt: string;
  auditedAt: string;
  score: CallScore | null;
  overallScore: number | null;
  verdict: Verdict | null;
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  compliancePct: number | null;
  complianceFailedCount: number;
  compliancePassedCount: number;
  criticalFailureCount: number;
  needsReview: boolean;
  summary: string | null;
};

export type TeamOption = {
  id: string;
  name: string;
  department: string | null;
};

export type QueueOption = {
  id: string;
  name: string;
  channel: string;
  teamId: string | null;
};

export type AgentOption = {
  id: string;
  name: string;
};

export function normalizeChannel(
  raw: string | null | undefined,
): "voice" | "whatsapp" | "email" | "chat" | "other" {
  const v = (raw || "").trim().toLowerCase();
  if (v === "whatsapp") return "whatsapp";
  if (v === "email") return "email";
  if (v === "chat") return "chat";
  if (v === "other") return "other";
  return "voice";
}

export function normalizeSentiment(
  raw: string | null | undefined,
): "positive" | "neutral" | "negative" | "unknown" {
  const v = (raw || "").trim().toLowerCase();
  if (!v) return "unknown";
  if (/(positive|satisfied|happy|pleased|calm|grateful|resolved)/.test(v)) return "positive";
  if (/(negative|frustrated|angry|upset|dissatisfied|hostile|escalation)/.test(v)) {
    return "negative";
  }
  if (/(neutral|mixed|factual|calm\/neutral)/.test(v)) return "neutral";
  return "unknown";
}

function normalizeReviewStatus(
  raw: string | null | undefined,
): "pending" | "approved" | "needs_coaching" | "escalated" {
  if (raw === "approved" || raw === "needs_coaching" || raw === "escalated") return raw;
  return "pending";
}

function unwrapScore(raw: ScopedCallRow["call_scores"]): CallScore | null {
  if (!raw) return null;
  const picked = Array.isArray(raw) ? raw[0] ?? null : raw;
  if (!picked) return null;
  return {
    id: "",
    call_id: "",
    strengths: [],
    improvements: [],
    standards_used: [],
    ...picked,
  };
}

function unwrapAgentName(
  agents: ScopedCallRow["agents"],
): string {
  const row = Array.isArray(agents) ? agents[0] : agents;
  const raw = row?.name?.trim();
  return sanitizeDisplayText(raw, "Unassigned agent");
}

function isMissingRelationOrColumn(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    err.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find")
  );
}

export async function loadTeamAndQueueLookups(ctx: WorkspaceAuthContext): Promise<{
  teams: TeamOption[];
  queues: QueueOption[];
  agents: AgentOption[];
}> {
  const [teamsRes, queuesRes, agentsRes] = await Promise.all([
    ctx.admin
      .from("teams")
      .select("id, name, department")
      .eq("workspace_id", ctx.workspace.id)
      .order("name", { ascending: true }),
    ctx.admin
      .from("queues")
      .select("id, name, channel, team_id")
      .eq("workspace_id", ctx.workspace.id)
      .order("name", { ascending: true }),
    ctx.admin
      .from("agents")
      .select("id, name")
      .in("user_id", ctx.teamScope)
      .order("name", { ascending: true }),
  ]);

  let teams: TeamOption[] = [];
  if (!teamsRes.error && teamsRes.data) {
    teams = teamsRes.data.map((row) => ({
      id: String(row.id),
      name: sanitizeDisplayText(String(row.name || ""), "Team"),
      department: typeof row.department === "string" ? sanitizeDisplayText(row.department) : null,
    }));
  } else if (isMissingRelationOrColumn(teamsRes.error)) {
    const fallbackTeams = await ctx.admin
      .from("operational_entities")
      .select("id, display_name, department")
      .in("user_id", ctx.teamScope)
      .eq("entity_type", "team")
      .eq("active_status", true)
      .order("display_name", { ascending: true });
    if (!fallbackTeams.error && fallbackTeams.data) {
      teams = fallbackTeams.data.map((row) => ({
        id: String(row.id),
        name: sanitizeDisplayText(String(row.display_name || ""), "Team"),
        department: typeof row.department === "string" ? sanitizeDisplayText(row.department) : null,
      }));
    }
  }

  let queues: QueueOption[] = [];
  if (!queuesRes.error && queuesRes.data) {
    queues = queuesRes.data.map((row) => ({
      id: String(row.id),
      name: sanitizeDisplayText(String(row.name || ""), "Queue"),
      channel: normalizeChannel(typeof row.channel === "string" ? row.channel : null),
      teamId: typeof row.team_id === "string" ? row.team_id : null,
    }));
  } else if (isMissingRelationOrColumn(queuesRes.error)) {
    const fallbackAreas = await ctx.admin
      .from("company_service_areas")
      .select("id, name")
      .in("user_id", ctx.teamScope)
      .order("name", { ascending: true });
    if (!fallbackAreas.error && fallbackAreas.data) {
      queues = fallbackAreas.data.map((row) => ({
        id: String(row.id),
        name: sanitizeDisplayText(String(row.name || ""), "Queue"),
        channel: "voice",
        teamId: null,
      }));
    }
  }

  const agents: AgentOption[] = (agentsRes.data || []).map((a) => ({
    id: String(a.id),
    name: sanitizeDisplayText(String(a.name || ""), "Agent"),
  }));

  return { teams, queues, agents };
}

export async function loadScopedCalls(ctx: WorkspaceAuthContext): Promise<{
  calls: NormalizedCallRecord[];
  teams: TeamOption[];
  queues: QueueOption[];
  agents: AgentOption[];
}> {
  const lookups = await loadTeamAndQueueLookups(ctx);
  const teamNameById = new Map(lookups.teams.map((t) => [t.id, t.name]));
  const queueNameById = new Map(lookups.queues.map((q) => [q.id, q.name]));

  const extendedSelect =
    "id, user_id, agent_id, title, file_name, audio_path, duration_seconds, language_mode, detected_language, status, created_at, completed_at, channel, team_id, queue_id, review_status, reviewed_at, agents(name), call_scores(overall_score, greeting, empathy, professionalism, resolution, communication, language_handling, verdict, customer_sentiment, summary, compliance_findings, metric_evidence, created_at)";

  const baseSelect =
    "id, user_id, agent_id, title, file_name, audio_path, duration_seconds, language_mode, detected_language, status, created_at, completed_at, agents(name), call_scores(overall_score, greeting, empathy, professionalism, resolution, communication, language_handling, verdict, customer_sentiment, summary, compliance_findings, metric_evidence, created_at)";

  let rowsResult = await fetchAllRows<ScopedCallRow>((from, to) =>
    ctx.admin
      .from("calls")
      .select(extendedSelect)
      .in("user_id", ctx.teamScope)
      .order("created_at", { ascending: false })
      .range(from, to),
  );

  if (rowsResult.error && isMissingRelationOrColumn(rowsResult.error)) {
    rowsResult = await fetchAllRows<ScopedCallRow>((from, to) =>
      ctx.admin
        .from("calls")
        .select(baseSelect)
        .in("user_id", ctx.teamScope)
        .order("created_at", { ascending: false })
        .range(from, to),
    );
  }

  if (rowsResult.error) {
    throw new Error(rowsResult.error.message);
  }

  // Enrich multi-channel & team attributes from interactions when calls table lacks those columns
  const interactionsRes = await ctx.admin
    .from("interactions")
    .select("call_id, channel, team_id")
    .in("user_id", ctx.teamScope)
    .not("call_id", "is", null);

  const interactionByCallId = new Map<string, { channel?: string | null; team_id?: string | null }>();
  if (!interactionsRes.error && interactionsRes.data) {
    for (const row of interactionsRes.data) {
      if (typeof row.call_id === "string") {
        interactionByCallId.set(row.call_id, {
          channel: typeof row.channel === "string" ? row.channel : null,
          team_id: typeof row.team_id === "string" ? row.team_id : null,
        });
      }
    }
  }

  const threshold = ctx.workspace.reviewScoreThreshold;

  const normalized: NormalizedCallRecord[] = rowsResult.data.map((row) => {
    const score = unwrapScore(row.call_scores);
    const inter = interactionByCallId.get(row.id);
    const channel = normalizeChannel(row.channel || inter?.channel || "voice");
    const teamId = row.team_id || inter?.team_id || null;
    const queueId = row.queue_id || null;
    const reviewStatus = normalizeReviewStatus(row.review_status);

    const overallScore =
      score && typeof score.overall_score === "number" && Number.isFinite(score.overall_score)
        ? Math.round(score.overall_score)
        : null;

    const comp = score
      ? complianceFollowRateFromScore({
          compliance_findings: score.compliance_findings,
          metric_evidence: (score.metric_evidence as MetricEvidence | null | undefined) ?? null,
        })
      : null;

    const failedList = score
      ? failedComplianceFromScore({
          compliance_findings: score.compliance_findings,
          metric_evidence: (score.metric_evidence as MetricEvidence | null | undefined) ?? null,
        })
      : [];

    const criticalFailureCount = failedList.filter((f) => f.severity === "critical").length;
    const complianceFailedCount = comp ? comp.failed : failedList.length;
    const compliancePassedCount = comp ? comp.passed : 0;

    const isLowScore =
      overallScore != null &&
      (overallScore < threshold ||
        score?.verdict === "needs_improvement" ||
        score?.verdict === "poor");
    const hasComplianceFail = complianceFailedCount > 0;

    const needsReview =
      reviewStatus === "needs_coaching" ||
      reviewStatus === "escalated" ||
      (row.status === "completed" &&
        reviewStatus === "pending" &&
        (isLowScore || hasComplianceFail));

    return {
      id: row.id,
      title: sanitizeDisplayText(row.title || row.file_name, "Recorded call"),
      fileName: row.file_name ? sanitizeDisplayText(row.file_name) : null,
      hasAudio: Boolean(row.audio_path),
      durationSeconds: row.duration_seconds,
      language: row.detected_language || row.language_mode || "mixed",
      status: row.status,
      channel,
      agentId: row.agent_id,
      agentName: unwrapAgentName(row.agents),
      teamId,
      teamName: teamId ? teamNameById.get(teamId) ?? null : null,
      queueId,
      queueName: queueId ? queueNameById.get(queueId) ?? null : null,
      reviewStatus,
      reviewedAt: row.reviewed_at ?? null,
      createdAt: row.created_at,
      auditedAt: score?.created_at || row.completed_at || row.created_at,
      score,
      overallScore,
      verdict: (score?.verdict as Verdict | undefined) ?? null,
      sentiment: normalizeSentiment(score?.customer_sentiment),
      compliancePct: comp?.followed_pct ?? null,
      complianceFailedCount,
      compliancePassedCount,
      criticalFailureCount,
      needsReview,
      summary: score?.summary ? sanitizeInlineSnippet(score.summary, 320) : null,
    };
  });

  return { calls: normalized, ...lookups };
}

export function applyCallFilters(
  calls: NormalizedCallRecord[],
  filters: DashboardFilterParams,
  options?: { window?: "current" | "previous" | "none" },
): NormalizedCallRecord[] {
  const win = options?.window ?? "current";
  const qLower = filters.q.toLowerCase();

  return calls.filter((call) => {
    if (win === "current" && !isTimestampInRange(call.createdAt, filters.fromMs, filters.toMs)) {
      return false;
    }
    if (win === "previous" && !isTimestampInRange(call.createdAt, filters.prevFromMs, filters.prevToMs)) {
      return false;
    }
    if (filters.teamId && call.teamId !== filters.teamId) return false;
    if (filters.queueId && call.queueId !== filters.queueId) return false;
    if (filters.agentId && call.agentId !== filters.agentId) return false;
    if (filters.channel !== "all" && call.channel !== filters.channel) return false;
    if (filters.sentiment !== "all" && call.sentiment !== filters.sentiment) return false;
    if (filters.needsReview && !call.needsReview) return false;
    if (filters.flagged && call.complianceFailedCount === 0) return false;
    if (qLower) {
      const hay = `${call.title} ${call.fileName ?? ""} ${call.agentName} ${call.summary ?? ""}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
    return true;
  });
}

export function summarizeWindowMetrics(calls: NormalizedCallRecord[]) {
  const analyzedCalls = calls.filter(
    (c) => c.status === "completed" && c.overallScore != null,
  );
  const callsAnalyzed = analyzedCalls.length;

  const avgScore =
    callsAnalyzed > 0
      ? Number(
          (
            analyzedCalls.reduce((sum, c) => sum + (c.overallScore ?? 0), 0) / callsAnalyzed
          ).toFixed(1),
        )
      : null;

  const totalPassed = analyzedCalls.reduce((sum, c) => sum + c.compliancePassedCount, 0);
  const totalFailed = analyzedCalls.reduce((sum, c) => sum + c.complianceFailedCount, 0);
  const applicableCompliance = totalPassed + totalFailed;
  const complianceRate =
    applicableCompliance > 0
      ? Number(((totalPassed / applicableCompliance) * 100).toFixed(1))
      : null;

  const knownSentiment = analyzedCalls.filter((c) => c.sentiment !== "unknown");
  const positiveCount = knownSentiment.filter((c) => c.sentiment === "positive").length;
  const positiveSentimentPct =
    knownSentiment.length > 0
      ? Number(((positiveCount / knownSentiment.length) * 100).toFixed(1))
      : null;

  const needsReviewCount = calls.filter((c) => c.needsReview).length;

  return {
    callsAnalyzed,
    avgScore,
    complianceRate,
    positiveSentimentPct,
    needsReviewCount,
  };
}

export function computeMetricDelta(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null) return null;
  return Number((current - previous).toFixed(1));
}

export function computeKpiSparklines(
  calls: NormalizedCallRecord[],
  timezone: string,
) {
  if (calls.length === 0) {
    return {
      callsAnalyzed: [],
      avgScore: [],
      complianceRate: [],
      positiveSentimentPct: [],
      needsReviewCount: [],
    };
  }

  const buckets = new Map<string, NormalizedCallRecord[]>();
  const chronological = [...calls].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const call of chronological) {
    const key = dateBucketKey(call.createdAt, timezone);
    const arr = buckets.get(key);
    if (arr) arr.push(call);
    else buckets.set(key, [call]);
  }

  const keys = [...buckets.keys()].sort();
  const callsAnalyzed: Array<{ date: string; value: number }> = [];
  const avgScore: Array<{ date: string; value: number }> = [];
  const complianceRate: Array<{ date: string; value: number }> = [];
  const positiveSentimentPct: Array<{ date: string; value: number }> = [];
  const needsReviewCount: Array<{ date: string; value: number }> = [];

  for (const key of keys) {
    const summary = summarizeWindowMetrics(buckets.get(key) || []);
    callsAnalyzed.push({ date: key, value: summary.callsAnalyzed });
    needsReviewCount.push({ date: key, value: summary.needsReviewCount });
    if (summary.avgScore != null) {
      avgScore.push({ date: key, value: summary.avgScore });
    }
    if (summary.complianceRate != null) {
      complianceRate.push({ date: key, value: summary.complianceRate });
    }
    if (summary.positiveSentimentPct != null) {
      positiveSentimentPct.push({ date: key, value: summary.positiveSentimentPct });
    }
  }

  return {
    callsAnalyzed,
    avgScore,
    complianceRate,
    positiveSentimentPct,
    needsReviewCount,
  };
}

export function computeFailureReasons(calls: NormalizedCallRecord[], limit = 6) {
  const scored = calls.filter((c) => c.status === "completed" && c.score != null);
  if (scored.length === 0) return [];

  const complianceCounts = new Map<
    string,
    { reason: string; severity: string; count: number }
  >();
  const rubricGaps = new Map<
    string,
    { reason: string; count: number; scoreSum: number }
  >();

  for (const call of scored) {
    const score = call.score!;
    const failedRules = failedComplianceFromScore({
      compliance_findings: score.compliance_findings,
      metric_evidence: (score.metric_evidence as MetricEvidence | null | undefined) ?? null,
    });
    for (const rule of failedRules) {
      const label = sanitizeInlineSnippet(rule.rule, 110);
      if (!label) continue;
      const key = label.toLowerCase();
      const prev = complianceCounts.get(key);
      if (prev) prev.count += 1;
      else complianceCounts.set(key, { reason: label, severity: rule.severity, count: 1 });
    }

    const criteria = scorecardRows(score);
    for (const row of criteria) {
      if (row.score < 70) {
        const label = sanitizeInlineSnippet(row.name, 90);
        const key = label.toLowerCase();
        const prev = rubricGaps.get(key);
        if (prev) {
          prev.count += 1;
          prev.scoreSum += row.score;
        } else {
          rubricGaps.set(key, { reason: label, count: 1, scoreSum: row.score });
        }
      }
    }
  }

  const combined = [
    ...[...complianceCounts.values()].map((item) => ({
      id: `compliance:${item.reason}`,
      reason: item.reason,
      kind: "compliance" as const,
      severity: item.severity as "critical" | "major" | "minor",
      failureCount: item.count,
      failureRatePct: Number(((item.count / scored.length) * 100).toFixed(1)),
      avgScoreOnFailed: null as number | null,
    })),
    ...[...rubricGaps.values()].map((item) => ({
      id: `rubric:${item.reason}`,
      reason: item.reason,
      kind: "rubric" as const,
      severity: "major" as const,
      failureCount: item.count,
      failureRatePct: Number(((item.count / scored.length) * 100).toFixed(1)),
      avgScoreOnFailed: Math.round(item.scoreSum / item.count),
    })),
  ];

  return combined
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, limit);
}

export function sortNormalizedCalls(
  calls: NormalizedCallRecord[],
  sortBy: DashboardFilterParams["sortBy"],
  sortDir: "asc" | "desc",
) {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...calls].sort((a, b) => {
    if (sortBy === "overall_score") {
      const sa = a.overallScore ?? -1;
      const sb = b.overallScore ?? -1;
      return (sa - sb) * dir;
    }
    if (sortBy === "duration_seconds") {
      const da = a.durationSeconds ?? -1;
      const db = b.durationSeconds ?? -1;
      return (da - db) * dir;
    }
    if (sortBy === "agent_name") {
      return a.agentName.localeCompare(b.agentName) * dir;
    }
    if (sortBy === "review_status") {
      return a.reviewStatus.localeCompare(b.reviewStatus) * dir;
    }
    return a.createdAt.localeCompare(b.createdAt) * dir;
  });
}
