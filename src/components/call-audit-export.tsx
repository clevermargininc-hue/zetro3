"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

export function CallAuditExport({ callId }: { callId: string }) {
  const [pending, setPending] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "xlsx" | "pdf") {
    setPending(format);
    setError(null);
    try {
      const res = await authFetch(`/api/calls/${callId}/export?format=${format}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not download this audit");
      }
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
        `zetro-audit.${format}`;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download this audit");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-blue"
          disabled={Boolean(pending)}
          onClick={() => void download("xlsx")}
        >
          {pending === "xlsx" ? "Preparing Excel…" : "Download Excel"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={Boolean(pending)}
          onClick={() => void download("pdf")}
        >
          {pending === "pdf" ? "Preparing PDF…" : "Download PDF"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
          Print audit
        </button>
      </div>
      <p className="text-sm text-muted">
        Excel and PDF include scores, compliance, standards, and the full agent/customer script.
        Print opens the browser print dialog for this audit.
      </p>
      {error ? <p className="alert-error">{error}</p> : null}
    </div>
  );
}
