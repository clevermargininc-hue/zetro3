import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDuration, scoreTone, verdictLabel, languageLabel } from "@/lib/format";
import type { AgentPerformance, Call, CallScore } from "@/lib/types";
import { JoinRequestBanner } from "@/components/join-request-banner";

// Professional Enterprise SVG Icons
const Icons = {
  upload: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  analytics: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  document: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  shieldCheck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  arrowUpRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  emptyBox: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function formatTotalTime(seconds: number) {
  if (!seconds || seconds <= 0) return "0 mins";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} mins`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: calls }, { data: agents }] = await Promise.all([
    supabase
      .from("calls")
      .select("*, agents(name), call_scores(*)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.from("agents").select("id, name").eq("user_id", user!.id),
  ]);

  const allCalls = calls || [];
  const completedCalls = allCalls.filter((c) => c.status === "completed");
  const inProgressCalls = allCalls.filter((c) => c.status === "transcribing" || c.status === "analyzing" || c.status === "queued");

  // Extract valid scores
  const scoreObjects: CallScore[] = completedCalls
    .map((c) => (Array.isArray(c.call_scores) ? c.call_scores[0] : c.call_scores))
    .filter(Boolean) as CallScore[];

  const scoreValues = scoreObjects
    .map((s) => s.overall_score)
    .filter((n): n is number => typeof n === "number");

  const avgScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, n) => sum + n, 0) / scoreValues.length)
    : null;

  // Pass rate (Score >= 70%)
  const passedCalls = scoreValues.filter((s) => s >= 70).length;
  const passRate = scoreValues.length ? Math.round((passedCalls / scoreValues.length) * 100) : null;

  // Total evaluated talk time
  const totalAudioSeconds = completedCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);

  // Compliance metrics
  let totalBreaches = 0;
  let cleanCalls = 0;
  for (const s of scoreObjects) {
    const breaches = (s.compliance_findings || []).filter(
      (f) => f && f.toLowerCase() !== "none identified" && f.trim().length > 0
    );
    if (breaches.length > 0) {
      totalBreaches += breaches.length;
    } else {
      cleanCalls += 1;
    }
  }
  const compliancePassRate = scoreObjects.length
    ? Math.round((cleanCalls / scoreObjects.length) * 100)
    : null;

  // Quality distribution tiers
  const tierExcellent = scoreValues.filter((s) => s >= 85).length;
  const tierGood = scoreValues.filter((s) => s >= 70 && s < 85).length;
  const tierNeedsImp = scoreValues.filter((s) => s >= 50 && s < 70).length;
  const tierPoor = scoreValues.filter((s) => s < 50).length;

  // Dimension averages
  const calcDimAvg = (key: keyof CallScore) => {
    const vals = scoreObjects
      .map((s) => s[key])
      .filter((v): v is number => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const dimensions = [
    { label: "Greeting & Identity", value: calcDimAvg("greeting") },
    { label: "Empathy & Active Listening", value: calcDimAvg("empathy") },
    { label: "Professionalism & Demeanor", value: calcDimAvg("professionalism") },
    { label: "Issue Resolution & Next Steps", value: calcDimAvg("resolution") },
    { label: "Communication Clarity", value: calcDimAvg("communication") },
    { label: "Language Mix & Code-Switching", value: calcDimAvg("language_handling") },
  ];

  const agentLeaderboard = rankAgents(agents || [], allCalls);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line/60">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-blue/10 text-blue border border-blue/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" />
              Executive Dashboard
            </span>
            <span className="text-[12px] text-muted font-medium">Enterprise QA Suite</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Operations Overview</h1>
          <p className="mt-1 text-[13px] text-muted">
            Continuous visibility into call-center service standards, compliance adherence, and agent performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/analytics"
            className="btn bg-white hover:bg-slate-50 text-ink border border-line shadow-sm text-[13px] px-4 py-2"
          >
            {Icons.analytics}
            <span>Deep Analytics</span>
          </Link>
          <Link
            href="/upload"
            className="btn bg-blue hover:bg-blue-2 text-white shadow-sm text-[13px] px-5 py-2 font-semibold"
          >
            {Icons.upload}
            <span>Upload Call</span>
          </Link>
        </div>
      </div>

      <JoinRequestBanner />

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Team Quality Index */}
        <div className="bg-white rounded-xl p-5 border border-line/70 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quality Score Index</span>
              <span className="text-blue bg-blue/10 p-1.5 rounded-lg">{Icons.activity}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {avgScore != null ? `${avgScore}%` : "—"}
              </span>
              {avgScore != null && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    avgScore >= 80
                      ? "bg-good/10 text-good border-good/20"
                      : avgScore >= 60
                      ? "bg-warn/10 text-warn border-warn/20"
                      : "bg-rose/10 text-rose border-rose/20"
                  }`}
                >
                  {verdictLabel(scoreTone(avgScore))}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-muted">
            <span>Pass Rate (≥70%):</span>
            <span className="font-semibold text-ink">{passRate != null ? `${passRate}%` : "—"}</span>
          </div>
        </div>

        {/* Card 2: Audited Volume */}
        <div className="bg-white rounded-xl p-5 border border-line/70 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Audited Calls</span>
              <span className="text-blue bg-blue/10 p-1.5 rounded-lg">{Icons.document}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {completedCalls.length}
              </span>
              <span className="text-[12px] text-muted font-medium">calls scored</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-muted">
            <span>Evaluated Audio:</span>
            <span className="font-semibold text-ink">{formatTotalTime(totalAudioSeconds)}</span>
          </div>
        </div>

        {/* Card 3: Compliance Health */}
        <div className="bg-white rounded-xl p-5 border border-line/70 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Compliance Pass Rate</span>
              <span className="text-good bg-good/10 p-1.5 rounded-lg">{Icons.shieldCheck}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tracking-tight tabular-nums ${compliancePassRate && compliancePassRate < 90 ? 'text-warn' : 'text-good'}`}>
                {compliancePassRate != null ? `${compliancePassRate}%` : "—"}
              </span>
              <span className="text-[12px] text-muted font-medium">clean calls</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-muted">
            <span>Flagged Breaches:</span>
            <span className={`font-semibold ${totalBreaches > 0 ? 'text-rose' : 'text-slate-700'}`}>
              {totalBreaches} {totalBreaches === 1 ? "finding" : "findings"}
            </span>
          </div>
        </div>

        {/* Card 4: Active Workforce */}
        <div className="bg-white rounded-xl p-5 border border-line/70 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Workforce</span>
              <span className="text-slate-600 bg-slate-100 p-1.5 rounded-lg">{Icons.users}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {agents?.length || 0}
              </span>
              <span className="text-[12px] text-muted font-medium">agents tracked</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-muted">
            <span>In-Flight Processing:</span>
            <span className="font-semibold text-blue">{inProgressCalls.length} calls</span>
          </div>
        </div>
      </section>

      {/* Main Analysis Section (2 Columns) */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Quality Dimensions & Distribution (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dimension Performance Breakdown */}
          <div className="bg-white rounded-xl border border-line/70 shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-[15px] font-bold text-ink">Quality Dimensions Benchmark</h2>
                <p className="text-[12px] text-muted mt-0.5">Average scoring performance across the 6 enterprise pillars</p>
              </div>
              <Link href="/analytics" className="text-[12px] font-semibold text-blue hover:underline flex items-center gap-1">
                <span>Detailed metrics</span>
                {Icons.arrowUpRight}
              </Link>
            </div>

            <div className="p-6 space-y-4.5">
              {dimensions.map((dim) => {
                const val = dim.value;
                const toneColor =
                  val == null
                    ? "bg-slate-200"
                    : val >= 80
                    ? "bg-emerald-500"
                    : val >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500";

                return (
                  <div key={dim.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-slate-700">{dim.label}</span>
                      <span className="font-bold tabular-nums text-ink">
                        {val != null ? `${val}/100` : "—"}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${toneColor}`}
                        style={{ width: `${val ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quality Tier Distribution */}
          <div className="bg-white rounded-xl border border-line/70 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-ink">Evaluation Score Tier Distribution</h3>
                <p className="text-[12px] text-muted">Breakdown of calls across standard evaluation bands</p>
              </div>
              <span className="text-[12px] font-semibold text-slate-500">{scoreValues.length} total scored</span>
            </div>

            {/* Stacked Progress Bar */}
            {scoreValues.length > 0 ? (
              <div className="space-y-4">
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(tierExcellent / scoreValues.length) * 100}%` }}
                    title={`Excellent: ${tierExcellent}`}
                  />
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${(tierGood / scoreValues.length) * 100}%` }}
                    title={`Good: ${tierGood}`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${(tierNeedsImp / scoreValues.length) * 100}%` }}
                    title={`Needs Improvement: ${tierNeedsImp}`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all"
                    style={{ width: `${(tierPoor / scoreValues.length) * 100}%` }}
                    title={`Poor: ${tierPoor}`}
                  />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <span className="text-slate-600 block">Excellent (85+)</span>
                      <span className="font-bold text-ink">{tierExcellent} ({Math.round((tierExcellent / scoreValues.length) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <span className="text-slate-600 block">Good (70-84)</span>
                      <span className="font-bold text-ink">{tierGood} ({Math.round((tierGood / scoreValues.length) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <span className="text-slate-600 block">Review (50-69)</span>
                      <span className="font-bold text-ink">{tierNeedsImp} ({Math.round((tierNeedsImp / scoreValues.length) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <div>
                      <span className="text-slate-600 block">Poor (&lt;50)</span>
                      <span className="font-bold text-ink">{tierPoor} ({Math.round((tierPoor / scoreValues.length) * 100)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-muted text-[13px]">
                No evaluations available to compute tier distribution.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Agent Leaderboard (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-line/70 shadow-sm overflow-hidden h-full flex flex-col justify-between">
            <div>
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-[15px] font-bold text-ink">Agent Scorecard Ranking</h2>
                  <p className="text-[12px] text-muted mt-0.5">Top performing representatives</p>
                </div>
                <Link href="/leaderboard" className="text-[12px] font-semibold text-blue hover:underline">
                  Full Board →
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {agentLeaderboard.slice(0, 6).map((agent, index) => {
                  const rank = index + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  return (
                    <div
                      key={agent.id}
                      className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isTop1
                              ? "bg-slate-900 text-white"
                              : isTop2
                              ? "bg-slate-700 text-white"
                              : isTop3
                              ? "bg-slate-500 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          #{rank}
                        </div>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-bold shrink-0 ring-1 ring-slate-200">
                          {getInitials(agent.name)}
                        </div>

                        {/* Name & Call Count */}
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">{agent.name}</p>
                          <p className="text-[11px] text-muted">
                            {agent.call_count} {agent.call_count === 1 ? "audit" : "audits"} evaluated
                          </p>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-bold tabular-nums border ${
                            agent.avg_score != null
                              ? agent.avg_score >= 80
                                ? "bg-good/10 text-good border-good/20"
                                : agent.avg_score >= 60
                                ? "bg-warn/10 text-warn border-warn/20"
                                : "bg-rose/10 text-rose border-rose/20"
                              : "bg-slate-100 text-muted border-slate-200"
                          }`}
                        >
                          {agent.avg_score != null ? `${agent.avg_score}%` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {!agentLeaderboard.length && (
                  <div className="p-8 text-center">
                    <div className="inline-flex p-3 rounded-full bg-slate-50 mb-3">{Icons.emptyBox}</div>
                    <p className="text-[14px] font-semibold text-ink">No agent rankings yet</p>
                    <p className="text-[12px] text-muted mt-1 max-w-xs mx-auto">
                      Assign agents when uploading calls to automatically generate their performance scorecards.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
              <Link href="/leaderboard" className="text-[12px] font-semibold text-slate-700 hover:text-blue transition-colors">
                View detailed agent rankings & metrics →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Evaluated Calls Stream */}
      <section className="bg-white rounded-xl border border-line/70 shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Recent Call Audits</h2>
            <p className="text-[12px] text-muted mt-0.5">Recently processed recordings with evaluation scores</p>
          </div>
          <Link
            href="/calls"
            className="btn bg-white hover:bg-slate-50 text-slate-700 border border-line text-[12px] px-3.5 py-1.5 rounded-lg self-start sm:self-auto"
          >
            View All Call Logs →
          </Link>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Call Title / Recording</th>
                <th className="px-6 py-3">Assigned Agent</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Language</th>
                <th className="px-6 py-3">Compliance</th>
                <th className="px-6 py-3 text-right">QA Score</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {allCalls.slice(0, 8).map((call) => {
                const score = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
                const hasBreach = (score?.compliance_findings || []).some(
                  (f: string) => f && f.toLowerCase() !== "none identified" && f.trim().length > 0
                );

                return (
                  <tr key={call.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Title & Duration */}
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-ink line-clamp-1 max-w-xs">{call.title || call.file_name || "Audio Recording"}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span>Duration: {formatDuration(call.duration_seconds)}</span>
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getInitials(call.agents?.name || "Unassigned")}
                        </div>
                        <span className="font-medium text-slate-700 text-[13px]">
                          {call.agents?.name || <span className="text-slate-400 italic">Unassigned</span>}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap text-[12px]">
                      {formatDate(call.created_at)}
                    </td>

                    {/* Language */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {languageLabel(call.detected_language || call.language_mode)}
                      </span>
                    </td>

                    {/* Compliance */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {score ? (
                        hasBreach ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose bg-rose/10 px-2 py-0.5 rounded border border-rose/20">
                            Flagged Breach
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-good bg-good/10 px-2 py-0.5 rounded border border-good/20">
                            Clean
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* QA Score */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {score?.overall_score != null ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-[13px] tabular-nums border ${
                            score.overall_score >= 80
                              ? "bg-good/10 text-good border-good/20"
                              : score.overall_score >= 60
                              ? "bg-warn/10 text-warn border-warn/20"
                              : "bg-rose/10 text-rose border-rose/20"
                          }`}
                        >
                          {score.overall_score}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px] font-medium">
                          {call.status === "failed" ? "Failed" : "Processing"}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <Link
                        href={score ? `/calls/${call.id}/score` : `/calls/${call.id}/transcribe`}
                        className="inline-flex items-center gap-1 font-semibold text-[12px] text-blue hover:text-blue-2 transition-colors"
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

          {!allCalls.length && (
            <div className="py-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 mb-3">{Icons.emptyBox}</div>
              <h3 className="text-[15px] font-bold text-ink">No call records available</h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload your contact center recordings to begin automated bilingual transcription and quality auditing.
              </p>
              <Link href="/upload" className="mt-5 btn btn-blue text-[13px] px-5 py-2 inline-flex">
                Upload Call Recording
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function rankAgents(
  agents: { id: string; name: string }[],
  calls: Array<
    Call & {
      agents?: { name: string } | null;
      call_scores?: CallScore[] | CallScore | null;
    }
  >,
): AgentPerformance[] {
  return agents
    .map((agent) => {
      const scored = calls.filter((c) => c.agent_id === agent.id && c.status === "completed");
      const values = scored
        .map((c) => {
          const score = Array.isArray(c.call_scores) ? c.call_scores[0] : c.call_scores;
          return score;
        })
        .filter(Boolean) as CallScore[];
      const avg = values.length
        ? Math.round(values.reduce((s, v) => s + v.overall_score, 0) / values.length)
        : null;
      return {
        id: agent.id,
        name: agent.name,
        call_count: values.length,
        avg_score: avg,
        excellent_count: values.filter((v) => v.verdict === "excellent").length,
        poor_count: values.filter((v) => v.verdict === "poor").length,
      };
    })
    .sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));
}
