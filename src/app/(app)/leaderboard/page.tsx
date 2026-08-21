import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { scoreTone } from "@/lib/format";
import type { CallScore } from "@/lib/types";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("user_id", user!.id);

  const { data: calls } = await supabase
    .from("calls")
    .select("id, agent_id, status, call_scores(overall_score, verdict)")
    .eq("user_id", user!.id);

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
      };
    })
    .sort((a, b) => {
      if ((b.avg_score ?? -1) !== (a.avg_score ?? -1)) {
        return (b.avg_score ?? -1) - (a.avg_score ?? -1);
      }
      return b.call_count - a.call_count;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Insights</p>
          <h1 className="mt-1 text-2xl font-semibold">Agent ranking</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Ranked by average QA score across audited calls. Assign the agent at upload so every recording
            counts.
          </p>
        </div>
        <Link href="/reports" className="btn btn-ghost">
          Reports
        </Link>
      </div>

      <div className="panel overflow-hidden rounded-xl">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Agent</th>
              <th>Avg score</th>
              <th>Calls</th>
              <th>Excellent</th>
              <th>Poor</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((agent, index) => {
              const tone = scoreTone(agent.avg_score);
              const color =
                tone === "excellent" || tone === "good"
                  ? "text-good"
                  : tone === "warn"
                    ? "text-warn"
                    : tone === "poor"
                      ? "text-rose"
                      : "text-muted";
              return (
                <tr key={agent.id}>
                  <td className={`font-semibold ${index === 0 ? "text-blue" : "text-muted"}`}>{index + 1}</td>
                  <td className="font-medium">{agent.name}</td>
                  <td className={`font-semibold tabular-nums ${color}`}>
                    {agent.avg_score ?? "—"}
                  </td>
                  <td className="text-muted">{agent.call_count}</td>
                  <td className="text-good">{agent.excellent}</td>
                  <td className="text-rose">{agent.poor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!ranked.length && (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No agents yet. Upload a call and enter the agent name.
          </p>
        )}
      </div>
    </div>
  );
}
