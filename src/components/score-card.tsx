import { verdictLabel } from "@/lib/format";
import { QA_KIND_LABELS } from "@/lib/qa-kinds";
import { scorecardRows } from "@/lib/scorecard-rows";
import type { CallScore } from "@/lib/types";
import { scoreChipClass } from "@/components/ui";

export function ScoreCard({ score }: { score: CallScore }) {
  const rows = scorecardRows(score);

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
        <h3 className="text-[14px] font-semibold text-ink">Scorecard</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between gap-4 border border-line px-4 py-3"
            >
              <h4 className="text-[14px] font-semibold text-ink">{row.name}</h4>
              <span className="font-bold text-[14px] tabular-nums text-ink shrink-0">
                {row.score}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Audit analysis</h3>
          <p className="text-[12px] text-muted mt-0.5">
            Why each parameter earned its score, and why any remaining points were cut
          </p>
        </div>
        {rows.some((row) => row.note || row.gap_note) ? (
          <ul className="space-y-3 border-t border-line pt-4">
            {rows.map((row) => {
              const cut = Math.max(0, 100 - row.score);
              return (
                <li key={row.name} className="border border-line px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-[14px] font-semibold text-ink">{row.name}</h4>
                    <span className="text-[13px] font-bold tabular-nums text-ink">
                      {row.score}%
                      {row.weight_pct != null ? (
                        <span className="ml-2 font-medium text-muted">
                          · weight {row.weight_pct}%
                        </span>
                      ) : null}
                      {cut > 0 ? (
                        <span className="ml-2 font-medium text-muted">({cut}% cut)</span>
                      ) : null}
                    </span>
                  </div>
                  {row.note ? (
                    <p className="text-[13px] leading-relaxed text-slate-700">
                      <span className="font-medium text-ink">Why {row.score}%: </span>
                      {row.note}
                    </p>
                  ) : null}
                  {cut > 0 ? (
                    <p className="text-[13px] leading-relaxed text-slate-700">
                      <span className="font-medium text-ink">Why {cut}% was cut: </span>
                      {row.gap_note ||
                        "Re-run the documents audit to explain the points held back."}
                    </p>
                  ) : row.gap_note ? (
                    <p className="text-[13px] leading-relaxed text-slate-700">
                      <span className="font-medium text-ink">Deductions: </span>
                      {row.gap_note}
                    </p>
                  ) : null}
                  {!row.note && !row.gap_note ? (
                    <p className="text-[13px] text-muted">
                      Re-run the documents audit for a full breakdown of this parameter.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-muted border-t border-line pt-4">
            Re-run the documents audit to see why each parameter scored as it did and why
            any points were cut.
          </p>
        )}
      </section>
    </div>
  );
}
