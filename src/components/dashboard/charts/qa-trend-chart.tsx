"use client";

import { memo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QaTrendResponse } from "@/features/dashboard/api/schemas";

export type QaTrendChartProps = {
  series: QaTrendResponse["series"];
  targetScore: number | null;
  targetLabel: string;
};

export const QaTrendChart = memo(function QaTrendChart({
  series,
  targetScore,
  targetLabel,
}: QaTrendChartProps) {
  return (
    <div className="h-[270px] w-full" role="img" aria-label="QA score and compliance trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
          <defs>
            <linearGradient id="zetroScoreArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--z-accent)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--z-accent)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--z-border)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--z-ink-muted)" }}
            axisLine={{ stroke: "var(--z-border)" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: "var(--z-ink-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as QaTrendResponse["series"][number] | undefined;
              if (!point) return null;
              return (
                <div className="z-panel px-3 py-2.5 text-[12px] space-y-1 z-tabular">
                  <div className="font-semibold text-[var(--z-ink)]">{point.label}</div>
                  <div className="flex items-center justify-between gap-4 text-[var(--z-ink-secondary)]">
                    <span>Avg QA Score</span>
                    <strong className="text-[var(--z-accent)]">
                      {point.avgScore != null ? `${point.avgScore}%` : "—"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[var(--z-ink-secondary)]">
                    <span>Compliance</span>
                    <strong className="text-[var(--z-pass)]">
                      {point.complianceRate != null ? `${point.complianceRate}%` : "—"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[var(--z-ink-muted)]">
                    <span>Audited calls</span>
                    <strong>{point.callCount}</strong>
                  </div>
                </div>
              );
            }}
          />
          {targetScore != null ? (
            <ReferenceLine
              y={targetScore}
              stroke="var(--z-pass)"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `${targetLabel} ${targetScore}%`,
                position: "insideTopRight",
                fill: "var(--z-pass)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="avgScore"
            name="Average QA Score"
            stroke="var(--z-accent)"
            strokeWidth={2.25}
            fill="url(#zetroScoreArea)"
            dot={{ r: 2.5, fill: "var(--z-accent)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--z-accent)", stroke: "var(--z-surface)", strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="complianceRate"
            name="Compliance Rate"
            stroke="var(--z-pass)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

