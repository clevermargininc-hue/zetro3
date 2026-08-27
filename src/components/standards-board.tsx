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
  document: "Product documentation, service protocols, and standard operating procedures (SOPs) agents must follow.",
  scorecard: "The evaluation rubric, weightings, and grading criteria used to score conversations.",
  compliance: "Mandatory regulatory disclosures, risk rules, and prohibited statements flagged during audits.",
  opening:
    "Standardized opening greeting and identity verification script. Key terms improve transcription accuracy.",
  closing:
    "Standardized closing statement and resolution confirmation script. Key terms improve wrap-up scoring.",
  holding:
    "Your company's hold / wait / check-back procedure. Optional — skip if you have no hold policy. Audits use it only when a call actually goes on hold.",
};

const FILE_ACCEPT =
  ".pdf,.docx,.txt,.md,.csv,.xml,.xlsx,.xls,.xlsm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/xml,text/xml,text/plain";

const Icons = {
  document: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  scorecard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  compliance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  hold: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  script: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  upload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  trash: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  checkCircle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

function getKindIcon(kind: QaKind) {
  switch (kind) {
    case "scorecard":
      return Icons.scorecard;
    case "compliance":
      return Icons.compliance;
    case "opening":
    case "closing":
      return Icons.script;
    case "holding":
      return Icons.hold;
    default:
      return Icons.document;
  }
}

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
      className={`bg-white rounded-lg p-5 border shadow-sm transition-all duration-200 ${
        ok ? "border-line hover:border-slate-300" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm shrink-0 ${
                ok
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : required
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : "bg-slate-50 text-slate-400 border border-slate-200"
              }`}
            >
              {getKindIcon(kind)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-ink capitalize">{QA_KIND_LABELS[kind]}</h3>
                {required ? (
                  <span className="text-[11px] font-semibold px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Required
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2 py-0.2 rounded bg-slate-50 text-slate-500 border border-slate-200">
                    Optional
                  </span>
                )}
                {ok && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                    {Icons.checkCircle}
                    <span>Active ({rows.length})</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted leading-relaxed">
                {KIND_HELP[kind]}
              </p>
            </div>
          </div>

          {/* Uploaded Documents List */}
          {rows.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
              {rows.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] hover:bg-white hover:border-slate-300 transition-all"
                >
                  <span
                    className={`font-semibold truncate max-w-[240px] ${
                      doc.has_text ? "text-slate-800" : "text-rose-600 line-through"
                    }`}
                    title={`${doc.title} ${!doc.has_text ? "(Unreadable content)" : ""}`}
                  >
                    {doc.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(doc.id)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors ml-1"
                    title="Remove document"
                  >
                    {Icons.trash}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Button / Dropzone */}
        <div className="md:w-56 shrink-0">
          <label className="flex h-full min-h-[52px] items-center justify-center cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-center transition-all duration-200 hover:border-blue hover:bg-blue/5 hover:text-blue group">
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
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 group-hover:text-blue transition-colors">
              {Icons.upload}
              <span>{pendingKind === kind ? "Processing file…" : "Upload Document"}</span>
            </div>
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
    <div className="space-y-6">
      {readiness?.setupRequired ? (
        <div className="bg-white rounded-lg p-5 border border-amber-200 bg-amber-50/50 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
            Database Setup Required
          </span>
          <h2 className="text-[15px] font-bold text-ink">Enable standards storage</h2>
          <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">
            Run <code className="text-ink font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">supabase/qa-standards.sql</code> and{" "}
            <code className="text-ink font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">supabase/holding-procedure.sql</code> in the
            Supabase SQL Editor, then refresh this page.
          </p>
        </div>
      ) : null}

      {/* System Readiness Banner */}
      <section
        className={`bg-white rounded-lg p-5 border shadow-sm flex items-center justify-between transition-colors ${
          readiness?.ready
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-slate-200"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                readiness?.ready ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            />
            <h2 className={`text-[15px] font-bold ${readiness?.ready ? "text-emerald-800" : "text-ink"}`}>
              {readiness?.ready
                ? "Organization QA Standards Active"
                : "Custom Audit Setup Incomplete"}
            </h2>
          </div>
          <p className="text-[13px] text-muted mt-1">
            {readiness?.ready
              ? "All required rubric standards and compliance documents are configured for custom AI evaluations."
              : "Upload at least one document for each required category below to enable standard-specific audits."}
          </p>
        </div>
      </section>

      {error && <p className="alert-error">{error}</p>}

      {/* Required Scorecard Standards */}
      <div className="space-y-3.5">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Evaluation Scorecards & Governance</h2>
          <p className="text-[12px] text-muted">Required files for SOP-driven quality evaluations</p>
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

      {/* Organization Scripts */}
      <div className="space-y-3.5 pt-4 border-t border-slate-100">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Organization Call Scripts</h2>
          <p className="text-[12px] text-muted">
            Opening, closing, and holding procedures are optional. Upload only the ones your company uses. Holding is scored only when a call actually goes on hold.
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
