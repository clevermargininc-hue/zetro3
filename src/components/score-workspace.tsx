"use client";

import Link from "next/link";
import { DeleteCallButton } from "@/components/delete-call-button";
import { useCallLive } from "@/components/use-call-live";
import { ScoreCard } from "@/components/score-card";
import { AuditActions } from "@/components/audit-actions";
import { CallAuditExport } from "@/components/call-audit-export";
import { AuditPrintDocument } from "@/components/audit-print-document";
import { auditStatus, formatDate, formatDuration, languageLabel } from "@/lib/format";
import type { Call, CallScore, Utterance } from "@/lib/types";

const Icons = {
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  headphones: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
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

export function ScoreWorkspace({
  initialCall,
  initialUtterances,
  initialScore,
}: {
  initialCall: Call & { agents?: { name: string } | null };
  initialUtterances: Utterance[];
  initialScore: CallScore | null;
}) {
  const { call, setCall, utterances, score } = useCallLive(
    initialCall,
    initialUtterances,
    initialScore,
  );
  const busy = call.status === "analyzing";
  const hasScript = utterances.length > 0;
  const bucket = auditStatus(call.status);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="no-print pb-5 border-b border-line/60 space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/calls/${call.id}/transcribe`}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-blue transition-colors"
          >
            {Icons.arrowLeft}
            <span>Back to Call Stream</span>
          </Link>
          <span className="text-[12px] text-muted font-medium">Evaluation Report</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink truncate max-w-2xl">
                {call.title || call.file_name}
              </h1>
              {bucket === "audited" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Audited & Scored
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Analyzing…
                </span>
              )}
            </div>

            {/* Metadata strip */}
            <div className="mt-2 flex items-center gap-3 text-[12px] text-muted flex-wrap">
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  {getInitials(call.agents?.name || "Unassigned")}
                </div>
                <span className="font-semibold text-slate-700">{call.agents?.name || "Unassigned"}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-slate-600">Language:</span>
                <span className="font-semibold text-ink">{languageLabel(call.detected_language || call.language_mode)}</span>
              </span>
              {call.duration_seconds && (
                <>
                  <span>•</span>
                  <span>Duration: {formatDuration(call.duration_seconds)}</span>
                </>
              )}
              <span>•</span>
              <span>{formatDate(call.created_at)}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="no-print flex flex-wrap items-center gap-2 lg:ml-auto">
            {score ? <CallAuditExport callId={call.id} /> : null}
            <DeleteCallButton
              callId={call.id}
              title={call.title}
              status={call.status}
              redirectTo="/calls"
            />
          </div>
        </div>
      </div>

      {call.error_message && (
        <div className="alert-error no-print text-[13px]">{call.error_message}</div>
      )}

      {/* When waiting for audit */}
      {hasScript && !score && !busy && (
        <section className="bg-white no-print rounded-xl p-8 border border-line/70 shadow-sm max-w-xl mx-auto mt-8 text-center space-y-4">
          <h2 className="text-[16px] font-bold text-ink">Score this Interaction</h2>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            Select an evaluation pathway below to generate agent performance metrics.
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

      {/* Analyzing state */}
      {busy && !score && (
        <section className="bg-white no-print rounded-xl p-12 border border-line/70 shadow-sm text-center space-y-4 max-w-lg mx-auto mt-8">
          <div className="h-8 w-8 rounded-full border-3 border-blue/20 border-t-blue animate-spin mx-auto" />
          <h2 className="text-[16px] font-bold text-ink">AI Quality Audit in Progress…</h2>
          <p className="text-[13px] text-muted max-w-sm mx-auto leading-relaxed">
            The system is evaluating greeting protocols, compliance disclosures, empathy, and problem resolution from the conversation transcript.
          </p>
        </section>
      )}

      {/* Main Scorecard View */}
      {score && (
        <>
          <div className="no-print">
            <ScoreCard score={score} />
          </div>
          <AuditPrintDocument call={call} score={score} utterances={utterances} />
        </>
      )}

      {/* Fallback when not ready */}
      {!hasScript && !busy && (
        <section className="bg-white no-print rounded-xl p-8 border border-line/70 shadow-sm text-center max-w-md mx-auto mt-8 space-y-3">
          <h2 className="text-[16px] font-bold text-ink">Recording Not Ready for Evaluation</h2>
          <p className="text-[13px] text-muted">
            The audio transcript is still being prepared. Return to the call stream to check progress.
          </p>
          <div className="pt-2">
            <Link
              href={`/calls/${call.id}/transcribe`}
              className="btn bg-blue hover:bg-blue-2 text-white text-[13px] px-5 py-2 font-semibold inline-flex"
            >
              Open Call Stream →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
