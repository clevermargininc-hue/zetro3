import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { agentIdFromFile, formatAht, formatDate, formatDuration, languageLabel } from "@/lib/format";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { JoinRequestBanner } from "@/components/join-request-banner";
import { KpiStrip, PageHeader, scoreChipClass } from "@/components/ui";

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
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} mins`;
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  await getTeamScope(user.id);
  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(*)")
    .order("created_at", { ascending: false });

  const allCalls = calls || [];
  const completedCalls = allCalls.filter((c) => c.status === "completed");

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

  // Total evaluated talk time and AHT
  const handleDurations = completedCalls
    .map((c) => Number(c.duration_seconds))
    .filter((n) => Number.isFinite(n) && n > 0);
  const totalAudioSeconds = handleDurations.reduce((acc, n) => acc + n, 0);
  const ahtSeconds = handleDurations.length
    ? Math.round(totalAudioSeconds / handleDurations.length)
    : null;

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



  const agentLeaderboard = rankByAgentId(allCalls);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Overview"
        description="Call quality, compliance, and handling time across this workspace."
      />

      <JoinRequestBanner />

      <KpiStrip
        items={[
          {
            label: "Quality score",
            value: avgScore != null ? `${avgScore}%` : "—",
            hint: passRate != null ? `${passRate}% pass rate (≥70)` : "No scored calls yet",
          },
          {
            label: "Audited calls",
            value: String(completedCalls.length),
            hint: `${formatTotalTime(totalAudioSeconds)} evaluated audio`,
          },
          {
            label: "Compliance",
            value: compliancePassRate != null ? `${compliancePassRate}%` : "—",
            hint: `${totalBreaches} ${totalBreaches === 1 ? "finding" : "findings"} flagged`,
          },
          {
            label: "Avg handle time",
            value: formatAht(ahtSeconds),
            hint: "Per audited call",
          },
        ]}
      />

      <section className="surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-ink">Score distribution</h3>
                <p className="text-[12px] text-muted">Calls by evaluation band</p>
              </div>
              <span className="text-[12px] text-muted">{scoreValues.length} scored</span>
            </div>

            {scoreValues.length > 0 ? (
              <div className="space-y-4">
                <div className="h-1.5 w-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="bg-navy h-full"
                    style={{ width: `${(tierExcellent / scoreValues.length) * 100}%` }}
                    title={`Excellent: ${tierExcellent}`}
                  />
                  <div
                    className="bg-blue h-full"
                    style={{ width: `${(tierGood / scoreValues.length) * 100}%` }}
                    title={`Good: ${tierGood}`}
                  />
                  <div
                    className="bg-slate-400 h-full"
                    style={{ width: `${(tierNeedsImp / scoreValues.length) * 100}%` }}
                    title={`Needs Improvement: ${tierNeedsImp}`}
                  />
                  <div
                    className="bg-slate-300 h-full"
                    style={{ width: `${(tierPoor / scoreValues.length) * 100}%` }}
                    title={`Poor: ${tierPoor}`}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                  <div>
                    <span className="text-muted block">Excellent (85+)</span>
                    <span className="font-medium text-ink tabular-nums">{tierExcellent} ({Math.round((tierExcellent / scoreValues.length) * 100)}%)</span>
                  </div>
                  <div>
                    <span className="text-muted block">Good (70–84)</span>
                    <span className="font-medium text-ink tabular-nums">{tierGood} ({Math.round((tierGood / scoreValues.length) * 100)}%)</span>
                  </div>
                  <div>
                    <span className="text-muted block">Review (50–69)</span>
                    <span className="font-medium text-ink tabular-nums">{tierNeedsImp} ({Math.round((tierNeedsImp / scoreValues.length) * 100)}%)</span>
                  </div>
                  <div>
                    <span className="text-muted block">Poor (&lt;50)</span>
                    <span className="font-medium text-ink tabular-nums">{tierPoor} ({Math.round((tierPoor / scoreValues.length) * 100)}%)</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-4 text-muted text-[13px]">No evaluations yet.</p>
            )}
      </section>

      <section className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Leaderboard</h2>
            <p className="text-[12px] text-muted mt-0.5">Average QA score by agent ID</p>
          </div>
          <Link href="/leaderboard" className="btn btn-ghost text-[12px]">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Agent ID</th>
                <th className="px-6 py-3 text-right">Audits</th>
                <th className="px-6 py-3 text-right">Avg score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {agentLeaderboard.slice(0, 6).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <span className="font-medium text-ink tabular-nums">{row.name}</span>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-600">{row.call_count}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`${scoreChipClass(row.avg_score)} tabular-nums`}>
                      {row.avg_score != null ? `${row.avg_score}%` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!agentLeaderboard.length ? (
            <p className="px-6 py-8 text-[13px] text-muted">Upload and score recordings to populate the leaderboard.</p>
          ) : null}
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Recent audits</h2>
            <p className="text-[12px] text-muted mt-0.5">Latest recordings and scores</p>
          </div>
          <Link href="/calls" className="btn btn-ghost text-[12px]">
            View all
          </Link>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Agent ID</th>

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
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    {/* Agent ID & Duration */}
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-ink tabular-nums">{agentLabel(call)}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span>Duration: {formatDuration(call.duration_seconds)}</span>
                      </div>
                    </td>



                    {/* Date */}
                    <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap text-[12px]">
                      {formatDate(call.created_at)}
                    </td>

                    {/* Language */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="chip">
                        {languageLabel(call.detected_language || call.language_mode)}
                      </span>
                    </td>

                    {/* Compliance */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {score ? (
                        hasBreach ? (
                          <span className="chip chip-bad">Flagged</span>
                        ) : (
                          <span className="chip chip-ok">Clean</span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* QA Score */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {score?.overall_score != null ? (
                        <span className={`${scoreChipClass(score.overall_score)} tabular-nums`}>
                          {score.overall_score}%
                        </span>
                      ) : (
                        <span className="chip">
                          {call.status === "failed" ? "Failed" : "Processing"}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <Link
                        href={score ? `/upload/score/${call.id}` : `/upload/prepare/${call.id}`}
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
              <div className="inline-flex p-3 mb-3 text-muted">{Icons.emptyBox}</div>
              <h3 className="text-[14px] font-semibold text-ink">No call records</h3>
              <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
                Upload recordings to start quality auditing.
              </p>
              <Link href="/upload" className="mt-4 btn btn-blue text-[13px] inline-flex">
                Upload calls
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function agentLabel(call: { file_name?: string | null; title?: string | null }) {
  return agentIdFromFile(call.file_name || call.title);
}

function rankByAgentId(
  calls: Array<
    Call & {
      call_scores?: CallScore[] | CallScore | null;
    }
  >,
) {
  const groups = new Map<
    string,
    { id: string; name: string; scores: CallScore[] }
  >();

  for (const call of calls) {
    if (call.status !== "completed") continue;
    const score = Array.isArray(call.call_scores) ? call.call_scores[0] : call.call_scores;
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
      avg_score: Math.round(
        row.scores.reduce((sum, score) => sum + score.overall_score, 0) / row.scores.length,
      ),
    }))
    .sort((a, b) => b.avg_score - a.avg_score);
}
