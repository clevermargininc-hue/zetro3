import { BarChart, ChartCard, CHART_COLORS, Donut, HBars, LineChart } from "@/components/admin-charts";
import type { ReactNode } from "react";

const C = CHART_COLORS;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const n = (value: number) => value.toLocaleString("en-US");

export function QaTrendCharts({
  labels,
  avgScores,
  calls,
  rangeText,
}: {
  labels: string[];
  avgScores: Array<number | null>;
  calls: number[];
  rangeText: string;
}) {
  if (!labels.length) return null;
  const latest = [...avgScores].reverse().find((value) => value != null);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard
        title="Quality score"
        subtitle={`${rangeText} · average of scored calls`}
        total={latest != null ? `${latest}%` : "—"}
      >
        <LineChart labels={labels} values={avgScores} label="average score" color="#2F6BFF" fixedMax={100} />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted">
          <span>Quiet periods have no dot. Line connects periods with scored calls.</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E9F5] bg-[#F8FAFF] px-2 py-0.5 font-semibold text-[#0A1A3F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            Pass target: 70%+
          </span>
        </div>
      </ChartCard>
      <ChartCard title="Calls scored" subtitle={rangeText} total={n(sum(calls))}>
        <BarChart labels={labels} series={[{ label: "Scored calls", color: "#2F6BFF", values: calls }]} />
        <p className="mt-2.5 text-[11.5px] text-muted">Completed QA evaluations grouped by audit date.</p>
      </ChartCard>
    </div>
  );
}

export function QaMixCharts({
  excellent,
  good,
  review,
  poor,
  agentRows,
}: {
  excellent: number;
  good: number;
  review: number;
  poor: number;
  agentRows: { key: string; label: ReactNode; value: number; hint?: string }[];
}) {
  const scored = excellent + good + review + poor;
  const bandSlices = [
    { label: "Excellent (85+)", value: excellent, color: C.teal },
    { label: "Good (70–84)", value: good, color: C.blue },
    { label: "Review (50–69)", value: review, color: C.amber },
    { label: "Poor (under 50)", value: poor, color: C.grey },
  ].filter((slice) => slice.value > 0);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Score mix" subtitle="How scored calls landed" total={scored ? n(scored) : undefined}>
        {bandSlices.length ? (
          <Donut centerLabel="scored" slices={bandSlices} />
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">No scored calls in this window.</p>
        )}
      </ChartCard>
      <ChartCard title="Agents" subtitle="Average score">
        <HBars empty="No scored agents in this window." scaleMax={100} rows={agentRows} color={C.blue} />
      </ChartCard>
    </div>
  );
}
