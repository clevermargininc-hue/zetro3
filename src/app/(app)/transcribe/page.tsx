import Link from "next/link";
import { CallJobList } from "@/components/call-job-list";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { PageHeader } from "@/components/ui";

export default async function TranscribePage() {
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
        title="Prepare calls"
        description="Server-side processing so you can audit. Transcripts are not shown in the product."
        actions={
          <Link href="/upload" className="btn btn-blue">
            Upload calls
          </Link>
        }
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
