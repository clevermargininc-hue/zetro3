import Link from "next/link";
import { scoreChipClass } from "@/components/ui";
import { ZetroMark } from "@/components/logo";
import type { QaBriefing, QaReport, ReportDelta } from "@/lib/reports";

function signed(delta: number) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function DeltaHint({ row, suffix = "" }: { row: ReportDelta; suffix?: string }) {
  if (row.previous == null || row.delta == null) {
    return <span className="kpi-hint">No prior period yet</span>;
  }
  const word = row.delta === 0 ? "unchanged" : row.delta > 0 ? "up" : "down";
  return (
    <span className="kpi-hint">
      {word} {row.delta === 0 ? "" : signed(row.delta)}
      {suffix} vs {row.previous}
      {suffix}
    </span>
  );
}

export function ReportBriefing({
  report,
  briefing,
}: {
  report: QaReport;
  briefing: QaBriefing;
}) {
  const d = briefing.deltas;

  return (
    <article className="qa-briefing surface overflow-hidden">
      <header className="border-b border-line bg-navy px-6 py-6 text-white">
        <div className="flex items-center gap-3">
          <ZetroMark className="h-10 w-10" />
          <div>
            <p className="text-[18px] font-bold tracking-tight">Zetro</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-soft">QA briefing</p>
          </div>
        </div>
        <h2 className="mt-5 font-display text-[22px] font-semibold tracking-tight">
          {report.period_label}
        </h2>
        <p className="mt-1 text-[13px] text-slate-300">
          {report.agent_label} · {report.range_start} to {report.range_end}
          {briefing.previous_period_label ? ` · vs ${briefing.previous_period_label}` : ""}
        </p>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-white">{briefing.headline}</p>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-300">{briefing.attention}</p>
      </header>
      <div className="h-1 bg-blue" />

      <div className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Average score",
            value: d.avg_overall.current != null ? `${d.avg_overall.current}%` : "—",
            hint: <DeltaHint row={d.avg_overall} suffix=" pts" />,
          },
          {
            label: "Calls audited",
            value: String(d.calls_audited.current ?? 0),
            hint: <DeltaHint row={d.calls_audited} />,
          },
          {
            label: "Compliance followed",
            value: d.compliance_followed.current != null ? `${d.compliance_followed.current}%` : "—",
            hint:
              report.summary.compliance_not_followed_pct != null ? (
                <span className="kpi-hint">
                  {report.summary.compliance_not_followed_pct}% not followed
                  {d.compliance_followed.previous != null
                    ? ` · was ${d.compliance_followed.previous}% followed`
                    : ""}
                </span>
              ) : (
                <DeltaHint row={d.compliance_followed} suffix=" pts" />
              ),
          },
          {
            label: "Frustrated customers",
            value: d.frustrated_pct.current != null ? `${d.frustrated_pct.current}%` : "—",
            hint: <DeltaHint row={d.frustrated_pct} suffix=" pts" />,
          },
        ].map((item) => (
          <div key={item.label} className="border-b border-line px-6 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{item.label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{item.value}</p>
            <div className="mt-1">{item.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2">
        <section className="border-b border-line px-6 py-5 lg:border-b-0 lg:border-r">
          <h3 className="text-[13px] font-semibold text-ink">Coach now</h3>
          <p className="mt-0.5 text-[12px] text-muted">Agents with a weak average or low compliance follow rate.</p>
          {briefing.coach_now.length ? (
            <ul className="mt-3 divide-y divide-line">
              {briefing.coach_now.map((row) => (
                <li key={`${row.agent_id || "na"}-${row.agent_name}`} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{row.agent_name}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{row.reason}</p>
                  </div>
                  {row.avg_score != null ? (
                    <span className={`${scoreChipClass(row.avg_score)} shrink-0 tabular-nums`}>{row.avg_score}%</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-muted">No coaching queue from this window.</p>
          )}

          {briefing.weakest_parameters.length ? (
            <div className="mt-5">
              <h3 className="text-[13px] font-semibold text-ink">Weakest parameters</h3>
              <ul className="mt-2 space-y-1.5">
                {briefing.weakest_parameters.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-ink">{row.name}</span>
                    <span className="tabular-nums text-muted">{row.avg}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="px-6 py-5">
          <h3 className="text-[13px] font-semibold text-ink">Review these calls</h3>
          <p className="mt-0.5 text-[12px] text-muted">Open the audit, not the spreadsheet, for the moment that failed.</p>
          {briefing.review_queue.length ? (
            <ul className="mt-3 divide-y divide-line">
              {briefing.review_queue.map((row) => (
                <li key={row.call_id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/upload/score/${row.call_id}`}
                      className="text-[13px] font-semibold text-ink hover:text-blue"
                    >
                      {row.agent_name}
                      <span className="ml-2 font-normal tabular-nums text-muted">{row.title}</span>
                    </Link>
                    <span className={`${scoreChipClass(row.overall_score)} shrink-0 tabular-nums`}>
                      {row.overall_score}%
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{row.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-muted">No flagged calls in this window.</p>
          )}
        </section>
      </div>

      <section className="border-t border-line px-6 py-5">
        <h3 className="text-[13px] font-semibold text-ink">What customers said</h3>
        <p className="mt-0.5 text-[12px] text-muted">
          Themes grouped across calls. Frustration first — that is usually the coaching and product signal.
        </p>
        {briefing.customer_themes.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {briefing.customer_themes.map((row) => (
              <li key={`${row.kind}-${row.theme}`} className="border border-line px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">{row.theme}</p>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    {row.kind === "frustration" ? "Frustrated" : "Satisfied"} · {row.count}
                  </span>
                </div>
                {row.quote ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">“{row.quote}”</p>
                ) : null}
                {row.call_id ? (
                  <Link href={`/upload/score/${row.call_id}`} className="mt-2 inline-block text-[12px] font-medium text-blue">
                    Open example
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-muted">No customer themes in this window.</p>
        )}
      </section>
    </article>
  );
}
