import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import { CallsBoard } from "@/components/calls-board";
import { PageHeader } from "@/components/ui";
import type { Call, CallScore } from "@/lib/types";

export default async function CallsPage() {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict)")
    .in("user_id", teamScope)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Calls"
        description="Every recording — whether it is scored yet or still waiting."
      />

      <CallsBoard
        initialCalls={(calls || []) as Array<
          Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
        >}
        teamScope={teamScope}
      />
    </div>
  );
}
