"use client";

import Link from "next/link";
import { DeleteCallButton } from "@/components/delete-call-button";
import { StatusPill, useCallLive } from "@/components/use-call-live";
import { ScoreCard } from "@/components/score-card";
import { AuditActions } from "@/components/audit-actions";
import { CallAuditExport } from "@/components/call-audit-export";
import { AuditPrintDocument } from "@/components/audit-print-document";
import type { Call, CallScore, Utterance } from "@/lib/types";

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <div className="no-print flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link href={`/calls/${call.id}/transcribe`} className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wide text-muted hover:text-ink transition-colors mb-4">
            ← Back to Transcript
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold tracking-tight text-ink">Score Report: {call.title}</h1>
             <StatusPill status={call.status} error={call.error_message} />
          </div>
          <p className="mt-3 text-[15px] font-medium text-muted">
            {call.agents?.name || "Unassigned agent"}
            {call.detected_language ? <span className="opacity-50 mx-2">•</span> : ""}
            {call.detected_language ? call.detected_language : ""}
          </p>
        </div>
        
        <div className="no-print flex flex-wrap items-center gap-3">
          {score ? <CallAuditExport callId={call.id} /> : null}
          <DeleteCallButton
            callId={call.id}
            title={call.title}
            status={call.status}
            redirectTo="/calls"
          />
        </div>
      </div>

      {call.error_message && <div className="alert-error no-print shadow-sm rounded-xl">{call.error_message}</div>}

      {hasScript && !score && !busy ? (
        <section className="panel no-print rounded-3xl p-10 shadow-md max-w-2xl mx-auto mt-12 bg-gradient-to-b from-surface to-surface-2 border-line/40 text-center">
          <div className="h-20 w-20 rounded-full bg-blue/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
             <span className="text-3xl">📊</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Score this Agent</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted max-w-lg mx-auto">
            Choose how you want to audit this call. Documents scoring reads your uploaded standards, while automatic auditing uses built-in criteria.
          </p>
          <div className="mt-10 border-t border-line/40 pt-8 text-left">
            <AuditActions
              callId={call.id}
              status={call.status}
              onStatus={(status) =>
                setCall((prev) => ({ ...prev, status, error_message: null }))
              }
            />
          </div>
        </section>
      ) : null}

      {busy && !score ? (
        <section className="panel no-print rounded-3xl px-6 py-24 text-center relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-soft/30 to-transparent animate-[shimmer_2s_infinite]"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="h-16 w-16 rounded-full border-4 border-blue/20 border-t-blue animate-spin mb-6 shadow-sm"></div>
             <p className="text-[22px] font-bold tracking-tight text-ink">Auditing this call...</p>
             <p className="mt-3 text-[15px] text-muted max-w-sm">
               The AI is analyzing the transcript to generate scores and coaching recommendations. This usually takes about a minute.
             </p>
          </div>
        </section>
      ) : null}

      {score ? (
        <>
          <div className="no-print mt-4 transition-all duration-500 hover:transform hover:-translate-y-1">
            <ScoreCard score={score} />
          </div>
          <AuditPrintDocument call={call} score={score} utterances={utterances} />
        </>
      ) : null}

      {!hasScript && !busy ? (
        <section className="panel no-print rounded-3xl p-10 text-center shadow-sm max-w-xl mx-auto mt-12 bg-surface">
          <div className="h-20 w-20 rounded-full bg-surface-2 mx-auto flex items-center justify-center mb-6">
             <span className="text-3xl opacity-50">📝</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">No Transcript Found</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            You need to transcribe the call first before you can score it.
          </p>
          <Link href={`/calls/${call.id}/transcribe`} className="btn btn-lg btn-blue shadow-lg shadow-blue/20 mt-8 transition-transform hover:-translate-y-1">
            Go to Transcript Page
          </Link>
        </section>
      ) : null}
    </div>
  );
}
