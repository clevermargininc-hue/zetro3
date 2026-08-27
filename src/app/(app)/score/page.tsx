import Link from "next/link";
import { CallJobList } from "@/components/call-job-list";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";

const READY = ["transcribed", "analyzing", "completed"];

export default async function ScorePage() {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data: calls } = await supabase
    .from("calls")
        .select("*, agents(name), call_scores(overall_score, verdict, audit_mode)")
    .in("user_id", teamScope)
    .in("status", READY)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue/10 text-blue font-bold text-[11px] tracking-[0.2em] uppercase mb-4">
             Quality Audit
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">Score agents</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Pick one path per audit. Documents scoring reads your Standards files first. Automatic
            auditing scores from its own professional judgment and does not use those files.
          </p>
        </div>
        <Link href="/standards" className="btn bg-surface-2 text-ink border border-line/50 hover:border-blue/30 hover:shadow-sm transition-all px-5 py-2.5 rounded-lg font-bold text-[13px]">
          View Standards
        </Link>
      </div>
      <CallJobList
        action="score"
        initialCalls={(calls || []) as Array<
          Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
        >}
        teamScope={teamScope}
      />
    </div>
  );
}
