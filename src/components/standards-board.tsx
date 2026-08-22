"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import {
  QA_KIND_LABELS,
  QA_KINDS,
  SCRIPT_KINDS,
  type QaKind,
  type QaReadiness,
} from "@/lib/qa-kinds";

const KIND_HELP: Record<QaKind, string> = {
  document: "Scripts, product facts, and standard steps that agents must follow during calls.",
  scorecard: "The scoring rubric used to evaluate the conversation. Required to start a custom audit.",
  compliance: "Rules, disclosures, and prohibited behaviors. Any breaches are flagged on the audit.",
  opening:
    "Organization-wide opening script. Shared by all agents. Key terms here improve transcription and greeting scoring.",
  closing:
    "Organization-wide closing script. Shared by all agents. Key terms here improve transcription and wrap-up scoring.",
};

const FILE_ACCEPT =
  ".pdf,.docx,.txt,.md,.csv,.xml,.xlsx,.xls,.xlsm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/xml,text/xml,text/plain";

function KindSection({
  kind,
  readiness,
  pendingKind,
  onUpload,
  onRemove,
}: {
  kind: QaKind;
  readiness: QaReadiness | null;
  pendingKind: QaKind | null;
  onUpload: (kind: QaKind, file: File) => void;
  onRemove: (id: string) => void;
}) {
  const ok = (readiness?.counts[kind] || 0) > 0;
  const rows = (readiness?.documents || []).filter((doc) => doc.kind === kind);
  const required = (QA_KINDS as readonly string[]).includes(kind);

  return (
    <div
      className={`panel rounded-2xl p-6 transition-all duration-300 ${
        ok ? "border-l-4 border-l-blue shadow-sm" : "border-l-4 border-l-line shadow-none hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shadow-inner ${
                ok ? "bg-blue text-white" : "bg-surface-2 text-muted/50 border border-line"
              }`}
            >
              {ok ? "✓" : required ? "!" : "·"}
            </div>
            <h3 className="text-[18px] font-bold capitalize">{QA_KIND_LABELS[kind]}</h3>
            {!required ? (
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                Optional
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[14px] text-muted md:ml-10 max-w-xl leading-relaxed">
            {KIND_HELP[kind]}
          </p>

          {rows.length > 0 && (
            <div className="mt-5 md:ml-10 flex flex-wrap gap-2">
              {rows.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 bg-white/60 border border-line/50 rounded-full px-3 py-1.5 text-[13px] shadow-sm hover:shadow-md transition-shadow"
                >
                  <span
                    className={`font-medium truncate max-w-[200px] ${doc.has_text ? "text-ink" : "text-rose/80 line-through"}`}
                    title={`${doc.title} ${!doc.has_text ? "(Unreadable text)" : ""}`}
                  >
                    {doc.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(doc.id)}
                    className="text-rose/70 hover:text-rose font-bold px-1 ml-1"
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:w-64 flex-shrink-0 h-[100px] md:h-auto">
          <label className="flex h-full items-center justify-center cursor-pointer rounded-xl border border-dashed border-line/80 bg-surface-2 px-4 py-4 text-center transition-all duration-200 hover:border-blue hover:bg-blue-soft/50 hover:shadow-inner group">
            <input
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              disabled={pendingKind === kind}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload(kind, file);
              }}
            />
            <p className="text-[14px] font-semibold text-blue group-hover:scale-105 transition-transform">
              {pendingKind === kind ? "Reading file…" : "+ Upload File"}
            </p>
          </label>
        </div>
      </div>
    </div>
  );
}

export function StandardsBoard() {
  const [readiness, setReadiness] = useState<QaReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<QaKind | null>(null);

  async function refresh() {
    const res = await authFetch("/api/documents");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Could not load standards");
    setReadiness(body as QaReadiness);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load standards");
    });
  }, []);

  async function upload(kind: QaKind, file: File) {
    setError(null);
    setPendingKind(kind);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      form.append("title", file.name.replace(/\.[^.]+$/, ""));
      const res = await authFetch("/api/documents", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPendingKind(null);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await authFetch(`/api/documents/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not delete");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {readiness?.setupRequired ? (
        <div className="panel rounded-2xl p-6 bg-gradient-to-br from-blue-soft/50 to-transparent">
          <p className="page-kicker">One-time setup</p>
          <h2 className="mt-3 text-[17px] font-bold">Enable standards storage</h2>
          <p className="mt-2 text-[14px] leading-6 text-muted">
            Paste and run <code className="text-ink font-mono bg-white/50 px-1 rounded">supabase/qa-standards.sql</code> then{" "}
            <code className="text-ink font-mono bg-white/50 px-1 rounded">supabase/call-scripts.sql</code> in the
            Supabase SQL Editor, then come back and upload the files below.
          </p>
        </div>
      ) : null}

      <section
        className={`panel p-6 rounded-2xl flex items-center justify-between transition-colors duration-500 ${
          readiness?.ready
            ? "bg-gradient-to-r from-good/10 to-transparent border-good/20 shadow-good/5"
            : "bg-gradient-to-r from-rose/5 to-transparent border-rose/10 shadow-rose/5"
        }`}
      >
        <div>
          <h2 className={`text-[18px] font-bold ${readiness?.ready ? "text-good" : "text-rose/80"}`}>
            {readiness?.ready ? "✓ All systems ready" : "Setup incomplete"}
          </h2>
          <p className="text-[14px] text-muted mt-1">
            {readiness?.ready
              ? "Your custom audit pipeline has all the required context documents and is ready to score calls."
              : "You must upload at least one document for each required category below to enable custom audits."}
          </p>
        </div>
      </section>

      {error ? <p className="alert-error">{error}</p> : null}

      <div className="space-y-4">
        <div>
          <p className="page-kicker">Required for documents audit</p>
          <h2 className="mt-1 text-[17px] font-bold">Scorecard standards</h2>
        </div>
        {QA_KINDS.map((kind) => (
          <KindSection
            key={kind}
            kind={kind}
            readiness={readiness}
            pendingKind={pendingKind}
            onUpload={(k, f) => void upload(k, f)}
            onRemove={(id) => void remove(id)}
          />
        ))}
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <p className="page-kicker">Organization-wide</p>
          <h2 className="mt-1 text-[17px] font-bold">Opening & closing scripts</h2>
          <p className="mt-1 text-[14px] text-muted max-w-2xl">
            Shared by every agent. Used in the background for transcription key terms, language repair, and greeting/closing checks — the call transcript stays off the main audit screen.
          </p>
        </div>
        {SCRIPT_KINDS.map((kind) => (
          <KindSection
            key={kind}
            kind={kind}
            readiness={readiness}
            pendingKind={pendingKind}
            onUpload={(k, f) => void upload(k, f)}
            onRemove={(id) => void remove(id)}
          />
        ))}
      </div>
    </div>
  );
}
