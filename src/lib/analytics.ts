import { formatDuration } from "@/lib/format";
import {
  periodRange,
  REPORT_PERIODS,
  todayInNairobi,
  type ReportPeriod,
} from "@/lib/reports";
import type { Call, CallScore, Verdict } from "@/lib/types";

export type AnalyticsCall = Call & {
  agents?: { name: string } | null;
  call_scores?: CallScore[] | CallScore | null;
};

export type AnalyticsAgentRow = {
  id: string;
  name: string;
  call_count: number;
  avg_score: number | null;
  excellent: number;
  needs_coaching: number;
  compliance_clean: number;
  total_handling_seconds: number;
};

export type AnalyticsPeriodMode = ReportPeriod | "custom";

export type AnalyticsFilters = {
  period: AnalyticsPeriodMode;
  date: string;
  from: string;
  to: string;
  /** When true, ignore agentIds and include every agent. */
  allAgents: boolean;
  /** Used when allAgents is false. */
  agentIds: string[];
  includeUnassigned: boolean;
};

export type WorkspaceAnalytics = {
  uploaded: number;
  audited: number;
  not_audited: number;
  preparing: number;
  ready_to_audit: number;
  failed: number;
  avg_score: number | null;
  avg_handling_seconds: number | null;
  total_handling_seconds: number;
  compliance_rate: number | null;
  compliance_clean: number;
  compliance_issues: number;
  documents_audits: number;
  automatic_audits: number;
  verdicts: Record<"excellent" | "good" | "needs_improvement" | "poor", number>;
  dimensions: {
    greeting: number | null;
    empathy: number | null;
    professionalism: number | null;
    resolution: number | null;
    communication: number | null;
    language_handling: number | null;
  };
  languages: Array<{ label: string; count: number }>;
  top_performers: AnalyticsAgentRow[];
  coaching_needed: AnalyticsAgentRow[];
  agents: AnalyticsAgentRow[];
  filter: {
    period: AnalyticsPeriodMode;
    period_label: string;
    range_start: string;
    range_end: string;
    agent_label: string;
    agent_count: number | "all";
  };
};

function scoreOf(call: AnalyticsCall): CallScore | null {
  const raw = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
  return raw || null;
}

