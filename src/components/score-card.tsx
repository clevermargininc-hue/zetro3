import { verdictLabel } from "@/lib/format";
import { QA_KIND_LABELS } from "@/lib/qa-kinds";
import type { CallScore, ScoreDimension } from "@/lib/types";
import { scoreChipClass } from "@/components/ui";

const DIMENSIONS: { key: ScoreDimension; label: string }[] = [
  { key: "greeting", label: "Greeting & Identity" },
  { key: "empathy", label: "Empathy & Active Listening" },
  { key: "professionalism", label: "Professional Demeanor" },
  { key: "resolution", label: "Issue Resolution & Next Steps" },
  { key: "communication", label: "Communication Clarity" },
  { key: "language_handling", label: "Language Mix Handling" },
];

export function ScoreCard({ score }: { score: CallScore }) {
  return (
    <div className="space-y-5">
      <section className="surface p-5 sm:p-6 flex flex-col md:flex-row md:items-start gap-6">
        <div className="shrink-0 min-w-[140px]">
          <span className="kpi-label">Overall score</span>
          <span className="kpi-value mt-1">{score.overall_score}%</span>
          <span className={`mt-2 ${scoreChipClass(score.overall_score)}`}>
            {verdictLabel(score.verdict)}
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              {score.audit_mode === "automatic" ? "Autonomous audit" : "SOP standards audit"}
            </span>
            {score.customer_sentiment && (
              <span className="chip capitalize">Sentiment: {score.customer_sentiment}</span>
            )}
          </div>
          <p className="text-[14px] leading-relaxed text-slate-700">{score.summary}</p>
        </div>
      </section>

      <section className="surface p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Scorecard</h3>
          <p className="text-[12px] text-muted mt-0.5">Six quality dimensions</p>
        </div>
        <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((dim) => {
            const value = Number(score[dim.key] ?? 0);
            return (
              <div key={dim.key} className="space-y-1.5">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-700">{dim.label}</span>
                  <span className="font-medium tabular-nums text-ink">{value}</span>
                </div>
                <div className="bar">
                  <span style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key Strengths & Coaching Analysis Grid */}
      <section className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Strengths */}
        <AnalysisCard
          title="Strengths"
          subtitle="Behaviors that met the expected standard"
          items={score.strengths}
          emptyText="No specific strengths recorded for this call."
        />

        <div className="space-y-5">
          <AnalysisCard
            title="Coaching focus"
            subtitle="Where performance can improve"
            items={score.improvements}
            emptyText="No critical improvement gaps noted."
          />

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

          {/* Compliance Findings */}
          <AnalysisCard
            title="Compliance"
            subtitle="Required disclosures and prohibited behaviors"
            items={score.compliance_findings}
            emptyText="No compliance breaches identified."
          />
        </div>
      </section>

      {/* Standards Referenced */}
      {score.standards_used?.length ? (
        <section className="surface p-5 space-y-3">
          <h4 className="text-[13px] font-medium text-muted">Standards used</h4>
          <div className="flex flex-wrap gap-2">
            {score.standards_used.map((doc) => (
              <div key={doc.id} className="chip">
                {QA_KIND_LABELS[doc.kind] || doc.kind}: {doc.title}
              </div>
            ))}
          </div>
        </section>
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
    (item) => item && item.toLowerCase() !== "none identified" && item.trim().length > 0
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
            <li key={idx} className="text-[13px] text-slate-800 leading-relaxed pl-3 border-l border-line">
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
