"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { workspaceLanguages } from "@/lib/locale";
import type { LanguageMode } from "@/lib/types";

const ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/aac,audio/ogg,audio/webm,video/mp4,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.aac";

export function UploadForm() {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [agentName, setAgentName] = useState("");
  const [bilingual, setBilingual] = useState(true);
  const [languageMode, setLanguageMode] = useState<LanguageMode>("sw");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("agents")
      .select("id, name")
      .order("name")
      .then(({ data }) => setAgents(data || []));

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
      setError("Choose a recording first.");
      return;
    }
    setError(null);
    setDone(null);
    setLoading(true);
    setProgress("Uploading audio…");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("call-audio")
        .upload(path, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      setProgress("Saving the call record…");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-6 animate-in fade-in duration-500">
      <form onSubmit={onSubmit} className="panel space-y-8 rounded-2xl p-8 shadow-sm">
        <label
          className={`flex flex-col items-center justify-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 px-6 py-16 text-center group ${
            file
              ? "border-good/50 bg-good/5 shadow-inner"
              : "border-line/80 bg-surface-2 hover:border-blue hover:bg-blue-soft/50 hover:shadow-inner"
          }`}
        >
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div
            className={`flex items-center justify-center w-14 h-14 rounded-full mb-4 shadow-sm transition-transform duration-300 group-hover:scale-110 ${
              file ? "bg-good text-white" : "bg-white text-blue"
            }`}
          >
            {file ? "✓" : "↑"}
          </div>
          <p className="text-[17px] font-bold text-ink">
            {file ? "File ready to upload" : "Select or drop a recording"}
          </p>
          <p className="mt-2 text-[14px] font-medium text-muted max-w-sm leading-relaxed">
            {file ? (
              <span className="text-good">{file.name}</span>
            ) : bilingual ? (
              "Supported formats: MP3, WAV, M4A, MP4. Languages: Kiswahili, English, or Mixed."
            ) : (
              "Supported formats: MP3, WAV, M4A, MP4. Language: English only."
            )}
          </p>
        </label>

        <div className={`grid gap-6 ${bilingual ? "sm:grid-cols-2" : ""}`}>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-bold text-[13px] uppercase tracking-wide text-muted">Agent Name</span>
            <input
              list="agent-names"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Amina Mwangi"
              className="field bg-surface-2 shadow-inner"
            />
            <datalist id="agent-names">
              {agents.map((agent) => (
                <option key={agent.id} value={agent.name} />
              ))}
            </datalist>
          </label>

          {bilingual ? (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-bold text-[13px] uppercase tracking-wide text-muted">Spoken Language</span>
              <select
                value={languageMode}
                onChange={(e) => setLanguageMode(e.target.value as LanguageMode)}
                className="field bg-surface-2 shadow-inner"
              >
                <option value="sw">Kiswahili</option>
                <option value="mixed">Mixed English + Kiswahili</option>
                <option value="auto">Auto-detect</option>
                <option value="en">English</option>
              </select>
            </label>
          ) : null}
        </div>

        {error && <div className="alert-error text-[14px] shadow-sm">{error}</div>}

        {progress && (
          <div className="flex items-center gap-3 text-[14px] font-medium text-blue bg-blue-soft/50 p-4 rounded-xl">
            <div className="h-4 w-4 rounded-full border-2 border-blue/30 border-t-blue animate-spin"></div>
            {progress}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="btn btn-lg btn-blue w-full shadow-md shadow-blue/20 hover:-translate-y-0.5 active:translate-y-0 text-[16px] py-3.5"
        >
          {loading ? "Uploading…" : "Save to workspace"}
        </button>
      </form>

      {done && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <section className="panel rounded-2xl p-8 bg-gradient-to-br from-good/10 to-transparent border-good/20 shadow-good/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-good text-white font-bold shadow-sm">✓</div>
              <h2 className="text-xl font-bold text-good">Upload complete</h2>
            </div>

            <p className="mt-3 text-[15px] text-muted leading-relaxed">
              <span className="font-bold text-ink">{done.title}</span> is successfully stored in your workspace.
              The next step is to generate the speaker script.
            </p>

            <Link
              href={`/calls/${done.id}/transcribe`}
              className="btn btn-lg bg-good text-white hover:bg-good/90 shadow-md shadow-good/20 mt-6 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto text-center block"
            >
              Transcribe a call
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
