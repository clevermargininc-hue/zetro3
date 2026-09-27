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
        <LineChart labels={labels} values={avgScores} label="average score" color={C.blue} fixedMax={100} />
        <p className="mt-2 text-[11px] text-muted">Quiet periods have no dot. The line joins days or months that had scores.</p>
      </ChartCard>
      <ChartCard title="Calls scored" subtitle={rangeText} total={n(sum(calls))}>
        <BarChart labels={labels} series={[{ label: "Scored calls", color: C.blue, values: calls }]} />
      </ChartCard>
    </div>
  );
}

export function QaMixCharts({
  excellent,
  good,
  review,
  poor,
  satisfied,
  frustrated,
  mixed,
  neutral,
  agentRows,
}: {
  excellent: number;
  good: number;
  review: number;
  poor: number;
  satisfied: number;
  frustrated: number;
  mixed: number;
  neutral: number;
  agentRows: { key: string; label: ReactNode; value: number; hint?: string }[];
}) {
  const scored = excellent + good + review + poor;
  const voice = satisfied + frustrated + mixed + neutral;
  const bandSlices = [
    { label: "Excellent (85+)", value: excellent, color: C.green },
    { label: "Good (70–84)", value: good, color: C.blue },
    { label: "Review (50–69)", value: review, color: C.amber },
    { label: "Poor (under 50)", value: poor, color: C.grey },
  ].filter((slice) => slice.value > 0);
  const voiceSlices = [
    { label: "Satisfied", value: satisfied, color: C.green },
    { label: "Frustrated", value: frustrated, color: C.amber },
    { label: "Mixed", value: mixed, color: C.soft },
    { label: "Neutral", value: neutral, color: C.grey },
  ].filter((slice) => slice.value > 0);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ChartCard title="Score mix" subtitle="How scored calls landed" total={scored ? n(scored) : undefined}>
        {bandSlices.length ? (
          <Donut centerLabel="scored" slices={bandSlices} />
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">No scored calls in this window.</p>
        )}
      </ChartCard>
      <ChartCard title="Customer voice" subtitle="How customers felt" total={voice ? n(voice) : undefined}>
        {voiceSlices.length ? (
          <Donut centerLabel="calls" slices={voiceSlices} />
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">Audit calls to see how customers felt.</p>
        )}
      </ChartCard>
      <ChartCard title="Agents" subtitle="Average score">
        <HBars empty="No scored agents in this window." scaleMax={100} rows={agentRows} />
      </ChartCard>
    </div>
  );
}

export function QaParameterBars({
  rows,
}: {
  rows: { key: string; label: string; value: number }[];
}) {
  return (
    <ChartCard title="Scorecard averages" subtitle="Workspace roll-up of each skill">
      <HBars
        empty="Score calls to see each skill."
        scaleMax={100}
        color={C.blue}
        rows={rows.map((row) => ({ key: row.key, label: row.label, value: row.value }))}
      />
    </ChartCard>
  );
}
