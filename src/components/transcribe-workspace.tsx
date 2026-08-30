"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { DeleteCallButton } from "@/components/delete-call-button";
import { CallDownloads } from "@/components/call-downloads";
import { auditStatus, formatDate, formatDuration, languageLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus, Utterance } from "@/lib/types";
import { useCallLive } from "@/components/use-call-live";
import { PageHeader } from "@/components/ui";

const Icons = {
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

function readyForAudit(status: CallStatus | undefined | null) {
  return status === "transcribed" || status === "analyzing" || status === "completed";
}

export function TranscribeWorkspace({
  initialCall,
  initialScore,
  initialUtterances = [],
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialScore: CallScore | null;
  initialUtterances?: Utterance[];
}) {
  const { call, setCall, audioUrl, utterances } = useCallLive(
    initialCall,
    initialScore,
    initialUtterances,
  );
  const [preparing, setPreparing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const startedFor = useRef<string | null>(null);

  const callId = call?.id ?? initialCall.id;
  const callStatus = call?.status ?? initialCall.status;
  const hasTranscript = utterances.length > 0;
  const canScore = readyForAudit(callStatus) || hasTranscript;
  const preparingBusy =
    (preparing || callStatus === "transcribing" || callStatus === "queued") &&
    !hasTranscript;

  useEffect(() => {
    if (hasTranscript || readyForAudit(callStatus) || callStatus === "failed") {
      return;
    }
    if (callStatus !== "queued" && callStatus !== "transcribing") return;
    if (startedFor.current === callId) return;
    startedFor.current = callId;
    let cancelled = false;
    void (async () => {
      setPreparing(true);
      setActionError(null);
      try {
        const res = await authFetch(`/api/calls/${callId}/transcribe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ force: false }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          status?: CallStatus;
          reused?: boolean;
        };
        if (!res.ok) throw new Error(body.error || "Could not prepare call");
        if (cancelled) return;
        if (body.reused) {
          setCall((prev) => ({
            ...prev,
            status: (body.status as CallStatus) || prev.status,
            error_message: null,
          }));
          return;
        }
        setCall((prev) => ({
          ...prev,
          status: "transcribing" as CallStatus,
          error_message: null,
        }));
        await waitForCallStatus(callId, ["transcribed", "completed", "failed"]);
      } catch (error) {
        if (!cancelled) {
          startedFor.current = null;
          setActionError(error instanceof Error ? error.message : "Action failed");
        }
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => {
      cancelled = true;
      setPreparing(false);
    };
  }, [callId, callStatus, hasTranscript, setCall]);

  async function prepare(force = false) {
    setActionError(null);
    setPreparing(true);
    try {
      const res = await authFetch(`/api/calls/${call.id}/transcribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: CallStatus;
        reused?: boolean;
      };
      if (!res.ok) throw new Error(body.error || "Could not prepare call");
      if (body.reused && !force) {
        setCall((prev) => ({
          ...prev,
          status: (body.status as CallStatus) || prev.status,
          error_message: null,
        }));
        return;
      }
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
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <Link
          href="/upload/prepare"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-blue mb-3"
        >
          {Icons.arrowLeft}
            <span>Back to prepare queue</span>
        </Link>
        <PageHeader
          kicker="Step 2 of 3 · Prepare"
          title={call.title || call.file_name || "Call"}
          description={[
            `Language: ${languageLabel(call.detected_language || call.language_mode)}`,
            call.duration_seconds ? formatDuration(call.duration_seconds) : null,
            formatDate(call.created_at),
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <>
              {bucket === "audited" ? (
                <span className="chip chip-ok">Audited</span>
              ) : bucket === "transcribed" ? (
                <span className="chip">Ready to score</span>
              ) : bucket === "failed" ? (
                <span className="chip chip-bad">Failed</span>
              ) : (
                <span className="chip chip-wait">
                  {call.status === "transcribing" ? "Transcribing…" : "Preparing…"}
                </span>
              )}
              <CallDownloads callId={call.id} hasTranscript={false} />
              <DeleteCallButton
                callId={call.id}
                title={call.title}
                status={call.status}
                redirectTo="/upload/prepare"
              />
            </>
          }
        />
      </div>

      {(actionError || call.error_message) && (
        <div className="alert-error text-[13px]">{actionError || call.error_message}</div>
      )}

      <section className="surface p-6 space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Listen to the recording</h2>
          <p className="text-[12px] text-muted mt-0.5">
            Transcripts stay internal. You score on the next step, from company files.
          </p>
        </div>
        <div className="border border-line bg-slate-50 p-3">
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" preload="metadata" />
          ) : (
            <p className="py-2 text-center text-[13px] text-muted">Loading recording…</p>
          )}
        </div>
      </section>

      {!canScore ? (
        <section className="surface p-6 space-y-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">
              {preparingBusy ? "Preparing this recording…" : "Prepare this recording"}
            </h2>
            <p className="mt-1 text-[13px] text-muted max-w-lg">
              {preparingBusy
                ? "Speakers and language are being prepared for scoring. Stay on this step until it finishes."
                : "Start preparation. Do not open Score until this step is done."}
            </p>
          </div>
          {preparingBusy ? (
            <div className="flex items-center gap-2.5 text-ink text-[13px] font-medium border border-line px-4 py-3">
              <div className="h-4 w-4 rounded-full border-2 border-blue/30 border-t-blue animate-spin" />
              <span>Working on the recording…</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void prepare(false)}
              className="btn btn-blue text-[13px] px-5 py-2.5"
            >
              Start prepare
            </button>
          )}
        </section>
      ) : (
        <section className="surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="chip chip-ok">Ready for Step 3</span>
            <h2 className="mt-2 text-[15px] font-semibold text-ink">Go to Score</h2>
            <p className="text-[12px] text-muted mt-0.5">
              Listen here if you need to. Scoring reads your Standards files, not a generic rubric.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={preparingBusy}
              onClick={() => void prepare(true)}
              className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-ink font-medium"
            >
              {Icons.refresh}
              <span>{preparingBusy ? "Re-processing…" : "Re-prepare"}</span>
            </button>
            <Link
              href={`/upload/score/${callId}`}
              prefetch={false}
              className="btn btn-blue text-[13px] px-4 py-2"
            >
              Go to Score
            </Link>
          </div>
        </section>
      )}

      {call.status === "failed" && !canScore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={preparingBusy}
            onClick={() => void prepare(false)}
            className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-4 py-2"
          >
            {preparingBusy ? "Retrying…" : "Retry preparation"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
