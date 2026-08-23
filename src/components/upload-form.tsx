"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { workspaceLanguages } from "@/lib/locale";
import type { LanguageMode } from "@/lib/types";

const ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/aac,audio/ogg,audio/webm,video/mp4,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.aac";

const Icons = {
  uploadCloud: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  audioFile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [agentName, setAgentName] = useState("");
  const [bilingual, setBilingual] = useState(true);
  const [languageMode, setLanguageMode] = useState<LanguageMode>("sw");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await authFetch("/api/settings");
        const data = (await response.json()) as {
          workspace?: { country?: string; languages?: { bilingual?: boolean; defaultMode?: LanguageMode } };
        };
        if (!response.ok) return;
        const langs =
          data.workspace?.languages || workspaceLanguages(data.workspace?.country);
        setBilingual(langs.bilingual !== false);
        setLanguageMode(langs.defaultMode || (langs.bilingual === false ? "en" : "sw"));
      } catch {
        // Keep Tanzania defaults if settings are unavailable.
      }
    })();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Please choose a recording to upload.");
      return;
    }
    setError(null);
    setDone(null);
    setLoading(true);
    setProgress("Uploading audio to secure storage…");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication expired. Please sign in again.");

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("call-audio")
        .upload(path, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      setProgress("Registering call metadata…");
      let agentId: string | null = null;
      const trimmedAgent = agentName.trim();
      if (trimmedAgent) {
        const { data: existing } = await supabase
          .from("agents")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", trimmedAgent)
          .maybeSingle();
        if (existing) {
          agentId = existing.id;
        } else {
          const { data: created, error: agentError } = await supabase
            .from("agents")
            .insert({ user_id: user.id, name: trimmedAgent })
            .select("id")
            .single();
          if (agentError) throw agentError;
          agentId = created.id;
        }
      }

      const savedTitle = file.name.replace(/\.[^.]+$/, "");
      const mode: LanguageMode = bilingual ? languageMode : "en";
      const { data: call, error: callError } = await supabase
        .from("calls")
        .insert({
          user_id: user.id,
          agent_id: agentId,
          title: savedTitle,
          file_name: file.name,
          audio_path: path,
          language_mode: mode,
          status: "queued",
        })
        .select("*")
        .single();
      if (callError) throw callError;

      setDone({ id: call.id, title: savedTitle });
      setFile(null);
      setLoading(false);
      setProgress(null);

      // Kick off background prep so the call is ready to audit after listening.
      void authFetch(`/api/calls/${call.id}/transcribe`, { method: "POST" }).catch(() => {
        // User can retry from the call page if this fails.
      });

      router.push(`/calls/${call.id}/transcribe`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload process encountered an error.");
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="bg-white rounded-xl p-6 sm:p-8 border border-line/70 shadow-sm space-y-6">
        {/* File Dropzone */}
        <div>
          <label
            className={`relative flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed transition-all p-8 text-center group ${
              file
                ? "border-emerald-400 bg-emerald-50/40"
                : "border-slate-300 bg-slate-50/50 hover:border-blue hover:bg-blue/5"
            }`}
          >
            <input
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3.5 transition-colors ${
                file
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 group-hover:text-blue group-hover:border-blue/30"
              }`}
            >
              {file ? Icons.check : Icons.uploadCloud}
            </div>

            <p className="text-[15px] font-bold text-ink">
              {file ? file.name : "Select or drag call recording"}
            </p>
            <p className="mt-1 text-[12px] text-muted max-w-sm">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · File ready to upload`
                : "Supported formats: MP3, WAV, M4A, AAC, MP4 (Up to 100MB)"}
            </p>
          </label>
        </div>

        {/* Inputs */}
        <div className={`grid gap-4 ${bilingual ? "sm:grid-cols-2" : ""}`}>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 block">
              Representative / Agent Name
            </label>
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Amina Mwangi"
              className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted">Enter agent name to link this call to their scorecard.</p>
          </div>

          {bilingual ? (
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 block">
                Language Model Scope
              </label>
              <select
                value={languageMode}
                onChange={(e) => setLanguageMode(e.target.value as LanguageMode)}
                className="field bg-slate-50/70 border-slate-200 text-ink text-[13px] font-medium"
              >
                <option value="sw">Kiswahili (Primary)</option>
                <option value="mixed">Bilingual: English + Kiswahili</option>
                <option value="auto">Auto-detect Language</option>
                <option value="en">English (Primary)</option>
              </select>
              <p className="text-[11px] text-muted">Optimizes bilingual diarization and vocabulary.</p>
            </div>
          ) : null}
        </div>

        {error && <div className="alert-error text-[13px]">{error}</div>}

        {progress && (
          <div className="flex items-center gap-3 text-[13px] font-medium text-blue bg-blue/10 p-3.5 rounded-lg border border-blue/20">
            <div className="h-4 w-4 rounded-full border-2 border-blue/30 border-t-blue animate-spin shrink-0" />
            <span>{progress}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !file}
            className="btn bg-blue hover:bg-blue-2 text-white shadow-sm w-full py-2.5 text-[14px] font-semibold"
          >
            {loading ? "Processing Upload…" : "Upload & Begin Processing"}
          </button>
        </div>
      </form>

      {/* Done notification */}
      {done && (
        <div className="bg-white rounded-xl p-6 border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[12px] font-bold">
              {Icons.check}
            </div>
            <h3 className="text-[15px] font-bold text-emerald-900">Recording Uploaded Successfully</h3>
          </div>
          <p className="text-[13px] text-slate-700">
            <span className="font-semibold">{done.title}</span> has been stored. Audio transcription and speaker diarization are running in the background.
          </p>
          <div className="pt-1">
            <Link
              href={`/calls/${done.id}/transcribe`}
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] px-4 py-2 font-semibold inline-flex"
            >
              View Transcription & Evaluation →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
