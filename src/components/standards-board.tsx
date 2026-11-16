"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Pause,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import {
  QA_KIND_LABELS,
  QA_KINDS,
  SCRIPT_KINDS,
  type QaKind,
  type QaReadiness,
} from "@/lib/qa-kinds";

const KIND_HELP: Record<QaKind, string> = {
  document: "Product documentation, SOPs, and key terms. Scoring and transcription take company names and phrases from these files — not from the call.",
  scorecard: "The evaluation rubric, weightings, and grading criteria used to score conversations.",
  compliance: "Mandatory regulatory disclosures, risk rules, and prohibited statements flagged during audits.",
  opening:
    "Standardized opening greeting and identity verification script. Required phrases come from this file.",
  closing:
    "Standardized closing statement and resolution confirmation script. Required wrap-up phrases come from this file.",
  holding:
    "Your company's hold / wait / check-back procedure. Optional — skip if you have no hold policy. Audits use it only when a call actually goes on hold.",
};

const FILE_ACCEPT =
  ".pdf,.docx,.txt,.md,.csv,.xml,.xlsx,.xls,.xlsm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/xml,text/xml,text/plain";

const Icons = {
  document: <FileText className="h-[18px] w-[18px]" />,
  scorecard: <ClipboardCheck className="h-[18px] w-[18px]" />,
  compliance: <ShieldCheck className="h-[18px] w-[18px]" />,
  hold: <Pause className="h-[18px] w-[18px]" />,
  script: <MessageSquare className="h-[18px] w-[18px]" />,
  upload: <Upload className="h-[15px] w-[15px]" />,
  trash: <Trash2 className="h-[13px] w-[13px]" />,
  checkCircle: <CheckCircle2 className="h-4 w-4" />,
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
  onRemove: (id: string, title: string) => void;
}) {
  const ok = (readiness?.counts[kind] || 0) > 0;
  const rows = (readiness?.documents || []).filter((doc) => doc.kind === kind);
  const required = (QA_KINDS as readonly string[]).includes(kind);

  return (
    <div className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex items-center justify-center w-7 h-7 shrink-0 text-muted">
              {getKindIcon(kind)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[14px] font-semibold text-ink capitalize">{QA_KIND_LABELS[kind]}</h3>
                {required ? (
                  <span className="chip">Required</span>
                ) : (
                  <span className="chip">Optional</span>
                )}
                {ok && (
                  <span className="chip chip-ok">
                    {Icons.checkCircle}
                    <span>Active ({rows.length})</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">
                {KIND_HELP[kind]}
              </p>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 pl-10">
              {rows.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded border border-line px-2.5 py-1 text-[12px]"
                >
                  <span
                    className={`font-medium truncate max-w-[220px] ${doc.has_text ? "text-ink" : "text-rose line-through"
                      }`}
                    title={`${doc.title} ${!doc.has_text ? "(Unreadable content)" : doc.chars ? `(${doc.chars.toLocaleString()} characters)` : ""}`}
                  >
                    {doc.title}
                  </span>
                  {doc.chars ? (
                    <span className="text-[11px] text-muted font-mono font-normal">
                      · {(doc.chars / 1000).toFixed(1)}k chars
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemove(doc.id, doc.title)}
                    className="text-muted hover:text-rose p-0.5"
                    title="Remove document"
                    aria-label={`Remove ${doc.title}`}
                  >
                    {Icons.trash}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:w-48 shrink-0 md:pl-0 pl-10">
          <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-md border border-dashed border-line bg-bg px-3 py-2.5 text-center hover:border-navy hover:bg-blue-soft/60 group">
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
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink group-hover:text-navy transition-colors">
              {Icons.upload}
              <span>{pendingKind === kind ? "Processing…" : "Upload"}</span>
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

  function refresh() {
    return authFetch("/api/documents").then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not load standards");
      setReadiness(body as QaReadiness);
    });
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

  async function remove(id: string, title: string) {
    if (!window.confirm(`Remove "${title}" from your organization standards?`)) return;
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
        <div className="surface p-5">
          <span className="chip chip-wait mb-2">Database setup required</span>
          <h2 className="text-[15px] font-bold text-ink mt-2">Enable standards storage</h2>
          <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">
            Run <code className="text-ink font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">supabase/qa-standards.sql</code> and{" "}
            <code className="text-ink font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">supabase/holding-procedure.sql</code> in the
            Supabase SQL Editor, then refresh this page.
          </p>
        </div>
      ) : null}

      <section className="surface p-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[15px] font-bold text-ink">
              {readiness?.ready
                ? "Organization QA Standards Active"
                : "Custom Audit Setup Incomplete"}
            </h2>
            <span className={readiness?.ready ? "chip chip-ok" : "chip chip-wait"}>
              {readiness?.ready ? "Ready" : "Incomplete"}
            </span>
          </div>
          <p className="text-[13px] text-muted mt-1">
            {readiness?.ready
              ? "All required rubric standards and compliance documents are configured for custom AI evaluations."
              : "Upload at least one document for each required category below to enable standard-specific audits."}
          </p>
        </div>
      </section>

      {error && <p className="alert-error">{error}</p>}

      <div className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Evaluation scorecards &amp; governance</h2>
          <p className="text-[12px] text-muted">Required files for SOP-driven quality evaluations</p>
        </div>
        <div className="surface px-5 py-2">
          {QA_KINDS.map((kind) => (
            <KindSection
              key={kind}
              kind={kind}
              readiness={readiness}
              pendingKind={pendingKind}
              onUpload={(k, f) => void upload(k, f)}
              onRemove={(id, title) => void remove(id, title)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Organization call scripts</h2>
          <p className="text-[12px] text-muted">
            Opening, closing, and holding are optional. Holding is scored only when a call goes on hold.
          </p>
        </div>
        <div className="surface px-5 py-2">
          {SCRIPT_KINDS.map((kind) => (
            <KindSection
              key={kind}
              kind={kind}
              readiness={readiness}
              pendingKind={pendingKind}
              onUpload={(k, f) => void upload(k, f)}
              onRemove={(id, title) => void remove(id, title)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
