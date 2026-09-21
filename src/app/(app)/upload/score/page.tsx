import { CallJobList } from "@/components/call-job-list";
import { StandardsFilesPanel } from "@/components/standards-files-panel";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { SCORE_QUEUE_STATUSES } from "@/lib/format";

export default async function UploadScorePage() {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict, audit_mode)")
    .in("user_id", teamScope)
    .in("status", SCORE_QUEUE_STATUSES)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Step 3 of 3"
        title="Score against your scorecard"
        description="Open a prepared call and start the score. Zetro reads your scorecard first. It does not use a generic list."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <CallJobList
          action="score"
          initialCalls={(calls || []) as Array<
            Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
          >}
          teamScope={teamScope}
        />
        <StandardsFilesPanel />
      </div>
    </div>
  );
}
