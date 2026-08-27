"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { DeleteCallButton } from "@/components/delete-call-button";
import { AuditActions } from "@/components/audit-actions";
import { auditStatus, formatDate, formatDuration, languageLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus } from "@/lib/types";
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
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialScore: CallScore | null;
}) {
  const { call, setCall, audioUrl } = useCallLive(initialCall, initialScore);
  const [preparing, setPreparing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const autoPrepareStarted = useRef(false);

  const callId = call?.id ?? initialCall.id;
  const callStatus = call?.status ?? initialCall.status;
  const canAudit = readyForAudit(callStatus);
  const preparingBusy =
    preparing || callStatus === "transcribing" || callStatus === "queued";

  useEffect(() => {
    if (callStatus !== "queued" || autoPrepareStarted.current) return;
    autoPrepareStarted.current = true;
    let cancelled = false;
    void (async () => {
      setPreparing(true);
      setActionError(null);
      try {
        const res = await authFetch(`/api/calls/${callId}/transcribe`, {
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
        await waitForCallStatus(callId, ["transcribed", "completed", "failed"]);
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
  }, [callId, callStatus, setCall]);

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
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <Link
          href="/calls"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-blue mb-3"
        >
          {Icons.arrowLeft}
          <span>Back to Call Inventory</span>
        </Link>
        <PageHeader
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
                <span className="chip chip-ok">Audited & scored</span>
              ) : bucket === "transcribed" ? (
                <span className="chip">Ready to audit</span>
              ) : bucket === "failed" ? (
                <span className="chip chip-bad">Failed</span>
              ) : (
                <span className="chip chip-wait">
                  {call.status === "transcribing" ? "Preparing for audit…" : "Preparing…"}
                </span>
              )}
              <DeleteCallButton
                callId={call.id}
                title={call.title}
                status={call.status}
                redirectTo="/calls"
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
          <h2 className="text-[15px] font-semibold text-ink">Recording</h2>
          <p className="text-[12px] text-muted mt-0.5">
            Listen if you need to. The transcript stays on the server and is used only for scoring.
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

      {!canAudit ? (
        <section className="surface p-8 text-center space-y-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-[16px] font-semibold text-ink">
              {preparingBusy ? "Preparing this call for audit…" : "Prepare this call for audit"}
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {preparingBusy
                ? "The server is processing the recording so scoring can run. The transcript is not shown in the product."
                : "Start server-side processing so you can run an SOP or autonomous audit."}
            </p>

            {preparingBusy ? (
              <div className="mt-6 flex items-center justify-center gap-2.5 text-ink text-[13px] font-semibold surface py-3 px-4">
                <div className="h-4 w-4 rounded-full border-2 border-blue/30 border-t-blue animate-spin" />
                <span>Preparing audio for scoring…</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void prepare()}
                className="btn bg-blue hover:bg-blue-2 text-white text-[13px] font-semibold px-6 py-2.5 mt-5 inline-flex"
              >
                Prepare for audit
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="surface p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Audit this call</h2>
              <p className="text-[12px] text-muted mt-0.5">
                SOP scoring uses your Standards files. Autonomous scoring uses a professional QA rubric.
              </p>
            </div>
            {call.status === "completed" && (
              <Link
                href={`/calls/${call.id}/score`}
                className="btn btn-ghost text-[12px] px-3.5 py-1.5"
              >
                View scorecard
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
              <span>{preparingBusy ? "Re-processing…" : "Re-prepare for audit"}</span>
            </button>
          </div>
        </section>
      )}

      {call.status === "failed" && !canAudit ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={preparingBusy}
            onClick={() => void prepare()}
            className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-4 py-2"
          >
            {preparingBusy ? "Retrying…" : "Retry preparation"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
