"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

const Icons = {
  audio: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  text: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
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
