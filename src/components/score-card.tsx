import { verdictLabel } from "@/lib/format";
import { QA_KIND_LABELS } from "@/lib/qa-kinds";
import { scorecardRows } from "@/lib/scorecard-rows";
import { customerVoiceFromScore, stanceLabel } from "@/lib/customer-voice";
import type { CallScore } from "@/lib/types";
import { scoreChipClass } from "@/components/ui";
import type { CSSProperties } from "react";

export function ScoreCard({ score }: { score: CallScore }) {
  const rows = scorecardRows(score);
  const autoZero = score.metric_evidence?.auto_zero_applied === true;
  const favouredRaw = Number(score.metric_evidence?.raw_score);
  const favouredScore = Number.isFinite(favouredRaw) ? favouredRaw : null;
  const customerVoice = customerVoiceFromScore(score);
  const hasCustomerThemes =
    customerVoice.satisfaction_themes.length > 0 ||
    customerVoice.frustration_themes.length > 0 ||
    Boolean(customerVoice.note);

  return (
    <div className="space-y-5">
      <section className="surface p-5 sm:p-6 flex flex-col md:flex-row md:items-start gap-6">
        <div className="shrink-0 min-w-[140px]">
          <span className="kpi-label">Overall score</span>
          <div className="mt-3 flex items-center gap-4">
            <div
              className="score-ring grid h-20 w-20 place-items-center rounded-full"
              style={
                {
                  "--p": score.overall_score,
                  "--ring-color":
                    score.overall_score >= 70
                      ? "var(--good)"
                      : score.overall_score >= 50
                        ? "var(--warn)"
                        : "var(--rose)",
                } as CSSProperties
              }
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[18px] font-bold tabular-nums text-ink">
                {score.overall_score}
              </span>
            </div>
            <div>
              <span className="kpi-value">{score.overall_score}%</span>
              {autoZero && favouredScore != null ? (
                <span className="block mt-1 text-[13px] font-semibold text-ink">
                  Favoured Score: {favouredScore}%
                </span>
              ) : null}
              {autoZero ? (
                <span className="mt-1 block text-[12px] font-medium text-[color:var(--rose)]">
                  Auto Zero applied from company Standards
                </span>
              ) : null}
              <span className={`mt-2 ${scoreChipClass(score.overall_score)}`}>
                {verdictLabel(score.verdict)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">Scored from your scorecard</span>
            {autoZero ? <span className="chip">Auto Zero</span> : null}
            {customerVoice.stance !== "unknown" ? (
              <span className="chip capitalize">
                Customer: {stanceLabel(customerVoice.stance)}
              </span>
            ) : score.customer_sentiment ? (
              <span className="chip capitalize">Sentiment: {score.customer_sentiment}</span>
            ) : null}
          </div>
          <p className="text-[14px] leading-relaxed text-slate-700">{score.summary}</p>
        </div>
      </section>

      {hasCustomerThemes ? (
        <section className="surface p-5 space-y-4">
          <div>
            <h4 className="text-[14px] font-semibold text-ink">Customer voice</h4>
            <p className="text-[12px] text-muted mt-0.5">
              What this customer liked or complained about
            </p>
          </div>
          {customerVoice.note ? (
            <p className="text-[13px] leading-relaxed text-slate-700">{customerVoice.note}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">
                Satisfied about
              </p>
              {customerVoice.satisfaction_themes.length ? (
                <ul className="space-y-1.5">
                  {customerVoice.satisfaction_themes.map((theme) => (
                    <li key={theme} className="text-[13px] text-slate-700 leading-relaxed">
                      {theme}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">No satisfaction themes on this call.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted">
                Frustrated about
              </p>
              {customerVoice.frustration_themes.length ? (
                <ul className="space-y-1.5">
                  {customerVoice.frustration_themes.map((theme) => (
                    <li key={theme} className="text-[13px] text-slate-700 leading-relaxed">
                      {theme}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">No frustration themes on this call.</p>
              )}
            </div>
          </div>
          {customerVoice.quote ? (
            <p className="text-[12px] text-muted italic leading-relaxed border-t border-line pt-3">
              “{customerVoice.quote}”
            </p>
          ) : null}
        </section>
      ) : null}

      {score.standards_used?.length ? (
        <section className="surface p-5 space-y-3">
          <div>
            <h4 className="text-[14px] font-semibold text-ink">Files we read</h4>
            <p className="text-[12px] text-muted mt-0.5">
              Marks come from these files, not from a generic list.
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
            <div key={row.name} className="border border-line px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-[14px] font-semibold text-ink">{row.name}</h4>
                <span className="font-bold text-[14px] tabular-nums text-ink shrink-0">
                  {row.score}%
                </span>
              </div>
              <div className="bar">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, row.score))}%`,
                    background:
                      row.score >= 70
                        ? "var(--good)"
                        : row.score >= 50
                          ? "var(--warn)"
                          : "var(--rose)",
                  }}
                />
              </div>
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
                        "Score the call again to explain the points held back."}
                    </p>
                  ) : row.gap_note ? (
                    <p className="text-[13px] leading-relaxed text-slate-700">
                      <span className="font-medium text-ink">Deductions: </span>
                      {row.gap_note}
                    </p>
                  ) : null}
                  {!row.note && !row.gap_note ? (
                    <p className="text-[13px] text-muted">
                      Score this call again for a full breakdown of this mark.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-muted border-t border-line pt-4">
            Score this call again to see why each mark landed as it did and why any points were cut.
          </p>
        )}
      </section>
    </div>
  );
}
