"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { waitForCallStatus } from "@/lib/wait-call-status";
import { useQaReadiness } from "@/components/use-qa-readiness";
import { StandardsRequiredNotice } from "@/components/standards-required-notice";
import type { AuditMode, CallStatus } from "@/lib/types";

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

  return (
    <div className="space-y-3">
      <div className={compact ? "flex flex-col gap-2" : "grid gap-3 sm:grid-cols-2"}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void start("documents")}
          className={compact ? "btn btn-outline" : "btn btn-lg btn-outline"}
        >
          {pending === "documents" ? "Reading standards…" : "Documents scoring / audit"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void start("automatic")}
          className={compact ? "btn btn-blue" : "btn btn-lg btn-blue"}
        >
          {pending === "automatic" ? "Automatic audit…" : "Automatic auditing"}
        </button>
      </div>
      {busy ? (
        <p className="text-sm text-muted">
          {pending === "automatic"
            ? "The system is scoring from its own quality judgment. Company files are not used."
            : "The system is reading your uploaded scorecard, compliance, and process files, then scoring the agent from those files only."}
        </p>
      ) : compact ? null : (
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>
            Documents scoring reads your Standards files first. If none are uploaded, you will be
            sent to Standards.
          </p>
          <p>
            Automatic auditing does not use company files. The system scores greeting, empathy,
            resolution, and similar service quality from the transcript.
          </p>
        </div>
      )}
      {showStandardsGate ? (
        <StandardsRequiredNotice
          message={
            blockedMessage ||
            error ||
            "Upload a process document, scorecard, and compliance file before documents scoring."
          }
        />
      ) : null}
      {error && !showStandardsGate ? <p className="alert-error">{error}</p> : null}
    </div>
  );
}
