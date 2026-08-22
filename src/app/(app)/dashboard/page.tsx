import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, scoreTone, verdictLabel } from "@/lib/format";
import type { AgentPerformance, Call, CallScore } from "@/lib/types";
import { JoinRequestBanner } from "@/components/join-request-banner";

// Clean, enterprise SVG Icons
const Icons = {
  document: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  emptyFolder: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  emptyUsers: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: calls }, { data: agents }] = await Promise.all([
    supabase
      .from("calls")
      .select("*, agents(name), call_scores(overall_score, verdict)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.from("agents").select("id, name").eq("user_id", user!.id),
  ]);

  const completed = (calls || []).filter((c) => c.status === "completed");
  const scoreValues = completed
    .map((c) => {
      const score = Array.isArray(c.call_scores) ? c.call_scores[0] : c.call_scores;
      return score?.overall_score;
    })
    .filter((n): n is number => typeof n === "number");
  const avg = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, n) => sum + n, 0) / scoreValues.length)
    : null;

  const board = rankAgents(agents || [], calls || []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line/40 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Operations Overview</h1>
          <p className="mt-2 text-[14px] text-muted max-w-2xl">
            Monitor QA performance, recent audits, and track agent evaluation metrics.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/upload" className="btn bg-ink text-white hover:bg-ink/90 shadow-sm text-[13px] px-6">
            Upload Call
          </Link>
        </div>
      </div>

      <JoinRequestBanner />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Audits" value={String(completed.length)} />
        <Stat label="Team Average Score" value={avg == null ? "—" : String(avg)} tone={scoreTone(avg)} />
        <Stat label="Active Agents" value={String(agents?.length || 0)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Recent Audits Panel */}
        <div className="bg-white rounded-2xl border border-line/40 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-line/40 px-6 py-5">
            <h2 className="text-[14px] font-semibold tracking-tight text-ink">Recent Audits</h2>
            <Link href="/calls" className="text-[12px] font-semibold text-blue hover:text-blue-2 transition-colors">
              View All
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {(calls || []).slice(0, 6).map((call) => {
              const score = Array.isArray(call.call_scores)
                ? call.call_scores[0]
                : call.call_scores;
              return (
                <Link
                  key={call.id}
                  href={
                    score
                      ? `/calls/${call.id}/score`
                      : `/calls/${call.id}/transcribe`
                  }
                  className="group flex items-center justify-between gap-4 rounded-xl bg-white p-3.5 border border-transparent hover:border-line/60 hover:bg-surface-2/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/40 bg-surface text-muted group-hover:text-ink transition-colors">
                      {Icons.document}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-ink group-hover:text-blue transition-colors line-clamp-1">{call.title}</p>
                      <p className="mt-1 text-[12px] text-muted">
                        {call.agents?.name || "Unassigned"} <span className="opacity-40 mx-1.5">•</span> {formatDate(call.created_at)}
                      </p>
                    </div>
                  </div>
                  <ScoreBadge score={score?.overall_score} verdict={score?.verdict} />
                </Link>
              );
            })}
            {!calls?.length && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="mb-4 text-muted">
                  {Icons.emptyFolder}
                </div>
                <p className="text-[14px] font-medium text-ink">No audits available</p>
                <p className="mt-1 text-[13px] text-muted max-w-[200px]">Upload a recording to generate your first audit.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Performers Panel */}
        <div className="bg-white rounded-2xl border border-line/40 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-line/40 px-6 py-5">
            <h2 className="text-[14px] font-semibold tracking-tight text-ink">Agent Performance</h2>
            <Link href="/leaderboard" className="text-[12px] font-semibold text-blue hover:text-blue-2 transition-colors">
              Full Report
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {board.slice(0, 6).map((agent, index) => {
              return (
                <div key={agent.id} className="group flex items-center justify-between gap-4 rounded-xl bg-white p-3.5 border border-transparent hover:border-line/60 hover:bg-surface-2/50 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/40 bg-surface text-[12px] font-bold text-muted group-hover:text-ink transition-colors">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-ink">{agent.name}</p>
                      <p className="mt-1 text-[12px] text-muted">{agent.call_count} calls evaluated</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[16px] font-semibold tabular-nums tracking-tight ${agent.avg_score != null ? (agent.avg_score >= 80 ? 'text-good' : agent.avg_score >= 60 ? 'text-warn' : 'text-rose') : 'text-muted'}`}>
                      {agent.avg_score ?? "—"}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted mt-0.5 font-medium">Avg Score</p>
                  </div>
                </div>
              );
            })}
            {!board.length && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="mb-4 text-muted">
                  {Icons.emptyUsers}
                </div>
                <p className="text-[14px] font-medium text-ink">No agents ranked</p>
                <p className="mt-1 text-[13px] text-muted max-w-[200px]">Assign agents to calls to populate this board.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: ReturnType<typeof scoreTone>;
}) {
  const isGood = tone === "excellent" || tone === "good";
  const isWarn = tone === "warn";
  const isPoor = tone === "poor";
  
  const color = isGood
    ? "text-good"
    : isWarn
      ? "text-warn"
      : isPoor
        ? "text-rose"
        : "text-ink";

  return (
    <div className="bg-white rounded-2xl p-6 border border-line/40 shadow-sm flex flex-col justify-between">
      <p className="text-[12px] font-medium text-muted uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
         <p className={`text-4xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
         {tone && (
           <span className="text-[12px] font-medium text-muted">avg</span>
         )}
      </div>
    </div>
  );
}

function ScoreBadge({
  score,
  verdict,
}: {
  score?: number | null;
  verdict?: string | null;
}) {
  if (score == null) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md bg-surface-2 text-[11px] font-medium text-muted border border-line/50 whitespace-nowrap">
        Pending
      </span>
    );
  }
  
  const isGood = score >= 80;
  const isWarn = score >= 60 && score < 80;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[12px] font-semibold border whitespace-nowrap ${
      isGood ? "bg-good/5 text-good border-good/20" : 
      isWarn ? "bg-warn/5 text-warn border-warn/20" : 
      "bg-rose/5 text-rose border-rose/20"
    }`}>
      <span className="tabular-nums">{score}</span>
    </span>
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
