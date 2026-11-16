"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  EmptyState,
  ErrorState,
  SkeletonBlock,
} from "@/components/dashboard/primitives";
import type { DashboardCopy } from "@/lib/i18n/dashboard";

export function ChartCard({
  title,
  subtitle,
  action,
  isLoading,
  isFetching,
  error,
  onRetry,
  isEmpty,
  emptyVariant = "filtered",
  onClearFilters,
  statesCopy,
  staleLabel,
  heightClass = "h-[280px]",
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyVariant?: "first-run" | "filtered";
  onClearFilters?: () => void;
  statesCopy: DashboardCopy["states"];
  staleLabel?: string;
  heightClass?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("z-card p-6 flex flex-col gap-5", className)}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="z-display text-[15px] font-semibold tracking-[-0.015em] text-[var(--z-ink)]">
              {title}
            </h2>
            {isFetching && !isLoading ? (
              <span
                className="inline-flex items-center gap-1 rounded-[var(--z-radius-control)] bg-[var(--z-accent-tint)] px-2 py-0.5 text-[11px] font-medium text-[var(--z-accent)]"
                title={staleLabel}
              >
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                <span className="hidden sm:inline">Updating</span>
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[12.5px] text-[var(--z-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex items-center gap-2 shrink-0">{action}</div> : null}
      </header>

      {isLoading ? (
        <div className={cn("flex flex-col gap-3 justify-between", heightClass)} aria-busy="true">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="flex-1 w-full" />
          <div className="flex justify-between gap-4">
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-3 w-12" />
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} copy={statesCopy} onRetry={onRetry} compact />
      ) : isEmpty ? (
        <EmptyState
          variant={emptyVariant}
          copy={statesCopy}
          onClearFilters={onClearFilters}
          compact
        />
      ) : (
        <div className="min-w-0 w-full">{children}</div>
      )}
    </section>
  );
}

