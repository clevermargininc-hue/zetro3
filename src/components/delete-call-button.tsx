"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";
import type { CallStatus } from "@/lib/types";

function isBusy(status: CallStatus) {
  return status === "transcribing" || status === "analyzing";
}

export function DeleteCallButton({
  callId,
  title,
  status,
  onDeleted,
  redirectTo,
  compact = false,
}: {
  callId: string;
  title?: string | null;
  status: CallStatus;
  onDeleted?: () => void;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = isBusy(status);

  async function remove() {
    const label = title?.trim() || "this call";
    if (
      !window.confirm(
        `Delete “${label}” permanently? This removes the recording, transcript, and score.`,
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/calls/${callId}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not delete call");
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete call");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={compact ? "inline-flex flex-col items-start gap-1" : "space-y-2"}>
      <button
        type="button"
        disabled={pending || busy}
        onClick={() => void remove()}
        title={busy ? "Wait until transcription or scoring finishes" : "Delete this call"}
        className={
          compact
            ? "text-[13px] font-bold text-[#B91C1C]/80 hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40"
            : "btn btn-ghost border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10"
        }
      >
        {pending ? "Deleting…" : compact ? "Delete" : "Delete call"}
      </button>
      {error ? <p className="text-xs text-[#B91C1C]">{error}</p> : null}
    </div>
  );
}
