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
          <p className="page-kicker">Transcription</p>
          <h1 className="mt-1 text-2xl font-semibold">Transcribe calls</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            AssemblyAI transcribes audio and splits speakers. GPT-5-mini then labels Agent vs Customer
            and writes the clean script.
          </p>
        </div>
        <Link href="/upload" className="btn btn-blue">
          Upload
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="panel rounded-xl p-4">
          <p className="page-kicker">AssemblyAI</p>
          <h2 className="mt-2 text-sm font-semibold">Transcription & diarization</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            Converts speech to text, keeps Kiswahili and English as spoken, and separates the two
            speakers with Agent / Customer role hints.
          </p>
        </article>
        <article className="panel rounded-xl p-4">
          <p className="page-kicker">GPT-5-mini</p>
          <h2 className="mt-2 text-sm font-semibold">Speaker roles & clean script</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            Decides who is the agent and who is the customer from the conversation, then repairs
            the script without translating or inventing lines.
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
