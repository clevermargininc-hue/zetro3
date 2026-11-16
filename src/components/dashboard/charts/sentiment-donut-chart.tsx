"use client";

import { memo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SentimentBreakdownResponse } from "@/features/dashboard/api/schemas";
import type { DashboardSentimentFilter } from "./sentiment-types";

type SliceItem = {
  key: DashboardSentimentFilter;
  name: string;
  value: number;
  color: string;
};

export type SentimentDonutChartProps = {
  data: SentimentBreakdownResponse;
  onSelectSentiment?: (sentiment: DashboardSentimentFilter) => void;
};

export const SentimentDonutChart = memo(function SentimentDonutChart({
  data,
  onSelectSentiment,
}: SentimentDonutChartProps) {
  const allSlices: SliceItem[] = [
    { key: "positive", name: "Positive", value: data.counts.positive, color: "var(--z-pass)" },
    { key: "neutral", name: "Neutral", value: data.counts.neutral, color: "var(--z-warn)" },
    { key: "negative", name: "Negative", value: data.counts.negative, color: "var(--z-fail)" },
  ];
  const slices: SliceItem[] = allSlices.filter((s) => s.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
      <div
        className="md:col-span-5 relative h-[210px]"
        role="img"
        aria-label="Customer sentiment donut chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              isAnimationActive={false}
              onClick={(_data, index) => {
                const entry = slices[index];
                if (entry?.key && onSelectSentiment) {
                  onSelectSentiment(entry.key);
                }
              }}
              className="cursor-pointer outline-none"
            >
              {slices.map((entry) => (
                <Cell key={entry.key} fill={entry.color} stroke="var(--z-surface)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as SliceItem | undefined;
                if (!item) return null;
                const pct =
                  data.totalScored > 0
                    ? Math.round((item.value / data.totalScored) * 100)
                    : 0;
                return (
                  <div className="z-panel px-2.5 py-1.5 text-[12px] z-tabular">
                    <span className="font-semibold text-[var(--z-ink)]">{item.name}: </span>
                    <span className="text-[var(--z-ink-secondary)]">
                      {item.value} ({pct}%)
                    </span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center factual total */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="z-display z-tabular text-[22px] font-bold text-[var(--z-ink)] leading-none">
            {data.totalScored}
          </span>
          <span className="mt-1 text-[11px] font-medium text-[var(--z-ink-muted)]">
            Scored
          </span>
        </div>
      </div>

      {/* Breakdown by channel or queue */}
      <div className="md:col-span-7 space-y-3">
        {/* Legend totals */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "positive" as const, label: "Positive", count: data.counts.positive, dot: "bg-[var(--z-pass)]" },
            { key: "neutral" as const, label: "Neutral", count: data.counts.neutral, dot: "bg-[var(--z-warn)]" },
            { key: "negative" as const, label: "Negative", count: data.counts.negative, dot: "bg-[var(--z-fail)]" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectSentiment?.(item.key)}
              className="z-focus inline-flex items-center gap-1.5 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] px-2.5 py-1 text-[12px] font-medium text-[var(--z-ink)] hover:border-[var(--z-border-strong)] z-tabular"
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden="true" />
              <span>{item.label}</span>
              <span className="text-[var(--z-ink-muted)]">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {data.breakdown.map((group) => {
            const total = Math.max(group.total, 1);
            const posW = (group.positive / total) * 100;
            const neuW = (group.neutral / total) * 100;
            const negW = (group.negative / total) * 100;
            return (
              <div key={group.groupKey} className="space-y-1">
                <div className="flex items-center justify-between text-[12px] z-tabular">
                  <span className="font-medium text-[var(--z-ink)] truncate">
                    {group.label}
                  </span>
                  <span className="text-[var(--z-ink-muted)] shrink-0">
                    {group.total} calls
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden bg-[var(--z-surface-muted)] flex">
                  {posW > 0 ? (
                    <div
                      style={{ width: `${posW}%` }}
                      className="bg-[var(--z-pass)] h-full"
                      title={`Positive: ${group.positive}`}
                    />
                  ) : null}
                  {neuW > 0 ? (
                    <div
                      style={{ width: `${neuW}%` }}
                      className="bg-[var(--z-warn)] h-full"
                      title={`Neutral: ${group.neutral}`}
                    />
                  ) : null}
                  {negW > 0 ? (
                    <div
                      style={{ width: `${negW}%` }}
                      className="bg-[var(--z-fail)] h-full"
                      title={`Negative: ${group.negative}`}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
