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
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn bg-white border border-line/50 hover:border-blue/50 hover:text-blue shadow-sm text-ink transition-all px-4"
        disabled={Boolean(pending)}
        onClick={() => void download("xlsx")}
      >
        {pending === "xlsx" ? "Preparing Excel…" : "Excel"}
      </button>
      <button
        type="button"
        className="btn bg-white border border-line/50 hover:border-blue/50 hover:text-blue shadow-sm text-ink transition-all px-4"
        disabled={Boolean(pending)}
        onClick={() => void download("pdf")}
      >
        {pending === "pdf" ? "Preparing PDF…" : "PDF"}
      </button>
      <button 
        type="button" 
        className="btn bg-surface-2 text-ink hover:bg-line/40 transition-all px-4" 
        onClick={() => window.print()}
      >
        Print
      </button>
      {error ? <p className="alert-error ml-2 px-3 py-1 text-[12px]">{error}</p> : null}
    </div>
  );
}
