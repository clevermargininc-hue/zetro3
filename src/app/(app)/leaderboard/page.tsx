import Link from "next/link";
import { KpiStrip, PageHeader, scoreChipClass } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import type { CallScore } from "@/lib/types";
import { getTeamScope } from "@/lib/workspaces";

const Icons = {
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
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const [{ data: agents }, { data: calls }] = await Promise.all([
    supabase.from("agents").select("id, name"),
    supabase
      .from("calls")
      .select("id, agent_id, status, call_scores(overall_score, verdict)")
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
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Agent rankings"
        description="Average scores, audit volume, and coaching priorities by representative."
      />

      <KpiStrip
        items={[
          {
            label: "Top performer",
            value: topAgent ? topAgent.name : "—",
            hint: topAgent ? `${topAgent.avg_score}% · ${topAgent.call_count} calls` : "No ranked agents yet",
          },
          {
            label: "Team average",
            value: teamAvgScore != null ? `${teamAvgScore}%` : "—",
            hint: `${activeRanked.length} evaluated agents`,
          },
          {
            label: "Assigned audits",
            value: String(totalAudits),
            hint: "Completed evaluations",
          },
          {
            label: "Workforce",
            value: String(ranked.length),
            hint: `${activeRanked.length} with scored calls`,
          },
        ]}
      />

      <section className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-ink">Rankings</h2>
          <span className="text-[12px] text-muted">{ranked.length} representatives</span>
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

                return (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    {/* Rank */}
                    <td className="px-6 py-3.5 whitespace-nowrap tabular-nums text-muted">
                      {rank}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-navy text-white flex items-center justify-center text-[10px] font-medium shrink-0">
                          {getInitials(agent.name)}
                        </div>
                        <span className="font-medium text-ink">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <span className={`${scoreChipClass(agent.avg_score)} tabular-nums`}>
                        {agent.avg_score != null ? `${agent.avg_score}%` : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                      {agent.call_count}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
                      {agent.excellent}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
                      {agent.poor}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {agent.avg_score != null ? (
                        <span className="chip">
                          {agent.avg_score >= 85
                            ? "Excellent"
                            : agent.avg_score >= 70
                            ? "Good"
                            : agent.avg_score >= 50
                            ? "Review"
                            : "Poor"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending</span>
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
