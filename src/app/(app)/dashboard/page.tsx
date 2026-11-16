import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { agentLabel, formatAht, pipelineQueueCounts } from "@/lib/format";
import { fetchAllRows } from "@/lib/fetch-all";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { complianceFollowRateFromScore, rollupComplianceRate } from "@/lib/compliance-engine";
import {
  computeOverviewMetrics,
  extractCustomerSentimentSummary,
  extractTopOverviewGaps,
  serializeOverviewCalls,
} from "@/lib/overview-analytics";
import { JoinRequestBanner } from "@/components/join-request-banner";
import { OverviewInteractiveBoard } from "@/components/overview-interactive-board";
import { QaMixCharts, QaTrendCharts } from "@/components/qa-chart-grid";
import { KpiStrip, PageHeader } from "@/components/ui";
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

  const overviewMetrics = computeOverviewMetrics({ allCalls, days });
  const overviewGaps = extractTopOverviewGaps(rangeCalls, 6);
  const sentimentSummary = extractCustomerSentimentSummary(rangeCalls);
  const serializedCalls = serializeOverviewCalls(rangeCalls, 200);
  const queueCounts = pipelineQueueCounts(allCalls.map((c) => c.status));
  const failedCallsCount = allCalls.filter((c) => c.status === "failed").length;
  const hasActiveJobs = queueCounts.prepare > 0 || queueCounts.score > 0;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Enterprise QA & Operations"
        title="Overview"
        description="Call quality, compliance adherence, and customer intelligence across your workspace."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-1">
              <Link
                href="/dashboard"
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  days === "all"
                    ? "bg-[#0A1A3F] text-white shadow-2xs"
                    : "text-[#5A6882] hover:bg-white hover:text-[#0A1A3F]"
                }`}
              >
                All
              </Link>
              {QUALITY_RANGES.map((option) => (
                <Link
                  key={option}
                  href={`/dashboard?range=${option}`}
                  className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    option === days
                      ? "bg-[#0A1A3F] text-white shadow-2xs"
                      : "text-[#5A6882] hover:bg-white hover:text-[#0A1A3F]"
                  }`}
                >
                  {option}d
                </Link>
              ))}
            </div>
            <Link href="/upload" className="btn btn-blue text-[12.5px]">
              Upload calls
            </Link>
          </div>
        }
      />

      <JoinRequestBanner />

      {(hasActiveJobs || failedCallsCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#BFDBFE] bg-[#EEF3FF]/70 px-4 py-3 text-[13px] text-[#0A1A3F]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2459E8]" />
            <span className="font-semibold">Pipeline activity:</span>
            {queueCounts.prepare > 0 ? (
              <span className="chip chip-info text-[11.5px]">
                {queueCounts.prepare} preparing / transcribing
              </span>
            ) : null}
            {queueCounts.score > 0 ? (
              <span className="chip chip-info text-[11.5px]">{queueCounts.score} scoring</span>
            ) : null}
            {failedCallsCount > 0 ? (
              <span className="chip chip-bad text-[11.5px]">{failedCallsCount} failed</span>
            ) : null}
          </div>
          <Link href="/calls" className="text-[12.5px] font-semibold text-[#2459E8] hover:underline">
            Manage queue in Calls →
          </Link>
        </div>
      )}

      <KpiStrip
        items={[
          {
            label: "Quality score",
            value: avgScore != null ? `${avgScore}%` : "—",
            delta: overviewMetrics.deltas.score,
            hint: passRate != null ? `${passRate}% pass rate (≥70%)` : "No scored calls yet",
          },
          {
            label: "Audited calls",
            value: String(completedCalls.length),
            delta: overviewMetrics.deltas.audited,
            hint: `${formatTotalTime(totalAudioSeconds)} evaluated audio`,
          },
          {
            label: "Compliance followed",
            value: complianceRate.followed_pct != null ? `${complianceRate.followed_pct}%` : "—",
            delta: overviewMetrics.deltas.compliance,
            hint:
              complianceRate.not_followed_pct != null
                ? `${complianceRate.not_followed_pct}% missed`
                : "No company rules checked",
          },
          {
            label: "Avg handle time",
            value: formatAht(ahtSeconds),
            delta: overviewMetrics.deltas.aht,
            hint: handleDurations.length
              ? `Across ${handleDurations.length} timed call${handleDurations.length === 1 ? "" : "s"}`
              : "Per audited call",
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

      <OverviewInteractiveBoard
        calls={serializedCalls}
        gaps={overviewGaps}
        sentiment={sentimentSummary}
        languageMix={overviewMetrics.current.languageMix}
        rangeLabel={rangeText}
        hasActiveJobs={hasActiveJobs}
        totalWorkspaceCalls={allCalls.length}
      />
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
