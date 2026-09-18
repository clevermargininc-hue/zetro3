import type {
  QaBriefing,
  QaReport,
  ReportAgentRow,
  ReportCallRow,
  ReportComplianceRow,
  ReportDelta,
} from "@/lib/reports";
import type { CustomerVoiceThemeRow } from "@/lib/customer-voice";

function delta(current: number | null | undefined, previous: number | null | undefined): ReportDelta {
  const cur = current == null || Number.isNaN(Number(current)) ? null : Number(current);
  const prev = previous == null || Number.isNaN(Number(previous)) ? null : Number(previous);
  return {
    current: cur,
    previous: prev,
    delta: cur == null || prev == null ? null : cur - prev,
  };
}

function clusterThemes(
  rows: CustomerVoiceThemeRow[],
  kind: "satisfaction" | "frustration",
): QaBriefing["customer_themes"] {
  const map = new Map<string, { theme: string; count: number; quote: string; call_id: string }>();
  for (const row of rows) {
    const labels = row.themes.length ? row.themes : row.note ? [row.note] : [];
    for (const raw of labels) {
      const theme = raw.replace(/\s+/g, " ").trim();
      if (!theme) continue;
      const key = theme.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.quote && row.quote) {
          existing.quote = row.quote;
          existing.call_id = row.call_id;
        }
      } else {
        map.set(key, {
          theme,
          count: 1,
          quote: row.quote || "",
          call_id: row.call_id,
        });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))
    .slice(0, 6)
    .map((row) => ({ ...row, kind }));
}

