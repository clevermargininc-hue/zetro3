import Link from "next/link";
import { ChartCard, HBars } from "@/components/admin-charts";
import { KpiStrip, scoreChipClass } from "@/components/ui";
import { ZetroMark } from "@/components/logo";
import type { QaBriefing, QaReport, ReportDelta } from "@/lib/reports";

function signed(delta: number) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function deltaText(row: ReportDelta, suffix = "") {
  if (row.previous == null || row.delta == null) return "No prior period yet";
  if (row.delta === 0) return `Unchanged vs ${row.previous}${suffix}`;
  return `${row.delta > 0 ? "Up" : "Down"} ${signed(row.delta)}${suffix} vs ${row.previous}${suffix}`;
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
    <article className="qa-briefing space-y-5">
      <header className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <ZetroMark className="h-9 w-9" />
            <div>
              <p className="font-brand text-[16px] font-bold tracking-[-0.01em] text-ink">Zetro</p>
              <span className="inline-block mt-0.5 rounded-none px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] bg-[#04B6DA] text-white">QA briefing</span>
            </div>
          </div>
          <p className="text-[12px] text-muted">
            {report.agent_label}
            {briefing.previous_period_label ? ` · vs ${briefing.previous_period_label}` : ""}
          </p>
        </div>
        <h2 className="mt-4 text-[18px] font-semibold tracking-tight text-ink">{report.period_label}</h2>
        <p className="mt-1 text-[12px] text-muted">
          {report.range_start} to {report.range_end}
        </p>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink">{briefing.headline}</p>
        {briefing.attention ? (
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{briefing.attention}</p>
        ) : null}
      </header>

      <KpiStrip
        items={[
          {
            label: "Average score",
            value: d.avg_overall.current != null ? `${d.avg_overall.current}%` : "—",
            hint: deltaText(d.avg_overall, " pts"),
          },
          {
            label: "Calls audited",
            value: String(d.calls_audited.current ?? 0),
            hint: deltaText(d.calls_audited),
          },
          {
            label: "Compliance followed",
            value: d.compliance_followed.current != null ? `${d.compliance_followed.current}%` : "—",
            hint:
              report.summary.compliance_not_followed_pct != null
                ? `${report.summary.compliance_not_followed_pct}% not followed`
                : deltaText(d.compliance_followed, " pts"),
          },
          {
            label: "Frustrated customers",
            value: d.frustrated_pct.current != null ? `${d.frustrated_pct.current}%` : "—",
            hint: deltaText(d.frustrated_pct, " pts"),
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Coach now" subtitle="Agents with a weak average or low compliance follow rate">
          {briefing.coach_now.length ? (
            <ul className="divide-y divide-line">
              {briefing.coach_now.map((row) => (
                <li key={`${row.agent_id || "na"}-${row.agent_name}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
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
            <p className="py-6 text-center text-[13px] text-muted">No coaching queue from this window.</p>
          )}
        </ChartCard>

        <ChartCard title="Review these calls" subtitle="Open the audit for the moment that failed">
          {briefing.review_queue.length ? (
            <ul className="divide-y divide-line">
              {briefing.review_queue.map((row) => (
                <li key={row.call_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/upload/score/${row.call_id}`} className="min-w-0 text-[13px] font-semibold text-ink hover:underline">
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
            <p className="py-6 text-center text-[13px] text-muted">No flagged calls in this window.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Weakest skills" subtitle="Lowest scorecard averages in this window">
        <HBars
          empty="No skill scores in this window."
          scaleMax={100}
          rows={briefing.weakest_parameters.map((row) => ({
            key: row.name,
            label: row.name,
            value: row.avg,
          }))}
        />
      </ChartCard>
    </article>
  );
}
