"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { useQaReadiness } from "@/components/use-qa-readiness";
import { StandardsRequiredNotice } from "@/components/standards-required-notice";
import type { AuditMode, CallStatus } from "@/lib/types";

const Icons = {
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
          {pending === "documents" ? "Reading files…" : "Score from company files"}
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
            <h3 className="text-[14px] font-semibold text-ink">
              Reading company files, then scoring…
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Scorecard, compliance, and process documents are loaded before any mark is assigned.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 max-w-lg">
          <div className="space-y-4">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Score from company files</h3>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">
                Uses only the scorecard, compliance, and process files in Standards. Required phrases and product names come from those files, not from a generic rubric.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void start("documents")}
              className="btn btn-blue text-[13px] font-semibold w-full justify-center py-2.5"
            >
              <span>Start documents audit</span>
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
            "Please upload your scorecard, compliance, and process files under Standards before scoring."
          }
        />
      )}

      {error && !showStandardsGate && <p className="alert-error text-[13px]">{error}</p>}
    </div>
  );
}
