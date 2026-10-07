import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { agentLabel, formatAht, formatDate, formatDuration, languageLabel } from "@/lib/format";
import { fetchAllRows } from "@/lib/fetch-all";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { complianceFollowRateFromScore, rollupComplianceRate } from "@/lib/compliance-engine";
import { JoinRequestBanner } from "@/components/join-request-banner";
import { QaMixCharts, QaTrendCharts } from "@/components/qa-chart-grid";
import { KpiStrip, PageHeader, scoreChipClass } from "@/components/ui";
import {
  autoQualityBuckets,
  calendarDay,
  dayKeys,
  isQualityRange,
  lastNDays,
  qualityBuckets,
  QUALITY_RANGES,
  type QualityRange,
} from "@/lib/workspace-charts";

const Icons = {
  emptyBox: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

function formatTotalTime(seconds: number) {
  if (!seconds || seconds <= 0) return "0 mins";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} mins`;
}

function scoredAt(call: { completed_at?: string | null; created_at: string }) {
  return call.completed_at || call.created_at;
}

function scoreOf(call: Call & { call_scores?: CallScore[] | CallScore | null }) {
  const raw = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
  if (!raw) return null;
  const overall = Number(raw.overall_score);
  if (!Number.isFinite(overall)) return null;
  return { ...raw, overall_score: overall };
}

function parseOverviewRange(value?: string): QualityRange | "all" {
  if (!value || value === "all") return "all";
  const requested = Number(value);
  return isQualityRange(requested) ? requested : "all";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = parseOverviewRange(range);

  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const page = await fetchAllRows<Call & { call_scores?: CallScore[] | CallScore | null }>((from, to) =>
    supabase
      .from("calls")
      .select("*, agents(name), call_scores(*)")
      .in("user_id", teamScope)
      .order("created_at", { ascending: false })
      .range(from, to),
  );
  if (page.error) throw new Error(page.error.message);

  const allCalls = page.data;
  const inRange =
    days === "all" ? null : new Set(lastNDays(days));
  const rangeCalls = inRange
    ? allCalls.filter((call) => inRange.has(calendarDay(scoredAt(call))))
    : allCalls;
  const completedCalls = rangeCalls.filter((call) => call.status === "completed");

  const scoreObjects = completedCalls.map((call) => scoreOf(call)).filter((score): score is CallScore => Boolean(score));

  const scoreValues = scoreObjects.map((score) => score.overall_score);
  const avgScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, n) => sum + n, 0) / scoreValues.length)
    : null;
  const passedCalls = scoreValues.filter((score) => score >= 70).length;
  const passRate = scoreValues.length ? Math.round((passedCalls / scoreValues.length) * 100) : null;

  const handleDurations = completedCalls
    .map((call) => Number(call.duration_seconds))
    .filter((n) => Number.isFinite(n) && n > 0);
  const totalAudioSeconds = handleDurations.reduce((acc, n) => acc + n, 0);
  const ahtSeconds = handleDurations.length ? Math.round(totalAudioSeconds / handleDurations.length) : null;

  const complianceRate = rollupComplianceRate(
    scoreObjects.map((score) => {
      const rate = complianceFollowRateFromScore(score);
      return { passed: rate.passed, failed: rate.failed };
    }),
  );

  const agentLeaderboard = rankByAgentId(rangeCalls);
  const rangeText = days === "all" ? "All time" : `Last ${days} days`;
  const points = completedCalls.flatMap((call) => {
    const score = scoreOf(call);
    if (!score) return [];
    return [{ at: scoredAt(call), score: score.overall_score }];
  });
  const windowDays = days === "all" ? [] : lastNDays(days);
  const buckets =
    days === "all"
      ? autoQualityBuckets(points)
      : qualityBuckets({
          keys: dayKeys(windowDays[0] || calendarDay(new Date()), windowDays[windowDays.length - 1] || calendarDay(new Date())),
          points,
          keyOf: (iso) => calendarDay(iso),
        });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Overview"
        description="Call quality and handling time in this workspace."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/dashboard"
              className={`pill ${days === "all" ? "pill-active" : "pill-inactive"}`}
            >
              All
            </Link>
            {QUALITY_RANGES.map((option) => (
              <Link
                key={option}
                href={`/dashboard?range=${option}`}
                className={`pill ${option === days ? "pill-active" : "pill-inactive"}`}
              >
                {option} days
              </Link>
            ))}
          </div>
        }
      />

      <JoinRequestBanner />

      <KpiStrip
        items={[
          {
            label: "Quality score",
            value: avgScore != null ? `${avgScore}%` : "—",
            hint: passRate != null ? `${passRate}% pass rate (≥70)` : "No scored calls yet",
            featured: true,
          },
          {
            label: "Audited calls",
            value: String(completedCalls.length),
            hint: `${formatTotalTime(totalAudioSeconds)} evaluated audio`,
          },
          {
            label: "Compliance followed",
            value: complianceRate.followed_pct != null ? `${complianceRate.followed_pct}%` : "—",
            hint:
              complianceRate.not_followed_pct != null
                ? `${complianceRate.not_followed_pct}% not followed`
                : "No company rules checked",
          },
          {
            label: "Avg handle time",
            value: formatAht(ahtSeconds),
            hint: "Per audited call",
          },
        ]}
      />

      <QaTrendCharts
        labels={buckets.map((row) => row.label)}
        avgScores={buckets.map((row) => row.avg)}
        calls={buckets.map((row) => row.calls)}
        rangeText={rangeText}
      />

      <QaMixCharts
        excellent={scoreValues.filter((score) => score >= 85).length}
        good={scoreValues.filter((score) => score >= 70 && score < 85).length}
        review={scoreValues.filter((score) => score >= 50 && score < 70).length}
        poor={scoreValues.filter((score) => score < 50).length}
        agentRows={agentLeaderboard.slice(0, 8).map((row) => ({
          key: row.id,
          label: row.name,
          value: row.avg_score ?? 0,
          hint: `${row.call_count} ${row.call_count === 1 ? "call" : "calls"}`,
        }))}
      />

      <section className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Recent scores</h2>
            <p className="text-[12px] text-muted mt-0.5">Latest recordings in this window</p>
          </div>
          <Link href="/calls" className="btn btn-ghost text-[12px]">
            View all
          </Link>
        </div>

        <div className="divide-y divide-line md:hidden">
          {rangeCalls.slice(0, 8).map((call) => {
            const score = scoreOf(call);
            const rate = score ? complianceFollowRateFromScore(score) : null;
            return (
              <Link
                key={call.id}
                href={score ? `/upload/score/${call.id}` : `/upload/prepare/${call.id}`}
                className="block px-5 py-4 hover:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink tabular-nums">{agentLabel(call)}</p>
                    <p className="mt-1 text-[12px] text-muted">
                      {formatDate(scoredAt(call))} · {languageLabel(call.detected_language || call.language_mode)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {score?.overall_score != null ? (
                      <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                        {score.overall_score}%
                      </span>
                    ) : (
                      <span className="chip">{call.status === "failed" ? "Failed" : "Processing"}</span>
                    )}
                    <p className="mt-1 text-[11px] text-muted">
                      {rate?.followed_pct != null ? `${rate.followed_pct}% followed` : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
          {!rangeCalls.length ? (
            <div className="py-12 text-center px-5">
              <h3 className="text-[14px] font-semibold text-ink">No call records</h3>
              <p className="mt-1 text-[13px] text-muted">Upload recordings to start quality auditing.</p>
              <Link href="/upload" className="mt-4 btn btn-blue text-[13px] inline-flex">
                Upload calls
              </Link>
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-bg text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Agent</th>
                <th className="px-6 py-3">Scored</th>
                <th className="px-6 py-3">Language</th>
                <th className="px-6 py-3 text-right">Followed</th>
                <th className="px-6 py-3 text-right">QA Score</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[13px]">
              {rangeCalls.slice(0, 8).map((call) => {
                const score = scoreOf(call);
                const rate = score ? complianceFollowRateFromScore(score) : null;
                return (
                  <tr key={call.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-ink tabular-nums">{agentLabel(call)}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span>Duration: {formatDuration(call.duration_seconds)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-muted whitespace-nowrap text-[12px]">
                      {formatDate(scoredAt(call))}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="chip">
                        {languageLabel(call.detected_language || call.language_mode)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      {rate?.followed_pct != null ? (
                        <span className={`${scoreChipClass(rate.followed_pct)} tabular-nums`}>
                          {rate.followed_pct}%
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {score?.overall_score != null ? (
                        <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                          {score.overall_score}%
                        </span>
                      ) : (
                        <span className="chip">{call.status === "failed" ? "Failed" : "Processing"}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <Link
                        href={score ? `/upload/score/${call.id}` : `/upload/prepare/${call.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-[12px] text-[#04B6DA] hover:text-[#039EBE] transition-colors"
                      >
                        <span>{score ? "View Scorecard" : "View Progress"}</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!rangeCalls.length ? (
            <div className="py-16 text-center">
              <div className="inline-flex p-3 mb-3 text-muted">{Icons.emptyBox}</div>
              <h3 className="text-[14px] font-semibold text-ink">No calls yet</h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload a recording to start scoring.
              </p>
              <Link href="/upload" className="mt-4 btn btn-blue text-[13px] inline-flex">
                Upload calls
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function rankByAgentId(
  calls: Array<
    Call & {
      call_scores?: CallScore[] | CallScore | null;
    }
  >,
) {
  const groups = new Map<string, { id: string; name: string; scores: CallScore[] }>();

  for (const call of calls) {
    if (call.status !== "completed") continue;
    const score = scoreOf(call);
    if (!score || typeof score.overall_score !== "number") continue;
    const name = agentLabel(call);
    const key = name.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.scores.push(score);
    } else {
      groups.set(key, { id: call.id, name, scores: [score] });
    }
  }

  return [...groups.values()]
    .map((row) => ({
      id: row.id,
      name: row.name,
      call_count: row.scores.length,
      avg_score: Math.round(row.scores.reduce((sum, score) => sum + score.overall_score, 0) / row.scores.length),
    }))
    .sort((a, b) => b.avg_score - a.avg_score);
}
