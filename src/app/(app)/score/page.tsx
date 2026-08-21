import Link from "next/link";
import { CallJobList } from "@/components/call-job-list";
import { createClient } from "@/lib/supabase/server";
import type { Call, CallScore } from "@/lib/types";

const READY = ["transcribed", "analyzing", "completed"];

export default async function ScorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: calls } = await supabase
    .from("calls")
        .select("*, agents(name), call_scores(overall_score, verdict, audit_mode)")
    .eq("user_id", user!.id)
    .in("status", READY)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Quality audit</p>
          <h1 className="mt-1 text-2xl font-semibold">Score agents</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Pick one path per audit. Documents scoring reads your Standards files first. Automatic
            auditing scores from the model’s own judgment and does not use those files.
          </p>
        </div>
        <Link href="/standards" className="btn btn-ghost">
          Standards
        </Link>
      </div>
      <CallJobList
        action="score"
        initialCalls={(calls || []) as Array<
          Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
        >}
      />
    </div>
  );
}
