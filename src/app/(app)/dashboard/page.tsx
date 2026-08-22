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

// Helper functions for modern agent avatars
function getAvatarGradient(name: string) {
  const hash = name.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const colors = [
    "from-blue-500 to-blue-600",
    "from-teal-400 to-emerald-500",
    "from-orange-400 to-rose-400",
    "from-violet-500 to-fuchsia-500",
    "from-sky-400 to-indigo-500",
  ];
  return colors[hash % colors.length];
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

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

      <section className="flex flex-col gap-10 relative z-10">
        {/* Recent Audits Panel */}
        <div className="panel rounded-3xl flex flex-col overflow-hidden relative group/panel">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
          <div className="relative flex items-center justify-between border-b border-line/40 px-7 py-6 bg-white/40">
            <div>
              <h2 className="text-[16px] font-bold tracking-tight text-ink">Recent Audits</h2>
              <p className="text-[12px] text-muted mt-0.5">Latest evaluated calls</p>
            </div>
            <Link href="/calls" className="btn btn-ghost text-[12px] px-4 py-1.5 rounded-lg">
              View All
            </Link>
          </div>
          <div className="relative p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {(calls || []).slice(0, 10).map((call) => {
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
                  className="group relative flex items-center justify-between gap-4 rounded-2xl bg-white/70 p-4 border border-line/40 hover:border-blue/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner ${score?.overall_score && score.overall_score >= 80 ? 'bg-good/10 text-good' : score?.overall_score && score.overall_score >= 60 ? 'bg-warn/10 text-warn' : score?.overall_score ? 'bg-rose/10 text-rose' : 'bg-blue/10 text-blue'}`}>
                      {Icons.document}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-ink group-hover:text-blue transition-colors line-clamp-1">{call.title}</p>
                      <p className="mt-1 text-[12px] text-muted flex items-center gap-1.5">
                        <span className="font-medium text-ink/70">{call.agents?.name || "Unassigned"}</span>
                        <span className="opacity-40">•</span>
                        <span>{formatDate(call.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <ScoreBadge score={score?.overall_score} verdict={score?.verdict} />
                  </div>
                </Link>
              );
            })}
            </div>
            {!calls?.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 text-blue/30 bg-blue/5 p-4 rounded-full">
                  {Icons.emptyFolder}
                </div>
                <p className="text-[15px] font-bold text-ink">No audits available</p>
                <p className="mt-2 text-[13px] text-muted max-w-[220px]">Upload a recording to generate your first automated audit.</p>
                <Link href="/upload" className="mt-6 btn btn-blue text-[13px]">
                  Upload Call
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Top Performers Panel */}
        <div className="panel rounded-3xl flex flex-col overflow-hidden relative group/panel">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
          <div className="relative flex items-center justify-between border-b border-line/40 px-7 py-6 bg-white/40">
            <div>
              <h2 className="text-[16px] font-bold tracking-tight text-ink">Agent Performance</h2>
              <p className="text-[12px] text-muted mt-0.5">Ranked by average score</p>
            </div>
            <Link href="/leaderboard" className="btn btn-ghost text-[12px] px-4 py-1.5 rounded-lg">
              Full Report
            </Link>
          </div>
          <div className="relative p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {board.slice(0, 9).map((agent, index) => {
              return (
                <div key={agent.id} className="group relative flex items-center justify-between gap-4 rounded-2xl bg-white/70 p-4 border border-line/40 hover:border-blue/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex items-center justify-center w-6 font-bold text-[14px] text-muted group-hover:text-blue transition-colors">
                      {index === 0 ? <span className="text-gold text-xl drop-shadow-sm">🥇</span> : 
                       index === 1 ? <span className="text-slate-400 text-xl drop-shadow-sm">🥈</span> : 
                       index === 2 ? <span className="text-orange-400 text-xl drop-shadow-sm">🥉</span> : 
                       `#${index + 1}`}
                    </div>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(agent.name)} text-white font-bold text-[13px] shadow-inner ring-2 ring-white`}>
                      {getInitials(agent.name)}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-ink group-hover:text-blue transition-colors">{agent.name}</p>
                      <p className="mt-1 text-[12px] text-muted">{agent.call_count} calls evaluated</p>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-[17px] font-bold tabular-nums tracking-tight ${agent.avg_score != null ? (agent.avg_score >= 80 ? 'text-good' : agent.avg_score >= 60 ? 'text-warn' : 'text-rose') : 'text-muted'}`}>
                        {agent.avg_score ?? "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted mt-0.5 font-bold">Avg Score</p>
                    </div>
                    {/* Visual progress ring */}
                    {agent.avg_score != null && (
                      <div className="w-10 h-10 relative shrink-0 flex items-center justify-center bg-surface-2 rounded-full shadow-inner border border-line/30">
                        <svg className="w-8 h-8 transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                          <path
                            className="text-line/40"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          />
                          <path
                            className={agent.avg_score >= 80 ? 'text-good' : agent.avg_score >= 60 ? 'text-warn' : 'text-rose'}
                            strokeDasharray={`${agent.avg_score}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
            {!board.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 text-blue/30 bg-blue/5 p-4 rounded-full">
                  {Icons.emptyUsers}
                </div>
                <p className="text-[15px] font-bold text-ink">No agents ranked</p>
                <p className="mt-2 text-[13px] text-muted max-w-[220px]">Assign agents to calls to populate this leaderboard automatically.</p>
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
