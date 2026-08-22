import Link from "next/link";
import { CallJobList } from "@/components/call-job-list";
import { createClient } from "@/lib/supabase/server";
import type { Call, CallScore } from "@/lib/types";

export default async function TranscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Prepare</p>
          <h1 className="mt-1 text-2xl font-semibold">Prepare calls</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Build the backend transcript and speaker split so you can listen and audit. The script stays
            off the main call screen unless you open it.
          </p>
        </div>
        <Link href="/upload" className="btn btn-blue">
          Upload
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="panel rounded-xl p-4">
          <p className="page-kicker">Background</p>
          <h2 className="mt-2 text-sm font-semibold">Transcript & diarization</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            Speech-to-text and Agent / Customer roles run for scoring and language repair — not as a
            required UI step.
          </p>
        </article>
        <article className="panel rounded-xl p-4">
          <p className="page-kicker">Audit path</p>
          <h2 className="mt-2 text-sm font-semibold">Listen, then audit</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            Open a call to play the recording and score when preparation finishes.
          </p>
        </article>
      </div>
      <CallJobList
        action="transcribe"
        initialCalls={(calls || []) as Array<
          Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
        >}
      />
    </div>
  );
}
