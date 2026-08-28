import Link from "next/link";
import { CallJobList } from "@/components/call-job-list";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";
import { PageHeader } from "@/components/ui";

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
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Score agents"
        description="Score agent calls against your uploaded Standards files (scorecard, compliance, and process documents)."
        actions={
          <Link href="/standards" className="btn btn-ghost">
            Standards
          </Link>
        }
      />
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
