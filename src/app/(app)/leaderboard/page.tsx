import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { scoreTone, verdictLabel } from "@/lib/format";
import { getTeamScope } from "@/lib/workspaces";
import type { CallScore } from "@/lib/types";

const Icons = {
  award: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  analytics: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  upload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  download: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  emptyBox: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const teamScope = await getTeamScope(user!.id);
  const [{ data: agents }, { data: calls }] = await Promise.all([
    supabase.from("agents").select("id, name").in("user_id", teamScope),
    supabase
      .from("calls")
      .select("id, agent_id, status, call_scores(overall_score, verdict)")
      .in("user_id", teamScope),
  ]);

  const ranked = (agents || [])
    .map((agent) => {
      const rows = (calls || []).filter(
        (c) => c.agent_id === agent.id && c.status === "completed",
      );
      const scores = rows
        .map((c) => (Array.isArray(c.call_scores) ? c.call_scores[0] : c.call_scores))
        .filter(Boolean) as CallScore[];
      const avg = scores.length
        ? Math.round(scores.reduce((s, v) => s + v.overall_score, 0) / scores.length)
        : null;
      return {
        ...agent,
        call_count: scores.length,
        avg_score: avg,
        excellent: scores.filter((s) => s.verdict === "excellent").length,
        poor: scores.filter((s) => s.verdict === "poor").length,
        needs_improvement: scores.filter((s) => s.verdict === "needs_improvement").length,
      };
    })
    .sort((a, b) => {
      if ((b.avg_score ?? -1) !== (a.avg_score ?? -1)) {
        return (b.avg_score ?? -1) - (a.avg_score ?? -1);
      }
      return b.call_count - a.call_count;
    });

  // Calculate summary metrics
  const activeRanked = ranked.filter((a) => a.avg_score != null);
  const topAgent = activeRanked.length > 0 ? activeRanked[0] : null;
  const totalAudits = ranked.reduce((acc, a) => acc + a.call_count, 0);
  const teamAvgScore = activeRanked.length
    ? Math.round(activeRanked.reduce((acc, a) => acc + (a.avg_score || 0), 0) / activeRanked.length)
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-5 border-b border-line/60">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Agent Performance Rankings</h1>
        <p className="mt-1 text-[13px] text-muted">
          Comparative evaluation scores, audit volumes, excellence rates, and coaching priorities per representative.
        </p>
      </div>

      {/* Benchmark Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Top Performer */}
        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">#1 Top Performer</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-ink truncate">
                {topAgent ? topAgent.name : "—"}
              </span>
            </div>
            {topAgent && (
              <p className="mt-1 text-[12px] font-semibold text-emerald-600">
                {topAgent.avg_score}% Avg Score ({topAgent.call_count} calls)
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Leading QA benchmark
          </div>
        </div>

        {/* Team QA Average */}
        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Team Average QA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {teamAvgScore != null ? `${teamAvgScore}%` : "—"}
              </span>
              {teamAvgScore != null && (
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {verdictLabel(scoreTone(teamAvgScore))}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Across {activeRanked.length} evaluated agents
          </div>
        </div>

        {/* Total Evaluated Audits */}
        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Assigned Audits</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {totalAudits}
              </span>
              <span className="text-[12px] text-muted font-medium">total evaluations</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            Evaluated agent interactions
          </div>
        </div>

        {/* Workforce Coverage */}
        <div className="bg-white rounded-lg p-5 border border-line shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Active Workforce</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
                {ranked.length}
              </span>
              <span className="text-[12px] text-muted font-medium">representatives</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-muted font-medium">
            {activeRanked.length} with scored calls
          </div>
        </div>
      </section>

      {/* Spotlight Top 3 Cards (If agents exist) */}
      {activeRanked.length >= 2 && (
        <section className="grid gap-4 md:grid-cols-3">
          {activeRanked.slice(0, 3).map((agent, index) => {
            const rank = index + 1;
            const isFirst = rank === 1;
            const isSecond = rank === 2;
            const isThird = rank === 3;

            const badgeColor = isFirst
              ? "bg-slate-900 text-white shadow-sm"
              : isSecond
              ? "bg-slate-700 text-white"
              : "bg-slate-500 text-white";

            return (
              <div
                key={agent.id}
                className={`bg-white rounded-lg p-5 border shadow-sm flex flex-col justify-between ${
                  isFirst ? "border-slate-400/80 ring-1 ring-slate-200" : "border-line"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${badgeColor}`}>
                      RANK #{rank}
                    </span>
                    <span
                      className={`text-[12px] font-bold px-2 py-0.5 rounded border tabular-nums ${
                        (agent.avg_score ?? 0) >= 80
                          ? "bg-good/10 text-good border-good/20"
                          : (agent.avg_score ?? 0) >= 60
                          ? "bg-warn/10 text-warn border-warn/20"
                          : "bg-rose/10 text-rose border-rose/20"
                      }`}
                    >
                      {agent.avg_score}% Avg
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                      {getInitials(agent.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[15px] text-ink truncate">{agent.name}</h3>
                      <p className="text-[12px] text-muted">{agent.call_count} calls evaluated</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Excellent Rate</span>
                    <span className="font-bold text-emerald-600">
                      {agent.call_count > 0 ? Math.round((agent.excellent / agent.call_count) * 100) : 0}% ({agent.excellent})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Needs Review</span>
                    <span className="font-bold text-slate-700">{agent.poor + agent.needs_improvement} calls</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Main Ranking Data Table */}
      <section className="bg-white rounded-lg border border-line shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Workforce Leaderboard Matrix</h2>
            <p className="text-[12px] text-muted mt-0.5">Complete ranking of representative performance and evaluation metrics</p>
          </div>
          <span className="text-[12px] font-semibold text-slate-500">{ranked.length} total representatives</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">Representative</th>
                <th className="px-6 py-3 text-right">Avg QA Score</th>
                <th className="px-6 py-3 text-right">Audited Calls</th>
                <th className="px-6 py-3 text-right">Excellent (&gt;85%)</th>
                <th className="px-6 py-3 text-right">Needs Review</th>
                <th className="px-6 py-3 text-right">Performance Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {ranked.map((agent, index) => {
                const rank = index + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;

                return (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    {/* Rank */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
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
                    </td>

                    {/* Agent Name */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getInitials(agent.name)}
                        </div>
                        <span className="font-semibold text-ink">{agent.name}</span>
                      </div>
                    </td>

                    {/* Avg Score */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-bold tabular-nums border ${
                          agent.avg_score != null
                            ? agent.avg_score >= 80
                              ? "bg-good/10 text-good border-good/20"
                              : agent.avg_score >= 60
                              ? "bg-warn/10 text-warn border-warn/20"
                              : "bg-rose/10 text-rose border-rose/20"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}
                      >
                        {agent.avg_score != null ? `${agent.avg_score}%` : "—"}
                      </span>
                    </td>

                    {/* Calls */}
                    <td className="px-6 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                      {agent.call_count}
                    </td>

                    {/* Excellent */}
                    <td className="px-6 py-3.5 text-right font-medium text-emerald-600 tabular-nums">
                      {agent.excellent}
                    </td>

                    {/* Needs Review */}
                    <td className="px-6 py-3.5 text-right font-medium tabular-nums">
                      <span className={agent.poor > 0 ? "text-rose font-bold" : "text-slate-400"}>
                        {agent.poor}
                      </span>
                    </td>

                    {/* Performance Band */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {agent.avg_score != null ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            agent.avg_score >= 85
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : agent.avg_score >= 70
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : agent.avg_score >= 50
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {agent.avg_score >= 85
                            ? "Top Tier (85+)"
                            : agent.avg_score >= 70
                            ? "Target Met (70+)"
                            : agent.avg_score >= 50
                            ? "Coaching Focus"
                            : "Immediate Action"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Pending Audits</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!ranked.length && (
            <div className="py-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 mb-3">{Icons.emptyBox}</div>
              <h3 className="text-[15px] font-bold text-ink">No agent rankings available</h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload call recordings and assign representative names to generate real-time performance rankings.
              </p>
              <Link href="/upload" className="mt-5 btn btn-blue text-[13px] px-5 py-2 inline-flex font-semibold">
                Upload Call Recording
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
