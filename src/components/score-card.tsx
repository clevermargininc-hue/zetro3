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
          {score.overall_score === 0 && score.metric_evidence?.raw_score ? (
            <span className="block mt-1 text-[13px] font-medium text-slate-500 line-through">
              Raw Score: {score.metric_evidence.raw_score}%
            </span>
          ) : null}
          <span className={`mt-2 ${scoreChipClass(score.overall_score)}`}>
            {verdictLabel(score.verdict)}
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              Scored from company files
            </span>
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
          {!score.metric_evidence?.document_references?.length ? (
            <p className="text-[12px] text-muted">
              Run documents audit again on this call to list each criterion from these files.
            </p>
          ) : null}
        </section>
      ) : null}

      {score.metric_evidence?.document_references?.length ? (
        <section className="surface p-5 space-y-3">
          <div>
            <h4 className="text-[14px] font-semibold text-ink">Document references</h4>
            <p className="text-[12px] text-muted mt-0.5">
              Each mark is tied to a criterion in a company file.
            </p>
          </div>
          <ul className="space-y-2 border-t border-line pt-3">
            {score.metric_evidence.document_references.map((row, index) => (
              <li key={`${row.file_name}-${index}`} className="text-[13px] text-slate-800 leading-relaxed">
                <span
                  className={`chip mr-2 ${
                    row.result === "hit" ? "chip-ok" : row.result === "miss" ? "chip-bad" : "chip-wait"
                  }`}
                >
                  {row.result}
                </span>
                <span className="font-medium">{row.file_name}</span>
                <span className="text-muted"> — {row.criterion}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Scorecard</h3>
          <p className="text-[12px] text-muted mt-0.5">Mapped from your company scorecard and scripts</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {DIMENSIONS.map((dim) => {
            const value = Number(score[dim.key] ?? 0);
            const evidence = score.metric_evidence?.[dim.key];

            return (
              <div key={dim.key} className="border border-line rounded-xl p-5 space-y-4 surface">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-semibold text-ink">{dim.label}</h4>
                        {evidence?.verdict && (
                          <span className={`chip ${evidence.verdict === "hit" ? "chip-ok" : evidence.verdict === "miss" ? "chip-bad" : "chip-wait"} text-[11px] py-0.5 uppercase`}>
                            {evidence.verdict}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-[14px] tabular-nums text-ink">{value}/100</span>
                    </div>
                    <div className="bar mt-2.5">
                      <span style={{ width: `${value}%` }} className={value < 50 ? 'bg-red-500' : value < 80 ? 'bg-amber-500' : 'bg-green-500'} />
                    </div>
                  </div>
                </div>

                {(evidence?.quote || evidence?.note || evidence?.source_file || evidence?.criterion) && (
                  <div className="pt-4 border-t border-line/70 space-y-2">
                    {evidence?.quote ? (
                      <p className="text-[13px] text-ink leading-relaxed border-l-2 border-blue pl-3">
                        “{evidence.quote}”
                      </p>
                    ) : null}
                    {evidence?.note ? (
                      <p className="text-[13px] text-slate-700 leading-relaxed">{evidence.note}</p>
                    ) : null}
                    {evidence?.source_file || evidence?.criterion ? (
                      <p className="text-[12px] text-muted">
                        {evidence.source_file ? <span>{evidence.source_file}</span> : null}
                        {evidence.source_file && evidence.criterion ? <span> · </span> : null}
                        {evidence.criterion ? <span>{evidence.criterion}</span> : null}
                      </p>
                    ) : null}
                  </div>
                )}
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
