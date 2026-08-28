"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { useQaReadiness } from "@/components/use-qa-readiness";
import { StandardsRequiredNotice } from "@/components/standards-required-notice";
import type { AuditMode, CallStatus } from "@/lib/types";

const Icons = {
  document: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  sparkles: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  arrowRight: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

export function AuditActions({
  callId,
  status,
  compact = false,
  onStatus,
}: {
  callId: string;
  status: CallStatus;
  compact?: boolean;
  onStatus?: (status: CallStatus) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<AuditMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStandardsGate, setShowStandardsGate] = useState(false);
  const { blocked, blockedMessage } = useQaReadiness();
  const busy = pending !== null || status === "analyzing";

  async function start(mode: AuditMode) {
    if (mode === "documents" && blocked) {
      setShowStandardsGate(true);
      setError(blockedMessage);
      return;
    }

    setError(null);
    setShowStandardsGate(false);
    setPending(mode);
    onStatus?.("analyzing");
    try {
      const res = await authFetch(`/api/calls/${callId}/score`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.code === "STANDARDS_REQUIRED") {
          setShowStandardsGate(true);
        }
        throw new Error(body.error || "Could not start audit");
      }
      await waitForCallStatus(callId, ["completed"]);
      router.push(`/calls/${callId}/score`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      onStatus?.("transcribed");
    } finally {
      setPending(null);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void start("documents")}
          className="btn bg-blue hover:bg-blue-2 text-white text-[12px] px-3 py-1.5 font-medium"
        >
          {pending === "documents" ? "Scoring with SOPs…" : "SOP Standards Audit"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {busy ? (
        <div className="p-6 surface flex items-center gap-4">
          <div className="h-6 w-6 rounded-full border-2 border-blue/30 border-t-blue animate-spin shrink-0" />
          <div>
            <h3 className="text-[14px] font-bold text-ink">
              Evaluating Call Against Organization SOP Rubrics…
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Scoring agent greeting, empathy, compliance breaches, and resolution against uploaded standards.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 max-w-lg">
          {/* Card 1: SOP Standards Audit */}
          <div className="surface p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-slate-500 shrink-0">{Icons.document}</span>
                <div>
                  <h3 className="text-[14px] font-bold text-ink">SOP & Scorecard Audit</h3>
                  <span className="chip">Standards-driven</span>
                </div>
              </div>
              <p className="text-[12px] text-muted leading-relaxed">
                Evaluates the conversation strictly against your organization&apos;s uploaded scorecard rubrics, product facts, and compliance rules.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void start("documents")}
              className="btn bg-blue hover:bg-blue-2 text-white text-[13px] font-semibold w-full justify-center py-2"
            >
              <span>Score via SOP Standards</span>
              {Icons.arrowRight}
            </button>
          </div>
        </div>
      )}

      {showStandardsGate && (
        <StandardsRequiredNotice
          message={
            blockedMessage ||
            error ||
            "Please upload your scorecard rubric and compliance files under Standards before running an SOP audit."
          }
        />
      )}

      {error && !showStandardsGate && <p className="alert-error text-[13px]">{error}</p>}
    </div>
  );
}
