"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { StatusPill, useCallLive } from "@/components/use-call-live";
import { TranscriptView } from "@/components/transcript-view";
import { AuditActions } from "@/components/audit-actions";
import type { Call, CallScore, CallStatus, Utterance } from "@/lib/types";

export function TranscribeWorkspace({
  initialCall,
  initialUtterances,
  initialScore,
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialUtterances: Utterance[];
  initialScore: CallScore | null;
}) {
  const { call, setCall, utterances } = useCallLive(
    initialCall,
    initialUtterances,
    initialScore,
  );
  const [transcribing, setTranscribing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (call.status !== "transcribing") setTranscribing(false);
  }, [call.status]);

  const transcribeBusy = transcribing || call.status === "transcribing";
  const hasScript = utterances.length > 0;

  async function transcribe() {
    setActionError(null);
    setTranscribing(true);
    try {
      const res = await authFetch(`/api/calls/${call.id}/transcribe`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not transcribe");
      setCall((prev) => ({
        ...prev,
        status: "transcribing" as CallStatus,
        error_message: null,
      }));
      await waitForCallStatus(call.id, ["transcribed", "completed"]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed");
      setTranscribing(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link href="/calls" className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wide text-muted hover:text-ink transition-colors mb-4">
            ← Back to Inventory
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold tracking-tight text-ink">{call.title}</h1>
             <StatusPill status={call.status} error={call.error_message} />
          </div>
          <p className="mt-3 text-[15px] font-medium text-muted">
            {call.agents?.name || "Unassigned agent"}
            {call.detected_language ? <span className="opacity-50 mx-2">•</span> : ""}
            {call.detected_language ? call.detected_language : ""}
          </p>
        </div>
      </div>

      {(actionError || call.error_message) && (
        <div className="alert-error shadow-sm rounded-xl">{actionError || call.error_message}</div>
      )}

      {!hasScript ? (
        <section className="panel rounded-3xl p-10 shadow-md text-center max-w-2xl mx-auto mt-12 bg-gradient-to-b from-surface to-surface-2 border-line/40">
          <div className="h-20 w-20 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
             <span className="text-3xl">🎙️</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Generate Transcript</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            The system will transcribe the audio, separate the speakers, and format the conversation into a clean, readable script.
          </p>
          <button
            type="button"
            disabled={transcribeBusy}
            onClick={() => void transcribe()}
            className="btn btn-lg btn-blue shadow-lg shadow-blue/20 hover:-translate-y-1 active:translate-y-0 transition-all mt-8 w-full sm:w-auto px-12 py-4 text-[16px]"
          >
            {transcribeBusy ? (
              <span className="flex items-center justify-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                Transcribing...
              </span>
            ) : (
              "Transcribe Call Now"
            )}
          </button>
        </section>
      ) : (
        <div className="space-y-8">
          {/* Audit Actions Slim Banner */}
          <section className="panel rounded-2xl p-4 md:p-5 shadow-sm border border-line/50 bg-gradient-to-r from-surface to-surface-2 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue/10 flex items-center justify-center text-blue text-lg">
                  📊
                </div>
                <div>
                  <h2 className="text-[16px] font-bold tracking-tight text-ink">Ready to Score?</h2>
                  <p className="text-[13px] text-muted">Choose an auditing path to generate scores.</p>
                </div>
             </div>
             
             <div className="flex-shrink-0 w-full md:w-auto">
                <AuditActions
                  callId={call.id}
                  status={call.status}
                  compact={true}
                  onStatus={(status) =>
                    setCall((prev) => ({ ...prev, status, error_message: null }))
                  }
                />
                {call.status === "completed" && (
                  <div className="mt-3">
                    <Link href={`/calls/${call.id}/score`} className="btn w-full justify-center bg-good/10 text-good hover:bg-good/20 shadow-sm border border-good/20 transition-all">
                      View Score Report →
                    </Link>
                  </div>
                )}
             </div>
          </section>

          <div className="transition-all duration-500">
            <TranscriptView utterances={utterances} />
          </div>
          
          <div className="flex justify-center pt-4">
             <button
                type="button"
                disabled={transcribeBusy}
                onClick={() => void transcribe()}
                className="btn btn-ghost text-[14px] text-muted hover:text-ink hover:bg-surface-2 transition-colors"
              >
                {transcribeBusy ? "Re-transcribing..." : "Not happy with the transcript? Re-transcribe audio"}
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
