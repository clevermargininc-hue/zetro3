"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, FileArchive, FileAudio, FolderOpen, UploadCloud, X } from "lucide-react";
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
  uploadCloud: <UploadCloud className="h-6 w-6" />,
  folder: <FolderOpen className="h-4 w-4" />,
  zip: <FileArchive className="h-4 w-4" />,
  files: <FileAudio className="h-4 w-4" />,
  check: <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />,
  close: <X className="h-3.5 w-3.5" />,
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

  // Optional Customer Journey metadata
  const [callerPhone, setCallerPhone] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [location, setLocation] = useState("");

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
              ...(callerPhone.trim() ? { caller_phone: callerPhone.trim() } : {}),
              ...(customerRef.trim()
                ? { external_customer_ref: customerRef.trim() }
                : {}),
              ...(location.trim() ? { location: location.trim() } : {}),
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
        {/* Optional Customer Identity & Journey Metadata */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-md border border-line bg-surface/50 p-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Caller Phone / MSISDN (Optional)
            </label>
            <input
              type="text"
              value={callerPhone}
              onChange={(e) => setCallerPhone(e.target.value)}
              placeholder="e.g. 0712345678 or +255712345678"
              className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Customer / CRM ID (Optional)
            </label>
            <input
              type="text"
              value={customerRef}
              onChange={(e) => setCustomerRef(e.target.value)}
              placeholder="e.g. CUST-10042"
              className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Location / Region (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dar es Salaam, Arusha, Nairobi"
              className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink"
            />
          </div>
        </div>

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
            className={`rounded-md border border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-navy bg-blue-soft/60"
                : "border-line bg-slate-50 hover:bg-slate-100/50"
            }`}
          >
            <div className="mx-auto mb-3.5 flex items-center justify-center text-slate-500">
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
          <div className="flex items-center gap-3 text-[13px] font-medium text-ink surface p-3.5 border border-line">
            <div className="h-4 w-4 rounded-full border-2 border-blue/30 border-t-blue animate-spin shrink-0" />
            <span>{progress}</span>
          </div>
        )}
      </div>

      {(done.length > 0 || failed.length > 0) && (
        <div className="surface p-6 space-y-4">
          {done.length > 0 ? (
            <div>
              <span className="chip chip-ok">Step 1 complete</span>
              <h3 className="mt-2 text-[15px] font-semibold text-ink">
                {done.length} recording{done.length === 1 ? "" : "s"} in Prepare
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                Files are stored. Open Prepare next. Scoring does not start until you reach Step 3.
              </p>
            </div>
          ) : (
            <div>
              <span className="chip chip-bad">Upload failed</span>
              <h3 className="mt-2 text-[15px] font-semibold text-ink">
                No recordings were uploaded
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                Check your connection or file format and try uploading again.
              </p>
            </div>
          )}

          {failed.length > 0 && (
            <p className="text-[13px] text-rose">
              {failed.length} failed: {failed.map((row) => `${row.title} (${row.error})`).join("; ")}
            </p>
          )}

          {done.length > 0 ? (
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
          ) : (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-blue text-[13px] px-4 py-2"
              >
                Try uploading again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
