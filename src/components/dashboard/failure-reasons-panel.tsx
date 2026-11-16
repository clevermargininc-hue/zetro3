"use client";

import { memo } from "react";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import type { FailureReason } from "@/features/dashboard/api/schemas";
import { ChartCard } from "@/components/dashboard/chart-card";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import { cn } from "@/lib/cn";

export const FailureReasonsPanel = memo(function FailureReasonsPanel({
  reasons,
  isLoading,
  isFetching,
  error,
  onRetry,
  onClearFilters,
  onSelectFlaggedFilter,
  copy,
}: {
  reasons: FailureReason[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  onClearFilters: () => void;
  onSelectFlaggedFilter: () => void;
  copy: DashboardCopy;
}) {
  const maxRate = Math.max(...reasons.map((r) => r.failureRatePct), 1);

  return (
    <ChartCard
      title={copy.overview.failureReasonsTitle}
      subtitle={copy.overview.failureReasonsSubtitle}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      isEmpty={!isLoading && !error && reasons.length === 0}
      emptyVariant="filtered"
      onClearFilters={onClearFilters}
      statesCopy={copy.states}
      staleLabel={copy.overview.staleRefreshing}
      className="h-full"
    >
      <ul className="space-y-3.5">
        {reasons.map((item) => {
          const widthPct = Math.max(4, Math.min(100, (item.failureRatePct / maxRate) * 100));
          const isCompliance = item.kind === "compliance";
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={onSelectFlaggedFilter}
                className="z-focus w-full text-left group rounded-[var(--z-radius-control)] p-1.5 -m-1.5 hover:bg-[var(--z-surface-muted)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2 text-[12.5px]">
                  <span className="inline-flex items-start gap-2 font-medium text-[var(--z-ink)] min-w-0">
                    {isCompliance ? (
                      <ShieldAlert
                        className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--z-fail)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <SlidersHorizontal
                        className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--z-warn)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="line-clamp-2">{item.reason}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-[var(--z-ink)] z-tabular">
                    {item.failureCount}{" "}
                    <span className="font-normal text-[var(--z-ink-muted)]">
                      ({item.failureRatePct}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--z-surface-muted)] overflow-hidden">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-150",
                      isCompliance ? "bg-[var(--z-fail)]" : "bg-[var(--z-warn)]",
                    )}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
});

