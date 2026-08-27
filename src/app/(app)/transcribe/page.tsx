import Link from "next/link";
import { CallJobList } from "@/components/call-job-list";
import { createClient } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";

export default async function TranscribePage() {
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
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue/10 text-blue font-bold text-[11px] tracking-[0.2em] uppercase mb-4">
             Preparation
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">Transcribe Calls</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Process audio to generate transcripts, detect languages, and separate speakers. This is required before scoring.
          </p>
        </div>
        <Link href="/upload" className="btn bg-blue text-white shadow-md shadow-blue/20 hover:-translate-y-0.5 transition-all px-6 py-3 rounded-lg font-bold text-[13px]">
          Upload Call
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <article className="panel rounded-3xl p-6 bg-gradient-to-br from-surface to-surface-2 border border-line/40">
          <div className="h-10 w-10 rounded-full bg-blue/10 flex items-center justify-center mb-4">
            <span className="text-lg opacity-80">🎙️</span>
          </div>
          <h2 className="text-[15px] font-bold text-ink">Transcript & diarization</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Speech-to-text and Agent / Customer roles run for scoring and language repair — not as a
            required UI step.
          </p>
        </article>
        <article className="panel rounded-3xl p-6 bg-gradient-to-br from-surface to-surface-2 border border-line/40">
          <div className="h-10 w-10 rounded-full bg-blue/10 flex items-center justify-center mb-4">
            <span className="text-lg opacity-80">🎧</span>
          </div>
          <h2 className="text-[15px] font-bold text-ink">Listen, then audit</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Open a call to play the recording and score when preparation finishes.
          </p>
        </article>
      </div>
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
