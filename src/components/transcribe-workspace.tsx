"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { DeleteCallButton } from "@/components/delete-call-button";
import { AuditActions } from "@/components/audit-actions";
import { auditLabel, auditStatus, formatDate, formatDuration, languageLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus, Utterance } from "@/lib/types";
import { useCallLive } from "@/components/use-call-live";

const Icons = {
  headphones: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function TranscribeWorkspace({
  initialCall,
  initialUtterances,
  initialScore,
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialUtterances: Utterance[];
  initialScore: CallScore | null;
}) {
  const { call, setCall, utterances, audioUrl } = useCallLive(
    initialCall,
    initialUtterances,
    initialScore,
  );
  const [preparing, setPreparing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const autoPrepareStarted = useRef(false);

  const readyForAudit =
    utterances.length > 0 &&
    ["transcribed", "analyzing", "completed"].includes(call.status);
  const preparingBusy =
    preparing || call.status === "transcribing" || call.status === "queued";

  // Auto-prepare queued calls so users can listen while the backend prepares scoring.
  useEffect(() => {
    if (call.status !== "queued" || autoPrepareStarted.current) return;
    autoPrepareStarted.current = true;
    let cancelled = false;
    void (async () => {
      setPreparing(true);
      setActionError(null);
      try {
        const res = await authFetch(`/api/calls/${call.id}/transcribe`, {
          method: "POST",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not prepare call");
        if (cancelled) return;
        setCall((prev) => ({
          ...prev,
          status: "transcribing" as CallStatus,
          error_message: null,
        }));
        await waitForCallStatus(call.id, ["transcribed", "completed", "failed"]);
      } catch (error) {
        if (!cancelled) {
          autoPrepareStarted.current = false;
          setActionError(error instanceof Error ? error.message : "Action failed");
        }
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call.id, call.status, setCall]);

  async function prepare() {
    setActionError(null);
    setPreparing(true);
    try {
      const res = await authFetch(`/api/calls/${call.id}/transcribe`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not prepare call");
      setCall((prev) => ({
        ...prev,
        status: "transcribing" as CallStatus,
        error_message: null,
      }));
      await waitForCallStatus(call.id, ["transcribed", "completed", "failed"]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed");
    } finally {
      setPreparing(false);
    }
  }

  const bucket = auditStatus(call.status);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col gap-3 pb-5 border-b border-line/60">
        <Link
          href="/calls"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-blue transition-colors self-start"
        >
          {Icons.arrowLeft}
          <span>Back to Call Inventory</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{call.title || call.file_name}</h1>
              {/* Status pill */}
              {bucket === "audited" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Audited & Scored
                </span>
              ) : bucket === "transcribed" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue" />
                  Transcript Ready
                </span>
              ) : bucket === "failed" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {call.status === "transcribing" ? "Transcribing Audio…" : "Preparing…"}
                </span>
              )}
            </div>

            {/* Metadata tags */}
            <div className="mt-2 flex items-center gap-3 text-[12px] text-muted flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Representative:</span>
                <span>{call.agents?.name || "Unassigned"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Language:</span>
                <span>{languageLabel(call.detected_language || call.language_mode)}</span>
              </span>
              {call.duration_seconds && (
                <>
                  <span>•</span>
                  <span>{formatDuration(call.duration_seconds)}</span>
                </>
              )}
              <span>•</span>
              <span>{formatDate(call.created_at)}</span>
            </div>
          </div>

          <DeleteCallButton
            callId={call.id}
            title={call.title}
            status={call.status}
            redirectTo="/calls"
          />
        </div>
      </div>

      {(actionError || call.error_message) && (
        <div className="alert-error text-[13px]">{actionError || call.error_message}</div>
      )}

      {/* Audio Playback Card */}
      <section className="bg-white rounded-xl p-6 border border-line/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
            <span className="text-blue">{Icons.headphones}</span>
            <span>Call Recording Stream</span>
          </div>
          <span className="text-[12px] text-muted font-medium">Bilingual Audio Channel</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" preload="metadata" />
          ) : (
            <p className="text-[13px] text-muted py-2 text-center">Loading recording stream…</p>
          )}
        </div>
      </section>

      {/* Evaluation & Scoring Workspace */}
      {!readyForAudit ? (
        <section className="bg-white rounded-xl p-8 border border-line/70 shadow-sm text-center space-y-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-[16px] font-bold text-ink">
              {preparingBusy ? "Speech Transcription in Progress…" : "Prepare Recording for Evaluation"}
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {preparingBusy
                ? "The speech-to-text pipeline is identifying speakers and transcribing conversation turns."
                : "Initiate speech transcription and speaker diarization to enable QA scoring."}
            </p>

            {preparingBusy ? (
              <div className="mt-6 flex items-center justify-center gap-2.5 text-blue text-[13px] font-semibold bg-blue/5 py-3 px-4 rounded-lg border border-blue/20">
                <div className="h-4 w-4 rounded-full border-2 border-blue/30 border-t-blue animate-spin" />
                <span>Transcribing audio & detecting speakers…</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void prepare()}
                className="btn bg-blue hover:bg-blue-2 text-white shadow-sm text-[13px] font-semibold px-6 py-2.5 mt-5 inline-flex"
              >
                Begin Audio Transcription
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-xl p-6 border border-line/70 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[15px] font-bold text-ink">Quality Evaluation Options</h2>
              <p className="text-[12px] text-muted mt-0.5">
                Choose an evaluation path to assess agent performance on this call.
              </p>
            </div>
            {call.status === "completed" && (
              <Link
                href={`/calls/${call.id}/score`}
                className="btn bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[12px] px-3.5 py-1.5 font-semibold"
              >
                View Existing Scorecard →
              </Link>
            )}
          </div>

          <AuditActions
            callId={call.id}
            status={call.status}
            onStatus={(status) =>
              setCall((prev) => ({ ...prev, status, error_message: null }))
            }
          />

          <div className="pt-2 flex items-center justify-between text-[12px] border-t border-slate-100">
            <span className="text-muted">Need to reprocess audio?</span>
            <button
              type="button"
              disabled={preparingBusy}
              onClick={() => void prepare()}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-ink font-medium"
            >
              {Icons.refresh}
              <span>{preparingBusy ? "Re-processing…" : "Re-transcribe recording"}</span>
            </button>
          </div>
        </section>
      )}

      {call.status === "failed" && !readyForAudit ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={preparingBusy}
            onClick={() => void prepare()}
            className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-4 py-2"
          >
            {preparingBusy ? "Retrying…" : "Retry Audio Transcription"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
