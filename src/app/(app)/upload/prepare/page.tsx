import { CallJobList } from "@/components/call-job-list";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { PREPARE_QUEUE_STATUSES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UploadPreparePage() {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict)")
    .in("user_id", teamScope)
    .in("status", PREPARE_QUEUE_STATUSES)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Step 2 of 3"
        title="Prepare recordings"
        description="Open a file, listen, and wait until it is ready. Scoring is the next step. Audited calls are in Call inventory."
      />
      <CallJobList
        action="transcribe"
        initialCalls={(calls || []) as Array<
          Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
        >}
        teamScope={teamScope}
      />
    </div>
  );
}
