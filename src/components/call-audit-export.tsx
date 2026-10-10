"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

const Icons = {
  excel: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="17" />
      <line x1="16" y1="13" x2="8" y2="17" />
    </svg>
  ),
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  print: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
};

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
        className="btn btn-ghost px-3 py-1.5 text-[12px]"
        disabled={Boolean(pending)}
        onClick={() => void download("xlsx")}
      >
        {Icons.excel}
        <span>{pending === "xlsx" ? "Exporting…" : "Excel"}</span>
      </button>
      <button
        type="button"
        className="btn btn-ghost px-3 py-1.5 text-[12px]"
        disabled={Boolean(pending)}
        onClick={() => void download("pdf")}
      >
        {Icons.pdf}
        <span>{pending === "pdf" ? "Exporting…" : "PDF"}</span>
      </button>
      <button
        type="button"
        className="btn btn-ghost px-3 py-1.5 text-[12px]"
        onClick={() => window.print()}
      >
        {Icons.print}
        <span>Print</span>
      </button>
      {error && <p className="alert-error ml-2 px-2.5 py-1 text-[11px]">{error}</p>}
    </div>
  );
}
