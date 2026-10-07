import Link from "next/link";
import { KpiStrip, PageHeader, scoreChipClass } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import { agentLabel } from "@/lib/format";
import type { CallScore } from "@/lib/types";
import { fetchAllRows } from "@/lib/fetch-all";
import { getTeamScope } from "@/lib/workspaces";

const Icons = {
  emptyBox: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

export default async function LeaderboardPage() {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const page = await fetchAllRows<{
    id: string;
    file_name: string | null;
    title: string | null;
    status: string;
    agents: { name?: string } | { name?: string }[] | null;
    call_scores: { overall_score: number | string | null; verdict: string | null } | { overall_score: number | string | null; verdict: string | null }[] | null;
  }>((from, to) =>
    supabase
      .from("calls")
      .select("id, file_name, title, status, agents(name), call_scores(overall_score, verdict)")
      .in("user_id", teamScope)
      .order("created_at", { ascending: false })
      .range(from, to),
  );
  if (page.error) throw new Error(page.error.message);
  const calls = page.data;

  const groups = new Map<
    string,
    { id: string; name: string; scores: CallScore[] }
  >();

  for (const call of calls) {
    if (call.status !== "completed") continue;
    const score = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
    const overall = Number(score?.overall_score);
    if (!score || !Number.isFinite(overall)) continue;
    score.overall_score = overall;
    const name = agentLabel(call);
    const key = name.toLowerCase();
    const existing = groups.get(key);
    if (existing) existing.scores.push(score as CallScore);
    else groups.set(key, { id: call.id, name, scores: [score as CallScore] });
  }

  const ranked = [...groups.values()]
    .map((row) => {
      const avg = Math.round(
        row.scores.reduce((sum, score) => sum + score.overall_score, 0) / row.scores.length,
      );
      return {
        id: row.id,
        name: row.name,
        call_count: row.scores.length,
        avg_score: avg,
        excellent: row.scores.filter((s) => s.verdict === "excellent").length,
        poor: row.scores.filter((s) => s.verdict === "poor").length,
        needs_improvement: row.scores.filter((s) => s.verdict === "needs_improvement").length,
      };
    })
    .sort((a, b) => {
      if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
      return b.call_count - a.call_count;
    });

  const topFile = ranked[0] || null;
  const totalAudits = ranked.reduce((acc, row) => acc + row.call_count, 0);
  const teamAvgScore = totalAudits
    ? Math.round(ranked.reduce((acc, row) => acc + row.avg_score * row.call_count, 0) / totalAudits)
    : null;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Leaderboard"
        description="Average scores and how many calls each agent has been marked on."
      />

      <KpiStrip
        items={[
          {
            label: "Top agent",
            value: topFile ? `${topFile.avg_score}%` : "—",
            hint: topFile
              ? `${topFile.name} · ${topFile.call_count} scored call${topFile.call_count === 1 ? "" : "s"}`
              : "No scored calls yet",
          },
          {
            label: "Average score",
            value: teamAvgScore != null ? `${teamAvgScore}%` : "—",
            hint: "Across scored calls",
          },
          {
            label: "Scored calls",
            value: String(totalAudits),
            hint: "Completed evaluations",
          },
          {
            label: "Agents",
            value: String(ranked.length),
            hint: "Unique agents",
          },
        ]}
      />

      <section className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-ink">Rankings</h2>
          <span className="text-[12px] text-muted">{ranked.length} agents</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">Agent</th>
                <th className="px-6 py-3 text-right">Avg score</th>
                <th className="px-6 py-3 text-right">Scored calls</th>
                <th className="px-6 py-3 text-right">Excellent (&gt;85%)</th>
                <th className="px-6 py-3 text-right">Needs Review</th>
                <th className="px-6 py-3 text-right">Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {ranked.map((row, index) => {
                const rank = index + 1;

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap tabular-nums text-muted">
                      {rank}
                    </td>
                    <td className="px-6 py-3.5 max-w-[16rem]">
                      <span className="block font-medium text-ink tabular-nums break-all">{row.name}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <span className={`${scoreChipClass(row.avg_score)} tabular-nums`}>
                        {row.avg_score}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                      {row.call_count}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
                      {row.excellent}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium tabular-nums text-ink">
                      {row.poor + row.needs_improvement}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <span className="chip">
                        {row.avg_score >= 85
                          ? "Excellent"
                          : row.avg_score >= 70
                            ? "Good"
                            : row.avg_score >= 50
                              ? "Review"
                              : "Poor"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!ranked.length && (
            <div className="py-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 mb-3">{Icons.emptyBox}</div>
              <h3 className="text-[15px] font-bold text-ink">No rankings yet</h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload and score calls to rank agents.
              </p>
              <Link href="/upload" className="mt-5 btn btn-blue text-[13px] px-5 py-2 inline-flex font-semibold">
                Upload a call
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
