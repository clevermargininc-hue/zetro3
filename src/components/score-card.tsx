"use client";

import { useState } from "react";
import { verdictLabel } from "@/lib/format";
import { QA_KIND_LABELS } from "@/lib/qa-kinds";
import { scorecardRows, type ScorecardRow } from "@/lib/scorecard-rows";
import type { CallScore } from "@/lib/types";
import { scoreChipClass } from "@/components/ui";

function formatClock(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ScoreCard({ score }: { score: CallScore }) {
  const rows = scorecardRows(score);
  const [openName, setOpenName] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <section className="surface p-5 sm:p-6 flex flex-col md:flex-row md:items-start gap-6">
        <div className="shrink-0 min-w-[140px]">
          <span className="kpi-label">Overall score</span>
          <span className="kpi-value mt-1">{score.overall_score}%</span>
          {score.overall_score === 0 && score.metric_evidence?.raw_score ? (
            <span className="block mt-1 text-[13px] font-medium text-slate-500">
              Favoured Score: {score.metric_evidence.raw_score}%
            </span>
          ) : null}
          <span className={`mt-2 ${scoreChipClass(score.overall_score)}`}>
            {verdictLabel(score.verdict)}
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">Scored from company files</span>
            {score.customer_sentiment && (
              <span className="chip capitalize">Sentiment: {score.customer_sentiment}</span>
            )}
          </div>
          <p className="text-[14px] leading-relaxed text-slate-700">{score.summary}</p>
        </div>
      </section>

      {score.standards_used?.length ? (
        <section className="surface p-5 space-y-3">
          <div>
            <h4 className="text-[14px] font-semibold text-ink">Company files read</h4>
            <p className="text-[12px] text-muted mt-0.5">
              Marks come from these uploaded files, not from a generic rubric.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {score.standards_used.map((doc) => (
              <div key={doc.id} className="chip">
                {QA_KIND_LABELS[doc.kind] || doc.kind}: {doc.title}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Scorecard</h3>
          <p className="text-[12px] text-muted mt-0.5">
            Tap a parameter to see why it scored that way and the transcript evidence.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <ParameterEvidenceCard
              key={row.name}
              row={row}
              open={openName === row.name}
              onToggle={() =>
                setOpenName((current) => (current === row.name ? null : row.name))
              }
            />
          ))}
        </div>
      </section>

      {(score.metric_evidence?.holding ||
        (Array.isArray(score.compliance_findings) &&
          score.compliance_findings.some(
            (item) => item && item.toLowerCase() !== "none identified",
          ))) && (
        <section className="grid gap-6 lg:grid-cols-2 items-start">
          {score.metric_evidence?.holding ? (
            <AnalysisCard
              title="Holding procedure"
              subtitle={
                score.metric_evidence.holding.verdict === "hit"
                  ? "Hold/wait heard and checked against the company holding procedure"
                  : "Hold/wait heard — compared with the company holding procedure"
              }
              items={
                score.metric_evidence.holding.findings?.length
                  ? score.metric_evidence.holding.findings
                  : [score.metric_evidence.holding.note]
              }
              emptyText="Hold was reviewed; no extra notes."
            />
          ) : null}

          <AnalysisCard
            title="Compliance"
            subtitle="Required disclosures and prohibited behaviors"
            items={score.compliance_findings}
            emptyText="No compliance breaches identified."
          />
        </section>
      )}
    </div>
  );
}

function ParameterEvidenceCard({
  row,
  open,
  onToggle,
}: {
  row: ScorecardRow;
  open: boolean;
  onToggle: () => void;
}) {
  const clock = formatClock(row.start_s);
  const hasEvidence = Boolean(row.note?.trim() || row.quote?.trim());

  return (
    <div
      className={`border border-line transition-colors ${
        open ? "bg-slate-50/80 border-slate-300" : "bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <h4 className="text-[14px] font-semibold text-ink pr-2">{row.name}</h4>
        <span className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-[14px] tabular-nums text-ink">{row.score}%</span>
          <span
            className={`text-muted text-[12px] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </button>

      {open ? (
        <div className="border-t border-line px-4 py-3 space-y-3">
          {row.note?.trim() ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Why this score
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{row.note}</p>
            </div>
          ) : null}

          {row.quote?.trim() ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Transcript evidence
                {clock ? ` · ${clock}` : ""}
              </p>
              <blockquote className="mt-1 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-slate-800 italic">
                “{row.quote}”
              </blockquote>
            </div>
          ) : null}

          {!hasEvidence ? (
            <p className="text-[13px] text-muted">
              Re-run the documents audit to attach transcript evidence for this company
              parameter.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AnalysisCard({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: string[] | null;
  emptyText: string;
}) {
  const list = (Array.isArray(items) ? items : []).filter(
    (item) => item && item.toLowerCase() !== "none identified" && item.trim().length > 0,
  );

  return (
    <div className="surface p-5 space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
      {list.length > 0 ? (
        <ul className="space-y-2 border-t border-line pt-3">
          {list.map((item, idx) => (
            <li
              key={idx}
              className="text-[13px] text-slate-800 leading-relaxed pl-3 border-l border-line"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted border-t border-line pt-3">{emptyText}</p>
      )}
    </div>
  );
}
