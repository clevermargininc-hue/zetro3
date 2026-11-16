"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

const Icons = {
  audio: <Download className="h-3.5 w-3.5" />,
  text: <FileText className="h-3.5 w-3.5" />,
};

async function saveDownload(res: Response, fallback: string) {
  const blob = await res.blob();
  const name =
    res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || fallback;
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function CallDownloads({
  callId,
  hasTranscript = false,
  compact = false,
}: {
  callId: string;
  hasTranscript?: boolean;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<"audio" | "transcript" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(kind: "audio" | "transcript") {
    setPending(kind);
    setError(null);
    try {
      const res = await authFetch(`/api/calls/${callId}/download?kind=${kind}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not download");
      }
      await saveDownload(res, kind === "audio" ? "call-audio" : "transcript.txt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download");
    } finally {
      setPending(null);
    }
  }

  const btn = compact
    ? "btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-2.5 py-1.5"
    : "btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[12px] px-3 py-1.5 font-medium";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={btn}
        disabled={Boolean(pending)}
        onClick={() => void download("audio")}
      >
        {Icons.audio}
        <span>{pending === "audio" ? "Downloading…" : compact ? "Audio" : "Download recording"}</span>
      </button>
      {hasTranscript ? (
        <button
          type="button"
          className={btn}
          disabled={Boolean(pending)}
          onClick={() => void download("transcript")}
        >
          {Icons.text}
          <span>{pending === "transcript" ? "Downloading…" : compact ? "Transcript" : "Download transcript"}</span>
        </button>
      ) : null}
      {error ? <p className="text-[11px] text-rose">{error}</p> : null}
    </div>
  );
}
