import { verdictLabel } from "@/lib/format";
import type { AuditMode, Verdict } from "@/lib/types";

export const REPORT_PERIODS = ["daily", "weekly", "monthly", "annually"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export const REPORT_TZ = "Africa/Nairobi";

export type ReportCallRow = {
  call_id: string;
  title: string;
  agent_id: string | null;
  agent_name: string;
  audited_at: string;
  overall_score: number;
  greeting: number | null;
  empathy: number | null;
  professionalism: number | null;
  resolution: number | null;
  communication: number | null;
  language_handling: number | null;
  verdict: Verdict | string;
  customer_sentiment: string | null;
  audit_mode: AuditMode | string | null;
  summary: string | null;
  compliance_findings: string[];
};

export type ReportAgentRow = {
  agent_id: string | null;
  agent_name: string;
  call_count: number;
  avg_score: number | null;
  excellent: number;
  good: number;
  needs_improvement: number;
  poor: number;
  compliance_calls: number;
  compliance_findings: number;
};

export type ReportComplianceRow = {
  call_id: string;
  title: string;
  agent_name: string;
  audited_at: string;
  finding: string;
};

export type QaReport = {
  generated_at: string;
  period: ReportPeriod;
  period_label: string;
  range_start: string;
  range_end: string;
  agent_id: string | null;
  agent_label: string;
  summary: {
    calls_audited: number;
    avg_overall: number | null;
    avg_greeting: number | null;
    avg_empathy: number | null;
    avg_professionalism: number | null;
    avg_resolution: number | null;
    avg_communication: number | null;
    avg_language_handling: number | null;
    excellent: number;
    good: number;
    needs_improvement: number;
    poor: number;
    calls_with_compliance_issue: number;
    total_compliance_findings: number;
    documents_audits: number;
    automatic_audits: number;
  };
  calls: ReportCallRow[];
  agents: ReportAgentRow[];
  compliance: ReportComplianceRow[];
};

export function isReportPeriod(value: string | null): value is ReportPeriod {
  return REPORT_PERIODS.includes(value as ReportPeriod);
}

export function parseReportQuery(url: URL) {
  const periodRaw = url.searchParams.get("period") || "monthly";
  const period = isReportPeriod(periodRaw) ? periodRaw : null;
  const dateRaw = url.searchParams.get("date") || todayInNairobi();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : todayInNairobi();
  const agentParam = url.searchParams.get("agentId");
  const agentId = agentParam && agentParam !== "all" ? agentParam : null;
  return { period, date, agentId };
}

export function todayInNairobi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseYmd(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function ymdString(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function addCalendarDays(y: number, m: number, d: number, days: number) {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

function nairobiStartIso(y: number, m: number, d: number) {
  return `${ymdString(y, m, d)}T00:00:00+03:00`;
}

export function periodRange(period: ReportPeriod, date: string) {
  const parsed = parseYmd(date) || parseYmd(todayInNairobi())!;
  let start = parsed;
  let endExclusive = addCalendarDays(parsed.y, parsed.m, parsed.d, 1);
  let period_label = "";

  if (period === "daily") {
    period_label = `Daily · ${ymdString(parsed.y, parsed.m, parsed.d)}`;
  } else if (period === "weekly") {
    const weekday = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    start = addCalendarDays(parsed.y, parsed.m, parsed.d, -mondayOffset);
    endExclusive = addCalendarDays(start.y, start.m, start.d, 7);
    const last = addCalendarDays(endExclusive.y, endExclusive.m, endExclusive.d, -1);
    period_label = `Weekly · ${ymdString(start.y, start.m, start.d)} to ${ymdString(last.y, last.m, last.d)}`;
  } else if (period === "monthly") {
    start = { y: parsed.y, m: parsed.m, d: 1 };
    endExclusive =
      parsed.m === 12 ? { y: parsed.y + 1, m: 1, d: 1 } : { y: parsed.y, m: parsed.m + 1, d: 1 };
    period_label = `Monthly · ${new Intl.DateTimeFormat("en-KE", {
      month: "long",
      year: "numeric",
      timeZone: REPORT_TZ,
    }).format(new Date(`${ymdString(parsed.y, parsed.m, 1)}T12:00:00+03:00`))}`;
  } else {
    start = { y: parsed.y, m: 1, d: 1 };
    endExclusive = { y: parsed.y + 1, m: 1, d: 1 };
    period_label = `Annual · ${parsed.y}`;
  }

  const last = addCalendarDays(endExclusive.y, endExclusive.m, endExclusive.d, -1);
  return {
    startIso: nairobiStartIso(start.y, start.m, start.d),
    endIso: nairobiStartIso(endExclusive.y, endExclusive.m, endExclusive.d),
    period_label,
    range_start: ymdString(start.y, start.m, start.d),
    range_end: ymdString(last.y, last.m, last.d),
  };
}

export function reportFileStem(report: QaReport) {
  const agent = report.agent_id
    ? report.agent_label.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")
    : "all-agents";
  return `zetro-${report.period}-${report.range_start}-${agent}`.toLowerCase();
}

export function realComplianceFindings(value: unknown): string[] {
  const list = Array.isArray(value) ? value.map((item) => String(item).trim()) : [];
  return list.filter((item) => {
    const n = item.toLowerCase();
    return item && n !== "none identified" && n !== "none" && n !== "n/a";
  });
}

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (!nums.length) return null;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

type CallRecord = {
  id: string;
  title: string | null;
  agent_id: string | null;
  created_at: string;
  completed_at: string | null;
  agents?: { name?: string } | { name?: string }[] | null;
  call_scores?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function scoreOf(call: CallRecord) {
  const raw = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
  return raw || null;
}

function agentNameOf(call: CallRecord) {
  const agent = Array.isArray(call.agents) ? call.agents[0] : call.agents;
  return agent?.name || "Unassigned";
}

function inRange(iso: string, startIso: string, endIso: string) {
  const t = new Date(iso).getTime();
  return t >= new Date(startIso).getTime() && t < new Date(endIso).getTime();
}

export function buildQaReport(
  calls: CallRecord[],
  opts: {
    period: ReportPeriod;
    date: string;
    agentId: string | null;
    agentLabel: string;
  },
): QaReport {
  const range = periodRange(opts.period, opts.date);
  const rows: ReportCallRow[] = calls
    .map((call) => {
      const score = scoreOf(call);
      if (!score || typeof score.overall_score !== "number") return null;
      const auditedAt = call.completed_at || score.created_at || call.created_at;
      if (typeof auditedAt !== "string" || !inRange(auditedAt, range.startIso, range.endIso)) {
        return null;
      }
      if (opts.agentId && call.agent_id !== opts.agentId) return null;
      const findings = realComplianceFindings(score.compliance_findings);
      return {
        call_id: call.id,
        title: call.title || "Untitled call",
        agent_id: call.agent_id,
        agent_name: agentNameOf(call),
        audited_at: auditedAt,
        overall_score: Number(score.overall_score),
        greeting: score.greeting == null ? null : Number(score.greeting),
        empathy: score.empathy == null ? null : Number(score.empathy),
        professionalism: score.professionalism == null ? null : Number(score.professionalism),
        resolution: score.resolution == null ? null : Number(score.resolution),
        communication: score.communication == null ? null : Number(score.communication),
        language_handling: score.language_handling == null ? null : Number(score.language_handling),
        verdict: String(score.verdict || ""),
        customer_sentiment: score.customer_sentiment ? String(score.customer_sentiment) : null,
        audit_mode: score.audit_mode ? String(score.audit_mode) : null,
        summary: score.summary ? String(score.summary) : null,
        compliance_findings: findings,
      } satisfies ReportCallRow;
    })
    .filter((row): row is ReportCallRow => Boolean(row))
    .sort((a, b) => b.audited_at.localeCompare(a.audited_at));

  const compliance: ReportComplianceRow[] = rows.flatMap((row) =>
    row.compliance_findings.map((finding) => ({
      call_id: row.call_id,
      title: row.title,
      agent_name: row.agent_name,
      audited_at: row.audited_at,
      finding,
    })),
  );

  const byAgent = new Map<string, ReportCallRow[]>();
  for (const row of rows) {
    const key = row.agent_id || "unassigned";
    const list = byAgent.get(key) || [];
    list.push(row);
    byAgent.set(key, list);
  }

  const agents: ReportAgentRow[] = [...byAgent.entries()]
    .map(([key, list]) => ({
      agent_id: key === "unassigned" ? null : key,
      agent_name: list[0]?.agent_name || "Unassigned",
      call_count: list.length,
      avg_score: avg(list.map((r) => r.overall_score)),
      excellent: list.filter((r) => r.verdict === "excellent").length,
      good: list.filter((r) => r.verdict === "good").length,
      needs_improvement: list.filter((r) => r.verdict === "needs_improvement").length,
      poor: list.filter((r) => r.verdict === "poor").length,
      compliance_calls: list.filter((r) => r.compliance_findings.length > 0).length,
      compliance_findings: list.reduce((sum, r) => sum + r.compliance_findings.length, 0),
    }))
    .sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));

  return {
    generated_at: new Date().toISOString(),
    period: opts.period,
    period_label: range.period_label,
    range_start: range.range_start,
    range_end: range.range_end,
    agent_id: opts.agentId,
    agent_label: opts.agentLabel,
    summary: {
      calls_audited: rows.length,
      avg_overall: avg(rows.map((r) => r.overall_score)),
      avg_greeting: avg(rows.map((r) => r.greeting)),
      avg_empathy: avg(rows.map((r) => r.empathy)),
      avg_professionalism: avg(rows.map((r) => r.professionalism)),
      avg_resolution: avg(rows.map((r) => r.resolution)),
      avg_communication: avg(rows.map((r) => r.communication)),
      avg_language_handling: avg(rows.map((r) => r.language_handling)),
      excellent: rows.filter((r) => r.verdict === "excellent").length,
      good: rows.filter((r) => r.verdict === "good").length,
      needs_improvement: rows.filter((r) => r.verdict === "needs_improvement").length,
      poor: rows.filter((r) => r.verdict === "poor").length,
      calls_with_compliance_issue: rows.filter((r) => r.compliance_findings.length > 0).length,
      total_compliance_findings: compliance.length,
      documents_audits: rows.filter((r) => r.audit_mode === "documents").length,
      automatic_audits: rows.filter((r) => r.audit_mode === "automatic").length,
    },
    calls: rows,
    agents,
    compliance,
  };
}

export function formatReportDate(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: REPORT_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function auditModeLabel(mode: string | null | undefined) {
  if (mode === "automatic") return "Automatic";
  if (mode === "documents") return "Documents";
  return "—";
}

export function scoreLabel(score: number | null | undefined) {
  return score == null ? "—" : String(score);
}

export function verdictCell(verdict: string) {
  return verdictLabel(verdict as Verdict);
}

export async function loadQaReport(
  supabase: { from: (table: string) => any },
  userId: string,
  period: ReportPeriod,
  date: string,
  agentId: string | null,
): Promise<QaReport> {
  const callsQuery = supabase
    .from("calls")
    .select("id, title, agent_id, created_at, completed_at, status, agents(name), call_scores(*)")
    .eq("user_id", userId)
    .eq("status", "completed");

  const agentsQuery = supabase.from("agents").select("id, name").eq("user_id", userId);

  const [{ data: calls, error: callError }, { data: agents, error: agentError }] = await Promise.all([
    callsQuery,
    agentsQuery,
  ]);

  if (callError) throw new Error(callError.message);
  if (agentError) throw new Error(agentError.message);

  const agentRows = (agents || []) as { id: string; name: string }[];
  const agentLabel = agentId
    ? agentRows.find((row) => row.id === agentId)?.name || "Selected agent"
    : "All agents";

  if (agentId && !agentRows.some((row) => row.id === agentId)) {
    throw new Error("Agent not found.");
  }

  return buildQaReport((calls || []) as CallRecord[], {
    period,
    date,
    agentId,
    agentLabel,
  });
}

