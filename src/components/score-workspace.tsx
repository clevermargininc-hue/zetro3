"use client";

import Link from "next/link";
import { DeleteCallButton } from "@/components/delete-call-button";
import { useCallLive } from "@/components/use-call-live";
import { ScoreCard } from "@/components/score-card";
import { AuditActions } from "@/components/audit-actions";
import { CallAuditExport } from "@/components/call-audit-export";
import { AuditPrintDocument } from "@/components/audit-print-document";
import { auditStatus, formatDate, formatDuration, languageLabel } from "@/lib/format";
import type { Call, CallScore, CallStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui";

const Icons = {
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

function readyForAudit(status: CallStatus) {
  return ["transcribed", "analyzing", "completed"].includes(status);
}

export function ScoreWorkspace({
  initialCall,
  initialScore,
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialScore: CallScore | null;
}) {
  const { call, setCall, score } = useCallLive(initialCall, initialScore);
  const busy = call.status === "analyzing";
  const canAudit = readyForAudit(call.status);
  const bucket = auditStatus(call.status);

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="no-print">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/calls/${call.id}/transcribe`}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-blue"
          >
            {Icons.arrowLeft}
            <span>Back to call</span>
          </Link>
          <span className="text-[12px] text-muted font-medium">Evaluation Report</span>
        </div>
        <PageHeader
          title={call.title || call.file_name || "Call"}
          description={[
            `Language: ${languageLabel(call.detected_language || call.language_mode)}`,
            call.duration_seconds ? `Duration: ${formatDuration(call.duration_seconds)}` : null,
            formatDate(call.created_at),
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <>
              {bucket === "audited" ? (
                <span className="chip chip-ok">Audited & scored</span>
              ) : (
                <span className="chip chip-wait">Analyzing…</span>
              )}
              {score ? <CallAuditExport callId={call.id} /> : null}
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

      {call.error_message && (
        <div className="alert-error no-print text-[13px]">{call.error_message}</div>
      )}

      {canAudit && !score && !busy && (
        <section className="surface no-print p-8 max-w-xl mx-auto mt-8 text-center space-y-4">
          <h2 className="text-[16px] font-semibold text-ink">Score this interaction</h2>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            Scoring uses your uploaded Standards files (scorecard, compliance, and process documents).
          </p>
          <div className="pt-2 text-left">
            <AuditActions
              callId={call.id}
              status={call.status}
              onStatus={(status) =>
                setCall((prev) => ({ ...prev, status, error_message: null }))
              }
            />
          </div>
        </section>
      )}

      {busy && !score && (
        <section className="surface no-print p-12 text-center space-y-4 max-w-lg mx-auto mt-8">
          <div className="h-8 w-8 rounded-full border-3 border-blue/20 border-t-blue animate-spin mx-auto" />
          <h2 className="text-[16px] font-semibold text-ink">Quality audit in progress…</h2>
          <p className="text-[13px] text-muted max-w-sm mx-auto leading-relaxed">
            The server is scoring greeting, compliance, empathy, and resolution from the private transcript.
          </p>
        </section>
      )}

      {score && (
        <>
          <div className="no-print">
            <ScoreCard score={score} />
          </div>
          <AuditPrintDocument call={call} score={score} />
        </>
      )}

      {!canAudit && !busy && (
        <section className="surface no-print p-8 text-center max-w-md mx-auto mt-8 space-y-3">
          <h2 className="text-[16px] font-semibold text-ink">Not ready to audit yet</h2>
          <p className="text-[13px] text-muted">
            The server is still preparing this recording. Open the call to start or wait for processing.
          </p>
          <div className="pt-2">
            <Link
              href={`/calls/${call.id}/transcribe`}
              className="btn bg-blue hover:bg-blue-2 text-white text-[13px] px-5 py-2 font-semibold inline-flex"
            >
              Open call
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
