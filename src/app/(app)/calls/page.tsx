import { createClient } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import { CallsBoard } from "@/components/calls-board";
import type { Call, CallScore } from "@/lib/types";

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const teamScope = await getTeamScope(user!.id);
  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict)")
    .in("user_id", teamScope)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      <div className="pb-5 border-b border-line/60">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Call Audit Inventory</h1>
        <p className="mt-1 text-[13px] text-muted">
          Operational log of uploaded customer recordings, transcription pipelines, and evaluation scorecards.
        </p>
      </div>

      <CallsBoard
        initialCalls={(calls || []) as Array<
          Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
        >}
        teamScope={teamScope}
      />
    </div>
  );
}