function clusterComplianceRules(rows: ReportComplianceRow[]): QaBriefing["compliance_rules"] {
  const map = new Map<
    string,
    { rule: string; file_name: string; count: number; severity: ReportComplianceRow["severity"]; example: string; call_id: string }
  >();
  for (const row of rows) {
    const rule = (row.rule || row.finding).replace(/\s+/g, " ").trim();
    if (!rule) continue;
    const key = `${rule.toLowerCase()}|${(row.file_name || "").toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.example && row.finding) existing.example = row.finding;
    } else {
      map.set(key, {
        rule,
        file_name: row.file_name || "",
        count: 1,
        severity: row.severity,
        example: row.finding || row.quote || "",
        call_id: row.call_id,
      });
    }
  }
  const rank: Record<string, number> = { critical: 0, major: 1, minor: 2, "": 3 };
  return [...map.values()]
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3);
    })
    .slice(0, 8);
}

function coachReason(agent: ReportAgentRow) {
  if (agent.compliance_not_followed_pct != null && agent.compliance_not_followed_pct > 0) {
    return `Compliance followed ${agent.compliance_followed_pct}%, not followed ${agent.compliance_not_followed_pct}%`;
  }
  if (agent.avg_score != null && agent.avg_score < 70) {
    return `Average ${agent.avg_score}% across ${agent.call_count} call${agent.call_count === 1 ? "" : "s"}`;
  }
  const weak = agent.needs_improvement + agent.poor;
  return `${weak} call${weak === 1 ? "" : "s"} marked needs improvement or poor`;
}

function reviewReason(call: ReportCallRow) {
  if (call.compliance_not_followed_pct != null && call.compliance_not_followed_pct > 0) {
    return `Compliance followed ${call.compliance_followed_pct}%, not followed ${call.compliance_not_followed_pct}%`;
  }
  if (call.overall_score < 70) return `Scored ${call.overall_score}%`;
  return String(call.verdict || "Needs a second look").replace(/_/g, " ");
}

function headline(report: QaReport, _previous: QaReport | null, scoreDelta: number | null) {
  const n = report.summary.calls_audited;
  if (!n) {
    return `No scored calls in ${report.period_label}.`;
  }
  const score =
    report.summary.avg_overall != null ? `Average score ${report.summary.avg_overall}%` : "Scores are in";
  const vs =
    scoreDelta == null
      ? `on ${n} audit${n === 1 ? "" : "s"}`
      : scoreDelta === 0
        ? `unchanged vs the previous period (${n} audits)`
        : scoreDelta > 0
          ? `up ${scoreDelta} vs the previous period (${n} audits)`
          : `down ${Math.abs(scoreDelta)} vs the previous period (${n} audits)`;
  const followed = report.summary.compliance_followed_pct;
  const missed = report.summary.compliance_not_followed_pct;
  const risk =
    followed == null
      ? "No company compliance rules were checked in this window."
      : missed && missed > 0
        ? `Company compliance followed ${followed}%, not followed ${missed}%.`
        : `Company compliance followed ${followed}%.`;
  return `${score} ${vs}. ${risk}`;
}

function attention(report: QaReport, coach: QaBriefing["coach_now"], review: QaBriefing["review_queue"]) {
  if (!report.summary.calls_audited) {
    return "Run documents audits on prepared calls, then come back — this briefing fills from scored calls only.";
  }
  if (coach.length) {
    const names = coach.slice(0, 3).map((row) => row.agent_name);
    const extra = coach.length > 3 ? ` and ${coach.length - 3} more` : "";
    return `Coach ${names.join(", ")}${extra} this period.`;
  }
  if (review.length) {
    return `Review ${review.length} weak or flagged call${review.length === 1 ? "" : "s"} before the next QA huddle.`;
  }
  return "Quality held. Keep the sample running and watch customer themes.";
}

export function buildQaBriefing(report: QaReport, previous: QaReport | null): QaBriefing {
  const s = report.summary;
  const p = previous?.summary;
  const deltas = {
    avg_overall: delta(s.avg_overall, p?.avg_overall),
    calls_audited: delta(s.calls_audited, p?.calls_audited ?? 0),
    compliance_findings: delta(s.total_compliance_findings, p?.total_compliance_findings ?? 0),
    compliance_followed: delta(s.compliance_followed_pct, p?.compliance_followed_pct),
    frustrated_pct: delta(s.customer_frustrated_pct, p?.customer_frustrated_pct),
  };

  const weakest_parameters = (
    [
      ["Greeting & identity", s.avg_greeting],
      ["Empathy", s.avg_empathy],
      ["Professional demeanor", s.avg_professionalism],
      ["Issue resolution", s.avg_resolution],
      ["Communication", s.avg_communication],
      ["Language mix", s.avg_language_handling],
    ] as [string, number | null][]
  )
    .filter((row): row is [string, number] => row[1] != null)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([name, avg]) => ({ name, avg }));

  const coach_now = report.agents
    .filter((agent) => {
      if (!agent.call_count) return false;
      const weakCalls = agent.needs_improvement + agent.poor;
      return (
        (agent.compliance_not_followed_pct ?? 0) > 0 ||
        (agent.avg_score != null && agent.avg_score < 70) ||
        weakCalls > 0
      );
    })
    .sort((a, b) => {
      const missedA = a.compliance_not_followed_pct ?? 0;
      const missedB = b.compliance_not_followed_pct ?? 0;
      if (missedB !== missedA) return missedB - missedA;
      return (a.avg_score ?? 101) - (b.avg_score ?? 101);
    })
    .slice(0, 5)
    .map((agent) => ({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      avg_score: agent.avg_score,
      call_count: agent.call_count,
      compliance_findings: agent.compliance_findings,
      reason: coachReason(agent),
    }));

  const review_queue = report.calls
    .filter(
      (call) =>
        (call.compliance_not_followed_pct ?? 0) > 0 ||
        call.overall_score < 70 ||
        call.verdict === "poor" ||
        call.verdict === "needs_improvement",
    )
    .sort((a, b) => {
      const missedA = a.compliance_not_followed_pct ?? 0;
      const missedB = b.compliance_not_followed_pct ?? 0;
      if (missedB !== missedA) return missedB - missedA;
      return a.overall_score - b.overall_score;
    })
    .slice(0, 8)
    .map((call) => ({
      call_id: call.call_id,
      title: call.title,
      agent_name: call.agent_name,
      overall_score: call.overall_score,
      reason: reviewReason(call),
    }));

  const frustrations = clusterThemes(report.customer_voice.frustrations, "frustration");
  const satisfactions = clusterThemes(report.customer_voice.satisfactions, "satisfaction");
  const customer_themes = [...frustrations, ...satisfactions]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "frustration" ? -1 : 1;
      return b.count - a.count;
    })
    .slice(0, 8);

  return {
    headline: headline(report, previous, deltas.avg_overall.delta),
    attention: attention(report, coach_now, review_queue),
    previous_period_label: previous?.period_label ?? null,
    deltas,
    weakest_parameters,
    coach_now,
    review_queue,
    customer_themes,
    compliance_rules: clusterComplianceRules(report.compliance),
  };
}
