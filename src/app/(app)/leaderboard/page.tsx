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
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-[14px] font-semibold text-ink">Rankings</h2>
          <span className="text-[12px] text-muted">{ranked.length} agents</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">Rank</th>
                <th>Agent</th>
                <th className="text-right">Avg score</th>
                <th className="text-right">Scored calls</th>
                <th className="text-right">Excellent</th>
                <th className="text-right">Needs review</th>
                <th className="text-right">Band</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => {
                const rank = index + 1;

                return (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap tabular-nums text-muted">
                      {rank}
                    </td>
                    <td className="max-w-[16rem]">
                      <span className="block break-all font-medium text-ink tabular-nums">{row.name}</span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className={`${scoreChipClass(row.avg_score)} tabular-nums`}>
                        {row.avg_score}%
                      </span>
                    </td>
                    <td className="text-right font-medium tabular-nums text-ink">
                      {row.call_count}
                    </td>
                    <td className="text-right font-medium tabular-nums text-ink">
                      {row.excellent}
                    </td>
                    <td className="text-right font-medium tabular-nums text-ink">
                      {row.poor + row.needs_improvement}
                    </td>
                    <td className="whitespace-nowrap text-right">
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
            <div className="empty-state">
              <div className="empty-state-icon">{Icons.emptyBox}</div>
              <h3>No rankings yet</h3>
              <p>Upload and score calls to rank agents.</p>
              <Link href="/upload" className="btn btn-blue mt-4 text-[13px]">
                Upload a call
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
