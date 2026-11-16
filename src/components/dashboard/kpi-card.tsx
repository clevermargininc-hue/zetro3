"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/cn";
import { DeltaBadge, KpiCardSkeleton } from "@/components/dashboard/primitives";

export type SparklinePoint = { date: string; value: number };

type KpiCardProps = {
  title: string;
  valueDisplay: string;
  delta: number | null | undefined;
  deltaSuffix?: string;
  invertDeltaPolarity?: boolean;
  comparisonLabel: string;
  noPriorPeriodLabel: string;
  sparkline: SparklinePoint[];
  href: string;
  strokeColor?: string;
  isLoading?: boolean;
  isStale?: boolean;
};

export const KpiCard = memo(function KpiCard({
  title,
  valueDisplay,
  delta,
  deltaSuffix = "%",
  invertDeltaPolarity = false,
  comparisonLabel,
  noPriorPeriodLabel,
  sparkline,
  href,
  strokeColor = "var(--z-accent)",
  isLoading = false,
  isStale = false,
}: KpiCardProps) {
  if (isLoading) return <KpiCardSkeleton />;

  return (
    <Link
      href={href}
      aria-label={`${title}: ${valueDisplay}`}
      className={cn(
        "z-card z-focus group p-6 flex flex-col justify-between gap-4 hover:border-[var(--z-border-strong)] transition-all duration-150",
        isStale && "opacity-85",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--z-ink-secondary)] leading-snug">
          {title}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--z-ink-muted)] group-hover:text-[var(--z-accent)] transition-colors shrink-0">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="z-display z-tabular text-[30px] leading-none font-bold tracking-[-0.03em] text-[var(--z-ink)]">
          {valueDisplay}
        </div>

        <div className="h-10 w-24 shrink-0" aria-label={`${title} trend sparkline`}>
          {sparkline.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as SparklinePoint | undefined;
                    if (!row) return null;
                    return (
                      <div className="rounded-[6px] border border-[var(--z-border)] bg-[var(--z-surface-elevated)] px-2 py-1 text-[11px] font-medium text-[var(--z-ink)] shadow-sm z-tabular">
                        {row.date}: {row.value}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-end justify-end">
              <span className="text-[11px] text-[var(--z-ink-muted)]">
                {sparkline.length === 1 ? `1 pt` : "No series"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--z-border)]">
        <DeltaBadge
          delta={delta}
          suffix={deltaSuffix}
          invertPolarity={invertDeltaPolarity}
          noDataLabel={noPriorPeriodLabel}
        />
        <span className="text-[11.5px] text-[var(--z-ink-muted)] truncate">
          {delta == null ? noPriorPeriodLabel : comparisonLabel}
        </span>
      </div>
    </Link>
  );
});

