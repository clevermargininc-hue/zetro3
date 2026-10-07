"use client";

import Link from "next/link";
import { DeleteCallButton } from "@/components/delete-call-button";
import { useCallLive } from "@/components/use-call-live";
import { ScoreCard } from "@/components/score-card";
import { AuditActions } from "@/components/audit-actions";
import { CallAuditExport } from "@/components/call-audit-export";
import { CallDownloads } from "@/components/call-downloads";
import { AuditPrintDocument } from "@/components/audit-print-document";
import { StandardsFilesPanel } from "@/components/standards-files-panel";
import { agentLabel, auditStatus, formatDate, formatDuration, languageLabel } from "@/lib/format";
import type { Call, CallScore } from "@/lib/types";
import { PageHeader } from "@/components/ui";

const Icons = {
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

export function ScoreWorkspace({
  initialCall,
  initialScore,
  initialHasTranscript = false,
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialScore: CallScore | null;
  initialHasTranscript?: boolean;
}) {
  const { call, setCall, score, hasTranscript } = useCallLive(
    initialCall,
    initialScore,
    initialHasTranscript,
  );
  const showScore = Boolean(score) && call.status === "completed";
  const busy = call.status === "analyzing";
  const canAudit = hasTranscript;
  const bucket = auditStatus(call.status);

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="no-print">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/upload/score"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#04B6DA] hover:text-[#039EBE]"
          >
            {Icons.arrowLeft}
            <span>Back to score queue</span>
          </Link>
        </div>
        <PageHeader
          kicker="Step 3 of 3 · Score"
          title={`Agent ${agentLabel(call)}`}
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
                <span className="chip chip-ok">Audited</span>
              ) : busy ? (
                <span className="chip chip-wait">Reading your scorecard…</span>
              ) : (
                <span className="chip">Ready to score</span>
              )}
              <CallDownloads callId={call.id} hasTranscript={hasTranscript} />
              {score ? <CallAuditExport callId={call.id} /> : null}
              <DeleteCallButton
                callId={call.id}
                title={call.title}
                status={call.status}
                redirectTo="/upload/score"
              />
            </>
          }
        />
      </div>

      {call.error_message && (
        <div className="alert-error no-print text-[13px]">{call.error_message}</div>
      )}

      {!canAudit && !busy && (
        <section className="surface no-print p-6 max-w-lg space-y-3">
          <h2 className="text-[16px] font-semibold text-ink">Finish Prepare first</h2>
          <p className="text-[13px] text-muted leading-relaxed">
            This recording is not ready to score. Return to Step 2, wait until it is prepared, then come back.
          </p>
          <Link
            href={`/upload/prepare/${call.id}`}
            className="btn btn-blue text-[13px] px-5 py-2 inline-flex"
          >
            Go to Prepare
          </Link>
        </section>
      )}

      {canAudit && !showScore && (
        <div className="no-print grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          <section className="surface p-6 space-y-4">
            {busy ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-6 w-6 rounded-full border-2 border-blue/30 border-t-blue animate-spin shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-[16px] font-semibold text-ink">Reading your scorecard, then scoring</h2>
                    <p className="mt-1 text-[13px] text-muted leading-relaxed">
                      We load your scorecard first, then mark the call against those rules only.
                    </p>
                  </div>
                </div>
                <AuditActions
                  callId={call.id}
                  status={call.status}
                  force
                  onStatus={(status) =>
                    setCall((prev) => ({ ...prev, status, error_message: null }))
                  }
                />
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Score this call</h2>
                  <p className="mt-1 text-[13px] text-muted leading-relaxed max-w-xl">
                    Check the files on the right are the right ones. Scoring does not start until you tap it, and it will not invent rules that are not in those files.
                  </p>
                </div>
                <AuditActions
                  callId={call.id}
                  status={call.status}
                  force={Boolean(score)}
                  onStatus={(status) =>
                    setCall((prev) => ({ ...prev, status, error_message: null }))
                  }
                />
              </>
            )}
          </section>
          <StandardsFilesPanel title="Files that will be read" />
        </div>
      )}

      {showScore && score && (
        <>
          <div className="no-print space-y-4">
            <ScoreCard score={score} />
            <div className="flex flex-wrap gap-2">
              <Link href="/calls" className="btn btn-blue text-[13px]">
                Open in Calls
              </Link>
              <Link href="/upload/score" className="btn btn-ghost text-[13px]">
                Score next recording
              </Link>
            </div>
          </div>
          <AuditPrintDocument call={call} score={score} />
        </>
      )}
    </div>
  );
}
