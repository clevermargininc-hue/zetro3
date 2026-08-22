"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { DeleteCallButton } from "@/components/delete-call-button";
import { StatusPill, useCallLive } from "@/components/use-call-live";
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[900px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link
            href="/calls"
            className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wide text-muted hover:text-ink transition-colors mb-4"
          >
            ← Back to Inventory
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-ink">{call.title}</h1>
            <StatusPill status={call.status} error={call.error_message} />
          </div>
          <p className="mt-3 text-[15px] font-medium text-muted">
            {call.agents?.name || "Unassigned agent"}
            {call.detected_language ? <span className="opacity-50 mx-2">•</span> : null}
            {call.detected_language || null}
          </p>
        </div>
        <DeleteCallButton
          callId={call.id}
          title={call.title}
          status={call.status}
          redirectTo="/calls"
        />
      </div>

      {(actionError || call.error_message) && (
        <div className="alert-error shadow-sm rounded-xl">{actionError || call.error_message}</div>
      )}

      <section className="panel rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-ink">Listen to the call</h2>
          <p className="text-[14px] text-muted mt-1">
            Play the recording, then audit when preparation finishes.
          </p>
        </div>
        {audioUrl ? (
          <audio controls src={audioUrl} className="w-full" preload="metadata" />
        ) : (
          <p className="text-sm text-muted">Loading audio…</p>
        )}
      </section>

      {!readyForAudit ? (
        <section className="panel rounded-3xl p-8 shadow-md text-center bg-gradient-to-b from-surface to-surface-2 border-line/40">
          <h2 className="text-xl font-bold tracking-tight text-ink">
            {preparingBusy ? "Preparing audit…" : "Prepare for audit"}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted max-w-lg mx-auto">
            {preparingBusy
              ? "Getting this call ready to score. You can keep listening while this finishes."
              : "One click prepares this call for scoring in the background."}
          </p>
          {!preparingBusy ? (
            <button
              type="button"
              onClick={() => void prepare()}
              className="btn btn-lg btn-blue shadow-lg shadow-blue/20 mt-6 px-10"
            >
              Prepare for audit
            </button>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-3 text-blue text-[14px] font-medium">
              <div className="h-5 w-5 rounded-full border-2 border-blue/30 border-t-blue animate-spin" />
              Working…
            </div>
          )}
        </section>
      ) : (
        <section className="panel rounded-2xl p-5 sm:p-6 shadow-sm border border-line/50 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-bold tracking-tight text-ink">Audit this call</h2>
              <p className="text-[13px] text-muted mt-0.5">
                Ready to score. Choose an auditing path.
              </p>
            </div>
            {call.status === "completed" ? (
              <Link
                href={`/calls/${call.id}/score`}
                className="btn bg-good/10 text-good hover:bg-good/20 border border-good/20"
              >
                View score report →
              </Link>
            ) : null}
          </div>
          <AuditActions
            callId={call.id}
            status={call.status}
            onStatus={(status) =>
              setCall((prev) => ({ ...prev, status, error_message: null }))
            }
          />
          <div className="pt-1">
            <button
              type="button"
              disabled={preparingBusy}
              onClick={() => void prepare()}
              className="btn btn-ghost text-[13px] text-muted"
            >
              {preparingBusy ? "Re-preparing…" : "Re-prepare from audio"}
            </button>
          </div>
        </section>
      )}

      {call.status === "failed" && !readyForAudit ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={preparingBusy}
            onClick={() => void prepare()}
            className="btn btn-ghost text-[13px] text-muted"
          >
            {preparingBusy ? "Re-preparing…" : "Re-prepare from audio"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
