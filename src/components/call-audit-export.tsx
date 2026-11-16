"use client";

import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { authFetch } from "@/lib/auth-fetch";

const Icons = {
  excel: <BrandIcon brand="excel" size={14} variant="mark" />,
  pdf: <FileText className="h-3.5 w-3.5 text-rose-600" />,
  print: <Printer className="h-3.5 w-3.5" />,
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
        className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-[12px] px-3 py-1.5 font-medium"
        disabled={Boolean(pending)}
        onClick={() => void download("xlsx")}
      >
        {Icons.excel}
        <span>{pending === "xlsx" ? "Exporting…" : "Excel"}</span>
      </button>
      <button
        type="button"
        className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-[12px] px-3 py-1.5 font-medium"
        disabled={Boolean(pending)}
        onClick={() => void download("pdf")}
      >
        {Icons.pdf}
        <span>{pending === "pdf" ? "Exporting…" : "PDF"}</span>
      </button>
      <button
        type="button"
        className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] px-3 py-1.5 font-medium"
        onClick={() => window.print()}
      >
        {Icons.print}
        <span>Print</span>
      </button>
      {error && <p className="alert-error ml-2 px-2.5 py-1 text-[11px]">{error}</p>}
    </div>
  );
}