function isCleanCompliance(findings: unknown): boolean {
  if (!Array.isArray(findings) || !findings.length) return true;
  return findings.every((item) => {
    const text = String(item || "")
      .trim()
      .toLowerCase();
    return !text || text === "none identified" || text === "none";
  });
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

function dimAvg(scores: CallScore[], key: keyof CallScore) {
  const values = scores
    .map((s) => s[key])
    .filter((n): n is number => typeof n === "number");
  return avg(values);
}

export function formatHandlingTime(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  return formatDuration(seconds);
}

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function nairobiStartIso(ymd: string) {
  return `${ymd}T00:00:00+03:00`;
}

function nextDayYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function resolveAnalyticsRange(filters: Pick<AnalyticsFilters, "period" | "date" | "from" | "to">) {
  if (filters.period === "custom") {
    const from = isYmd(filters.from) ? filters.from : todayInNairobi();
    const to = isYmd(filters.to) ? filters.to : from;
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    return {
      startIso: nairobiStartIso(start),
      endIso: nairobiStartIso(nextDayYmd(end)),
      period_label: `Custom · ${start} to ${end}`,
      range_start: start,
      range_end: end,
    };
  }
  return periodRange(filters.period, filters.date);
}

function inRange(iso: string, startIso: string, endIso: string) {
  const t = new Date(iso).getTime();
  return t >= new Date(startIso).getTime() && t < new Date(endIso).getTime();
}

export function parseAnalyticsQuery(url: URL): AnalyticsFilters | { error: string } {
  const periodRaw = url.searchParams.get("period") || "monthly";
  const period: AnalyticsPeriodMode =
    periodRaw === "custom" || (REPORT_PERIODS as readonly string[]).includes(periodRaw)
      ? (periodRaw as AnalyticsPeriodMode)
      : ("monthly" as const);

  if (
    periodRaw !== "custom" &&
    !(REPORT_PERIODS as readonly string[]).includes(periodRaw)
  ) {
    return { error: "Period must be daily, weekly, monthly, annually, or custom." };
  }

  const dateRaw = url.searchParams.get("date") || todayInNairobi();
  const date = isYmd(dateRaw) ? dateRaw : todayInNairobi();
  const fromRaw = url.searchParams.get("from") || date;
  const toRaw = url.searchParams.get("to") || date;
  const from = isYmd(fromRaw) ? fromRaw : date;
  const to = isYmd(toRaw) ? toRaw : date;

  const agentsRaw = url.searchParams.get("agents") || url.searchParams.get("agentIds") || "all";
  let agentIds: string[] = [];
  let includeUnassigned = false;
  let allAgents = true;

  if (agentsRaw === "all" || !agentsRaw.trim()) {
    allAgents = true;
  } else if (agentsRaw === "none") {
    allAgents = false;
    agentIds = [];
    includeUnassigned = false;
  } else {
    allAgents = false;
    const parts = agentsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    includeUnassigned = parts.includes("unassigned");
    agentIds = parts.filter((id) => id !== "unassigned");
  }

  return { period, date, from, to, allAgents, agentIds, includeUnassigned };
}

export function filterAnalyticsCalls(
  calls: AnalyticsCall[],
  filters: AnalyticsFilters,
  range = resolveAnalyticsRange(filters),
) {
  const agentFilterOn = !filters.allAgents;

  return calls.filter((call) => {
    if (!inRange(call.created_at, range.startIso, range.endIso)) return false;
    if (!agentFilterOn) return true;
    if (!call.agent_id) return filters.includeUnassigned;
    return filters.agentIds.includes(call.agent_id);
  });
}

export function buildWorkspaceAnalytics(
  agents: { id: string; name: string }[],
  calls: AnalyticsCall[],
  filters?: AnalyticsFilters,
): WorkspaceAnalytics {
  const activeFilters: AnalyticsFilters = filters || {
    period: "monthly",
    date: todayInNairobi(),
    from: todayInNairobi(),
    to: todayInNairobi(),
    allAgents: true,
    agentIds: [],
    includeUnassigned: false,
  };
  const range = resolveAnalyticsRange(activeFilters);
  const scopedCalls = filterAnalyticsCalls(calls, activeFilters, range);

  const agentFilterOn = !activeFilters.allAgents;
  const scopedAgents = agentFilterOn
    ? agents.filter((agent) => activeFilters.agentIds.includes(agent.id))
    : agents;

  const uploaded = scopedCalls.length;
  const auditedCalls = scopedCalls.filter((c) => c.status === "completed" && scoreOf(c));
  const audited = auditedCalls.length;
  const not_audited = uploaded - audited;
  const preparing = scopedCalls.filter((c) =>
    ["queued", "transcribing"].includes(c.status),
  ).length;
  const ready_to_audit = scopedCalls.filter((c) => c.status === "transcribed").length;
  const failed = scopedCalls.filter((c) => c.status === "failed").length;

  const scores = auditedCalls.map((c) => scoreOf(c)!);
  const avg_score = avg(scores.map((s) => s.overall_score));

  const durations = scopedCalls
    .map((c) => Number(c.duration_seconds))
    .filter((n) => Number.isFinite(n) && n > 0);
  const total_handling_seconds = Math.round(durations.reduce((sum, n) => sum + n, 0));
  const avg_handling_seconds = durations.length
    ? Math.round(total_handling_seconds / durations.length)
    : null;

  const compliance_clean = scores.filter((s) => isCleanCompliance(s.compliance_findings)).length;
  const compliance_issues = audited - compliance_clean;
  const compliance_rate =
    audited > 0 ? Math.round((compliance_clean / audited) * 100) : null;

  const documents_audits = scores.filter((s) => s.audit_mode === "documents").length;
  const automatic_audits = scores.filter((s) => s.audit_mode === "automatic").length;

  const verdicts = {
    excellent: scores.filter((s) => s.verdict === "excellent").length,
    good: scores.filter((s) => s.verdict === "good").length,
    needs_improvement: scores.filter((s) => s.verdict === "needs_improvement").length,
    poor: scores.filter((s) => s.verdict === "poor").length,
  };

  const dimensions = {
    greeting: dimAvg(scores, "greeting"),
    empathy: dimAvg(scores, "empathy"),
    professionalism: dimAvg(scores, "professionalism"),
    resolution: dimAvg(scores, "resolution"),
    communication: dimAvg(scores, "communication"),
    language_handling: dimAvg(scores, "language_handling"),
  };

  const languageCounts = new Map<string, number>();
  for (const call of scopedCalls) {
    const label = (call.detected_language || call.language_mode || "unknown").toUpperCase();
    languageCounts.set(label, (languageCounts.get(label) || 0) + 1);
  }
  const languages = [...languageCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const agentRows: AnalyticsAgentRow[] = scopedAgents
    .map((agent) => {
      const agentCalls = auditedCalls.filter((c) => c.agent_id === agent.id);
      const agentScores = agentCalls.map((c) => scoreOf(c)!);
      const handling = agentCalls
        .map((c) => Number(c.duration_seconds))
        .filter((n) => Number.isFinite(n) && n > 0)
        .reduce((sum, n) => sum + n, 0);
      const avgScore = avg(agentScores.map((s) => s.overall_score));
      return {
        id: agent.id,
        name: agent.name,
        call_count: agentScores.length,
        avg_score: avgScore,
        excellent: agentScores.filter((s) => s.verdict === "excellent").length,
        needs_coaching: agentScores.filter((s) =>
          (["needs_improvement", "poor"] as Verdict[]).includes(s.verdict as Verdict),
        ).length,
        compliance_clean: agentScores.filter((s) =>
          isCleanCompliance(s.compliance_findings),
        ).length,
        total_handling_seconds: Math.round(handling),
      };
    })
    .filter((row) => row.call_count > 0)
    .sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));

  if (activeFilters.includeUnassigned) {
    const unassignedCalls = auditedCalls.filter((c) => !c.agent_id);
    if (unassignedCalls.length) {
      const agentScores = unassignedCalls.map((c) => scoreOf(c)!);
      const handling = unassignedCalls
        .map((c) => Number(c.duration_seconds))
        .filter((n) => Number.isFinite(n) && n > 0)
        .reduce((sum, n) => sum + n, 0);
      agentRows.push({
        id: "unassigned",
        name: "Unassigned",
        call_count: agentScores.length,
        avg_score: avg(agentScores.map((s) => s.overall_score)),
        excellent: agentScores.filter((s) => s.verdict === "excellent").length,
        needs_coaching: agentScores.filter((s) =>
          (["needs_improvement", "poor"] as Verdict[]).includes(s.verdict as Verdict),
        ).length,
        compliance_clean: agentScores.filter((s) =>
          isCleanCompliance(s.compliance_findings),
        ).length,
        total_handling_seconds: Math.round(handling),
      });
      agentRows.sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));
    }
  }

  const top_performers = agentRows
    .filter((row) => row.call_count > 0 && (row.avg_score ?? 0) >= 70)
    .slice(0, 5);

  const coaching_needed = [...agentRows]
    .filter(
      (row) =>
        row.call_count > 0 &&
        ((row.avg_score != null && row.avg_score < 70) || row.needs_coaching > 0),
    )
    .sort((a, b) => (a.avg_score ?? 101) - (b.avg_score ?? 101))
    .slice(0, 5);

  const top =
    top_performers.length > 0
      ? top_performers
      : agentRows.filter((r) => r.avg_score != null).slice(0, 5);

  let agent_label = "All agents";
  let agent_count: number | "all" = "all";
  if (agentFilterOn) {
    const names = scopedAgents.map((a) => a.name);
    if (activeFilters.includeUnassigned) names.push("Unassigned");
    agent_count = names.length;
    agent_label =
      names.length === 0
        ? "No agents selected"
        : names.length <= 3
          ? names.join(", ")
          : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  }

  return {
    uploaded,
    audited,
    not_audited,
    preparing,
    ready_to_audit,
    failed,
    avg_score,
    avg_handling_seconds,
    total_handling_seconds,
    compliance_rate,
    compliance_clean,
    compliance_issues,
    documents_audits,
    automatic_audits,
    verdicts,
    dimensions,
    languages,
    top_performers: top,
    coaching_needed,
    agents: agentRows,
    filter: {
      period: activeFilters.period,
      period_label: range.period_label,
      range_start: range.range_start,
      range_end: range.range_end,
      agent_label,
      agent_count,
    },
  };
}
