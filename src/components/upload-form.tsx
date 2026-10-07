"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import {
  FILE_ACCEPT,
  ZIP_ACCEPT,
  filesFromDataTransfer,
  expandIncomingFiles,
  mergeAudioPicks,
  isZipFile,
  type AudioPick,
} from "@/lib/audio-files";

const Icons = {
  uploadCloud: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  zip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8v13H3V3h12" />
      <path d="M21 8h-6V3" />
      <path d="M10 12h.01" />
      <path d="M10 16h.01" />
      <path d="M10 8h.01" />
    </svg>
  ),
  files: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

type DoneCall = { id: string; title: string };
type FailedCall = { title: string; error: string };

export function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<DoneCall[]>([]);
  const [failed, setFailed] = useState<FailedCall[]>([]);

  useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  }, []);



  function addFiles(list: File[]) {
    void handleDropAndUpload(list);
  }

  async function handleDropAndUpload(list: File[]) {
    if (loading || !list.length) return;
    setDone([]);
    setFailed([]);
    setError(null);
    setLoading(true);
    const hasZip = list.some(isZipFile);
    if (hasZip) setProgress("Opening ZIP and listing recordings…");

    let validPicks: AudioPick[] = [];
    try {
      const expanded = await expandIncomingFiles(list);
      const merged = mergeAudioPicks([], expanded.files);
      validPicks = merged.files;
      const allSkipped = [...expanded.skipped, ...merged.skipped];
      if (!validPicks.length) {
        setError(
          allSkipped.length
            ? `No audio recordings found. ${allSkipped.slice(0, 3).join("; ")}`
            : "No audio recordings found. Use MP3, WAV, M4A, AAC, MP4, OGG, WEBM, or a ZIP of those files.",
        );
        setLoading(false);
        setProgress(null);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read those files.");
      setLoading(false);
      setProgress(null);
      return;
    }

    // Process upload immediately
    const uploaded: DoneCall[] = [];
    const errors: FailedCall[] = [];

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication expired. Please sign in again.");

      for (let i = 0; i < validPicks.length; i++) {
        const pick = validPicks[i];
        const title = pick.label.replace(/\.[^.]+$/, "") || "Untitled call";
        setProgress(`Uploading ${i + 1} of ${validPicks.length} · ${pick.label}`);
        try {
          const safeName = pick.label.replace(/[^\w.\-]+/g, "_");
          const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("call-audio")
            .upload(path, pick.file, {
              contentType: pick.file.type || "audio/mpeg",
              upsert: false,
            });
          if (uploadError) throw uploadError;

          const created = await authFetch("/api/calls", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              audio_path: path,
              file_name: pick.relativePath || pick.label,
              title,
            }),
          });
          const body = (await created.json().catch(() => ({}))) as {
            call?: { id: string };
            error?: string;
          };
          if (!created.ok || !body.call?.id) {
            throw new Error(body.error || "Could not register this recording");
          }

          uploaded.push({ id: body.call.id, title });
        } catch (err) {
          errors.push({
            title,
            error: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }

      setDone(uploaded);
      setFailed(errors);
      setLoading(false);
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload process encountered an error.");
      setDone(uploaded);
      setFailed(errors);
      setLoading(false);
      setProgress(null);
    }
  }

  async function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    addFiles(await filesFromDataTransfer(event.dataTransfer));
  }
  return (
    <div className="space-y-6">
      <div className="surface p-6 sm:p-8 space-y-6">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles([...(e.target.files || [])]);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles([...(e.target.files || [])]);
              e.target.value = "";
            }}
          />
          <input
            ref={zipInputRef}
            type="file"
            accept={ZIP_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles([...(e.target.files || [])]);
              e.target.value = "";
            }}
          />

          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOver(false);
            }}
            onDrop={(e) => void onDrop(e)}
            className={`border border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-[#04B6DA] bg-[#04B6DA]/10"
                : "border-[#E3EBFB] bg-white hover:bg-[#F3F6FD]"
            }`}
          >
            <div className="mx-auto mb-3.5 flex items-center justify-center text-[#061C52]">
              {Icons.uploadCloud}
            </div>
            <p className="text-[15px] font-semibold text-ink">
              Drop files, a folder, or a ZIP of calls
            </p>
            <p className="mt-1 text-[12px] text-muted max-w-sm mx-auto">
              MP3, WAV, M4A, AAC, MP4, OGG, WEBM, or ZIP · up to 100MB each · 100 files per batch
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost text-[12px] px-3.5 py-1.5 font-semibold"
              >
                {Icons.files}
                Choose files
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = folderInputRef.current;
                  if (!el) return;
                  el.setAttribute("webkitdirectory", "");
                  el.setAttribute("directory", "");
                  el.click();
                }}
                className="btn btn-ghost text-[12px] px-3.5 py-1.5 font-semibold"
              >
                {Icons.folder}
                Choose folder
              </button>
              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                className="btn btn-ghost text-[12px] px-3.5 py-1.5 font-semibold"
              >
                {Icons.zip}
                Choose ZIP
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert-error text-[13px]">{error}</div>}

        {progress && (
          <div className="flex items-center gap-3 text-[13px] font-medium text-ink surface p-3.5 border border-[#E3EBFB]">
            <div className="h-4 w-4 rounded-full border-2 border-[#E3EBFB] border-t-[#04B6DA] animate-spin shrink-0" />
            <span>{progress}</span>
          </div>
        )}
      </div>

      {(done.length > 0 || failed.length > 0) && (
        <div className="surface p-6 space-y-4">
          <div>
            <span className="chip chip-ok">Step 1 complete</span>
            <h3 className="mt-2 text-[15px] font-semibold text-ink">
              {done.length} recording{done.length === 1 ? "" : "s"} in Prepare
            </h3>
            <p className="mt-1 text-[13px] text-muted">
              Files are stored. Open Prepare next. Scoring does not start until you reach Step 3.
            </p>
          </div>
          {failed.length > 0 && (
            <p className="text-[13px] text-[#B91C1C]">
              {failed.length} failed: {failed.map((row) => `${row.title} (${row.error})`).join("; ")}
            </p>
          )}
          <div className="pt-1 flex flex-wrap gap-2 relative z-10">
            <Link
              href={done.length === 1 ? `/upload/prepare/${done[0].id}` : "/upload/prepare"}
              prefetch={false}
              className="btn btn-blue text-[13px] px-4 py-2"
            >
              Continue to Prepare
            </Link>
            {done.length > 1 ? (
              <Link
                href={`/upload/prepare/${done[0].id}`}
                prefetch={false}
                className="btn btn-ghost text-[13px] px-4 py-2"
              >
                Open first recording
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
