"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Popover } from "radix-ui";
import {
  Check,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import {
  formatDateTimeInTz,
  formatNumberLocale,
  formatPercentLocale,
} from "@/lib/i18n/dashboard";
import { ApiClientError } from "@/lib/api/client";
import { useDashboardContext } from "@/components/dashboard/providers";
import {
  useDashboardFilters,
  useDebouncedValue,
} from "@/features/filters/use-dashboard-filters";
import {
  useKpiSummaryQuery,
  useQaTrendQuery,
  useSentimentBreakdownQuery,
} from "@/features/dashboard/api/queries";
import { useAgentLeaderboardQuery } from "@/features/agents/api/queries";
import { useQueuesQuery, useTeamsQuery } from "@/features/teams/api/queries";
import {
  useBulkCallActionMutation,
  useCallsLiveSignal,
  useFlaggedCallsQuery,
} from "@/features/calls/api/queries";
import type { CallListItem } from "@/features/calls/api/schemas";
import { useUpdatePreferencesMutation } from "@/features/session/api/queries";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DataTable } from "@/components/dashboard/data-table";
import { FailureReasonsPanel } from "@/components/dashboard/failure-reasons-panel";
import { AgentLeaderboardPanel } from "@/components/dashboard/agent-leaderboard-panel";
import { CallInspectionDrawer } from "@/components/dashboard/call-inspection-drawer";
import {
  EmptyState,
  ErrorState,
  ScoreBadge,
  SkeletonBlock,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { BrandChannelPill } from "@/components/brand-icon";

const LazyQaTrendChart = dynamic(
  () =>
    import("@/components/dashboard/charts/qa-trend-chart").then(
      (mod) => mod.QaTrendChart,
    ),
  {
    ssr: false,
    loading: () => <SkeletonBlock className="h-[270px] w-full" />,
  },
);

const LazySentimentDonutChart = dynamic(
  () =>
    import("@/components/dashboard/charts/sentiment-donut-chart").then(
      (mod) => mod.SentimentDonutChart,
    ),
  {
    ssr: false,
    loading: () => <SkeletonBlock className="h-[210px] w-full" />,
  },
);

export function OverviewPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, locale, timezone, copy, can } = useDashboardContext();
  const {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    buildCallsDrilldownHref,
  } = useDashboardFilters();

  // Optional local override for QA Trend window (7D / 30D / 90D)
  const [trendRangeOverride, setTrendRangeOverride] = useState<"7d" | "30d" | "90d" | null>(
    null,
  );
  const [sentimentGroupBy, setSentimentGroupBy] = useState<"channel" | "queue">("channel");

  // Search box state derived cleanly from URL query params with zero effect loops
  const [draftQ, setDraftQ] = useState<{ base: string; value: string } | null>(null);
  const searchInput = draftQ && draftQ.base === filters.q ? draftQ.value : filters.q;
  const setSearchInput = useCallback(
    (next: string) => setDraftQ({ base: filters.q, value: next }),
    [filters.q],
  );

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      updateFilters({ q: debouncedSearch });
    }
  }, [debouncedSearch, filters.q, updateFilters]);

  // Right-side drawer inspection state synced directly with URL ?inspect=<uuid>
  const inspectFromUrl = searchParams.get("inspect");
  const [pendingInspect, setPendingInspect] = useState<{
    base: string | null;
    value: string | null;
  } | null>(null);
  const inspectedCallId =
    pendingInspect && pendingInspect.base === inspectFromUrl
      ? pendingInspect.value
      : inspectFromUrl;

  const openInspection = useCallback((callId: string) => {
    setPendingInspect({ base: inspectFromUrl, value: callId });
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("inspect", callId);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [inspectFromUrl, pathname, router, searchParams]);

  const closeInspection = useCallback(() => {
    setPendingInspect({ base: inspectFromUrl, value: null });
    if (searchParams.has("inspect")) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("inspect");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [inspectFromUrl, pathname, router, searchParams]);

  // Inline Org QA Target configurator for admins
  const [targetPopoverOpen, setTargetPopoverOpen] = useState(false);
  const [targetInput, setTargetInput] = useState(
    session.workspace.qaTargetScore != null ? String(session.workspace.qaTargetScore) : "",
  );
  const updatePrefs = useUpdatePreferencesMutation();

  const effectiveTrendRange =
    trendRangeOverride ??
    (filters.preset === "7d" || filters.preset === "90d" ? filters.preset : "30d");

  // Queries (independent, parallel, no waterfalls)
  const kpiQuery = useKpiSummaryQuery(filters);
  const trendQuery = useQaTrendQuery(filters, effectiveTrendRange);
  const sentimentQuery = useSentimentBreakdownQuery(filters, sentimentGroupBy);
  const leaderboardQuery = useAgentLeaderboardQuery(filters, 8);
  const callsQuery = useFlaggedCallsQuery(filters);
  const teamsQuery = useTeamsQuery();
  const queuesQuery = useQueuesQuery();

  const bulkAction = useBulkCallActionMutation();
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  const liveSignal = useCallsLiveSignal(kpiQuery.data?.lastAnalyzedAt ?? null);

  const isAnyBackgroundRefreshing =
    (kpiQuery.isFetching && !kpiQuery.isLoading) ||
    (trendQuery.isFetching && !trendQuery.isLoading) ||
    (sentimentQuery.isFetching && !sentimentQuery.isLoading) ||
    (leaderboardQuery.isFetching && !leaderboardQuery.isLoading) ||
    (callsQuery.isFetching && !callsQuery.isLoading);

  const teams = teamsQuery.data?.teams ?? [];
  const queues = queuesQuery.data?.queues ?? [];
  const agentOptions = useMemo(
    () =>
      (leaderboardQuery.data?.agents ?? [])
        .filter((a): a is typeof a & { agentId: string } => Boolean(a.agentId))
        .map((a) => ({ id: a.agentId, name: a.agentName })),
    [leaderboardQuery.data?.agents],
  );

  const columns = useMemo<ColumnDef<CallListItem, unknown>[]>(
    () => [
      {
        id: "call",
        header: "Call",
        accessorKey: "title",
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="min-w-0 max-w-[290px]">
              <div className="font-semibold text-[var(--z-ink)] truncate">{item.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--z-ink-muted)]">
                <BrandChannelPill channel={item.channel} />
                <span className="uppercase">{item.language}</span>
                {item.fileName && item.fileName !== item.title ? (
                  <span className="truncate max-w-[140px]">· {item.fileName}</span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "agent",
        header: "Agent / Desk",
        accessorKey: "agentName",
        meta: { sortKey: "agent_name" as const },
        cell: ({ row }) => {
          const item = row.original;
          const desk = [item.teamName, item.queueName].filter(Boolean).join(" · ");
          return (
            <div className="min-w-0">
              <div className="font-medium text-[var(--z-ink)] truncate max-w-[170px]">
                {item.agentName}
              </div>
              {desk ? (
                <div className="text-[11px] text-[var(--z-ink-muted)] truncate max-w-[170px]">
                  {desk}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "score",
        header: "QA Score",
        accessorKey: "overallScore",
        meta: { sortKey: "overall_score" as const },
        cell: ({ row }) => <ScoreBadge score={row.original.overallScore} />,
      },
      {
        id: "compliance",
        header: "Compliance",
        accessorKey: "compliancePct",
        cell: ({ row }) => {
          const item = row.original;
          if (item.compliancePct == null && item.complianceFailedCount === 0) {
            return <StatusBadge tone="neutral" label="Not audited" icon="clock" />;
          }
          if (item.criticalFailureCount > 0) {
            return (
              <StatusBadge
                tone="fail"
                label={`${item.criticalFailureCount} critical`}
                icon="shield"
              />
            );
          }
          if (item.complianceFailedCount > 0) {
            return (
              <StatusBadge
                tone="warn"
                label={`${item.complianceFailedCount} failed`}
                icon="warn"
              />
            );
          }
          return (
            <StatusBadge
              tone="pass"
              label={item.compliancePct != null ? `${item.compliancePct}% pass` : "Pass"}
              icon="pass"
            />
          );
        },
      },
      {
        id: "sentiment",
        header: "Sentiment",
        accessorKey: "sentiment",
        cell: ({ row }) => {
          const s = row.original.sentiment;
          if (s === "positive") return <StatusBadge tone="pass" label="Positive" icon="pass" />;
          if (s === "neutral") return <StatusBadge tone="warn" label="Neutral" icon="dot" />;
          if (s === "negative") return <StatusBadge tone="fail" label="Negative" icon="fail" />;
          return <StatusBadge tone="neutral" label="—" icon="clock" />;
        },
      },
      {
        id: "reviewStatus",
        header: "Review Status",
        accessorKey: "reviewStatus",
        meta: { sortKey: "review_status" as const },
        cell: ({ row }) => {
          const item = row.original;
          if (item.reviewStatus === "approved") {
            return <StatusBadge tone="pass" label="Approved" icon="pass" />;
          }
          if (item.reviewStatus === "escalated") {
            return <StatusBadge tone="fail" label="Escalated" icon="shield" />;
          }
          if (item.reviewStatus === "needs_coaching") {
            return <StatusBadge tone="warn" label="Needs coaching" icon="warn" />;
          }
          if (item.needsReview) {
            return <StatusBadge tone="warn" label="Needs review" icon="warn" />;
          }
          return <StatusBadge tone="neutral" label="Pending" icon="clock" />;
        },
      },
      {
        id: "duration",
        header: "Duration",
        accessorKey: "durationSeconds",
        meta: { sortKey: "duration_seconds" as const, align: "right" as const },
        cell: ({ row }) => (
          <span className="z-tabular font-medium text-[var(--z-ink-secondary)]">
            {formatDuration(row.original.durationSeconds)}
          </span>
        ),
      },
      {
        id: "auditedAt",
        header: "Audited",
        accessorKey: "auditedAt",
        meta: { sortKey: "created_at" as const, align: "right" as const },
        cell: ({ row }) => (
          <span className="z-tabular text-[12px] text-[var(--z-ink-muted)] whitespace-nowrap">
            {formatDateTimeInTz(row.original.auditedAt, timezone, locale)}
          </span>
        ),
      },
    ],
    [locale, timezone],
  );

  const canBulkAction = can("calls:bulk_action");
  const bulkActions = useMemo(() => {
    if (!canBulkAction) return undefined;
    const execute = async (
      action: "approve" | "needs_coaching" | "escalate",
      ids: string[],
    ) => {
      setBulkFeedback(null);
      try {
        const res = await bulkAction.mutateAsync({ callIds: ids, action });
        setBulkFeedback(
          `Updated ${res.updatedCount} call${res.updatedCount === 1 ? "" : "s"} to ${res.reviewStatus.replace("_", " ")}.`,
        );
      } catch (err) {
        setBulkFeedback(err instanceof Error ? err.message : "Bulk update failed.");
      }
    };
    return [
      {
        id: "approve",
        label: copy.overview.bulkApprove,
        onExecute: (ids: string[]) => execute("approve", ids),
      },
      {
        id: "needs_coaching",
        label: copy.overview.bulkNeedsCoaching,
        tone: "warn" as const,
        onExecute: (ids: string[]) => execute("needs_coaching", ids),
      },
      {
        id: "escalate",
        label: copy.overview.bulkEscalate,
        tone: "danger" as const,
        onExecute: (ids: string[]) => execute("escalate", ids),
      },
    ];
  }, [bulkAction, canBulkAction, copy.overview.bulkApprove, copy.overview.bulkEscalate, copy.overview.bulkNeedsCoaching]);

  const kpiErrorIsForbidden =
    kpiQuery.error instanceof ApiClientError && kpiQuery.error.status === 403;
  const isFirstRunEmpty =
    !kpiQuery.isLoading &&
    !kpiQuery.error &&
    kpiQuery.data?.totalWorkspaceCalls === 0;

  const kpis = kpiQuery.data?.kpis;
  const orgTargetScore =
    kpiQuery.data?.orgTargetScore ??
    trendQuery.data?.targetScore ??
    session.workspace.qaTargetScore;

  async function saveOrgTarget(nextScore: number | null) {
    await updatePrefs.mutateAsync({ qaTargetScore: nextScore });
    setTargetPopoverOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Page Header Strip (faint dot-grid permitted here) */}
      <header className="z-dot-grid z-card px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--z-ink-muted)]"
          >
            <span>{copy.overview.breadcrumbSection}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[var(--z-ink-secondary)]">
              {copy.overview.breadcrumbPage}
            </span>
          </nav>

          <h1 className="z-display mt-1 text-[22px] sm:text-[26px] font-bold tracking-[-0.025em] text-[var(--z-ink)]">
            {copy.overview.title}
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--z-ink-secondary)]">
            {copy.overview.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAnyBackgroundRefreshing ? (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--z-ink-muted)]">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--z-accent)]" aria-hidden="true" />
              <span>{copy.overview.staleRefreshing}</span>
            </span>
          ) : null}

          {liveSignal.hasNewResults ? (
            <button
              type="button"
              onClick={() => void liveSignal.acknowledgeAndRefresh()}
              className="z-focus inline-flex items-center gap-2 rounded-[var(--z-radius-control)] border border-[var(--z-accent)] bg-[var(--z-accent-tint)] px-3 py-2 text-[12.5px] font-semibold text-[var(--z-accent)] hover:bg-[color-mix(in_srgb,var(--z-accent)_16%,transparent)] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{copy.overview.newResultsChip}</span>
              <span className="underline">{copy.overview.refreshChipAction}</span>
            </button>
          ) : null}

          {can("calls:upload") ? (
            <Link
              href="/upload"
              className="z-focus inline-flex items-center gap-2 rounded-[var(--z-radius-control)] bg-[var(--z-accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--z-accent-hover)] transition-colors"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>{copy.overview.primaryAction}</span>
            </Link>
          ) : null}
        </div>
      </header>

      {/* Top-level RBAC 403 block or Organization First-Run Onboarding Empty State */}
      {kpiErrorIsForbidden ? (
        <ErrorState error={kpiQuery.error} copy={copy.states} onRetry={() => void kpiQuery.refetch()} />
      ) : isFirstRunEmpty ? (
        <EmptyState
          variant="first-run"
          copy={copy.states}
          canUpload={can("calls:upload")}
        />
      ) : (
        <>
          {/* URL-synced Global Filter Bar */}
          <FilterBar
            filters={filters}
            onUpdate={(patch) => updateFilters(patch)}
            onReset={() => {
              setDraftQ(null);
              resetFilters();
            }}
            hasActiveFilters={hasActiveFilters}
            teams={teams}
            queues={queues}
            agents={agentOptions}
            copy={copy.filters}
          />

          {/* KPI Strip (5 Cards) */}
          {kpiQuery.error ? (
            <ErrorState
              error={kpiQuery.error}
              copy={copy.states}
              onRetry={() => void kpiQuery.refetch()}
            />
          ) : (
            <section
              aria-label="Key quality assurance metrics"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
            >
              <KpiCard
                title={copy.overview.kpiCallsAnalyzed}
                valueDisplay={formatNumberLocale(kpis?.callsAnalyzed.value, locale)}
                delta={kpis?.callsAnalyzed.delta}
                deltaSuffix=""
                comparisonLabel={copy.overview.vsPriorPeriod}
                noPriorPeriodLabel={copy.overview.noPriorPeriod}
                sparkline={kpis?.callsAnalyzed.sparkline ?? []}
                href={buildCallsDrilldownHref()}
                isLoading={kpiQuery.isLoading}
                isStale={kpiQuery.isFetching && !kpiQuery.isLoading}
              />

              <KpiCard
                title={copy.overview.kpiAvgScore}
                valueDisplay={formatPercentLocale(kpis?.avgScore.value, locale, 1)}
                delta={kpis?.avgScore.delta}
                deltaSuffix=" pts"
                comparisonLabel={copy.overview.vsPriorPeriod}
                noPriorPeriodLabel={copy.overview.noPriorPeriod}
                sparkline={kpis?.avgScore.sparkline ?? []}
                href={buildCallsDrilldownHref({ sortBy: "overall_score", sortDir: "asc" })}
                isLoading={kpiQuery.isLoading}
                isStale={kpiQuery.isFetching && !kpiQuery.isLoading}
              />

              <KpiCard
                title={copy.overview.kpiComplianceRate}
                valueDisplay={formatPercentLocale(kpis?.complianceRate.value, locale, 1)}
                delta={kpis?.complianceRate.delta}
                deltaSuffix=" pts"
                comparisonLabel={copy.overview.vsPriorPeriod}
                noPriorPeriodLabel={copy.overview.noPriorPeriod}
                sparkline={kpis?.complianceRate.sparkline ?? []}
                href={buildCallsDrilldownHref({ flagged: true })}
                strokeColor="var(--z-pass)"
                isLoading={kpiQuery.isLoading}
                isStale={kpiQuery.isFetching && !kpiQuery.isLoading}
              />

              <KpiCard
                title={copy.overview.kpiCustomerSentiment}
                valueDisplay={formatPercentLocale(kpis?.positiveSentimentPct.value, locale, 1)}
                delta={kpis?.positiveSentimentPct.delta}
                deltaSuffix=" pts"
                comparisonLabel={copy.overview.vsPriorPeriod}
                noPriorPeriodLabel={copy.overview.noPriorPeriod}
                sparkline={kpis?.positiveSentimentPct.sparkline ?? []}
                href={buildCallsDrilldownHref({ sentiment: "positive" })}
                isLoading={kpiQuery.isLoading}
                isStale={kpiQuery.isFetching && !kpiQuery.isLoading}
              />

              <KpiCard
                title={copy.overview.kpiNeedsReview}
                valueDisplay={formatNumberLocale(kpis?.needsReviewCount.value, locale)}
                delta={kpis?.needsReviewCount.delta}
                deltaSuffix=""
                invertDeltaPolarity
                comparisonLabel={copy.overview.vsPriorPeriod}
                noPriorPeriodLabel={copy.overview.noPriorPeriod}
                sparkline={kpis?.needsReviewCount.sparkline ?? []}
                href={buildCallsDrilldownHref({ needsReview: true })}
                strokeColor="var(--z-warn)"
                isLoading={kpiQuery.isLoading}
                isStale={kpiQuery.isFetching && !kpiQuery.isLoading}
              />
            </section>
          )}

          {/* Row 2: 2/3 QA Score Trend + 1/3 Top Failure Reasons */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            <div className="xl:col-span-8">
              <ChartCard
                title={copy.overview.trendTitle}
                subtitle={copy.overview.trendSubtitle}
                isLoading={trendQuery.isLoading}
                isFetching={trendQuery.isFetching}
                error={trendQuery.error}
                onRetry={() => void trendQuery.refetch()}
                isEmpty={
                  !trendQuery.isLoading &&
                  !trendQuery.error &&
                  (trendQuery.data?.series.length ?? 0) === 0
                }
                emptyVariant="filtered"
                onClearFilters={hasActiveFilters ? resetFilters : undefined}
                statesCopy={copy.states}
                staleLabel={copy.overview.staleRefreshing}
                className="h-full"
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Admin org target badge / configurator */}
                    {can("settings:org_manage") ? (
                      <Popover.Root
                        open={targetPopoverOpen}
                        onOpenChange={(open) => {
                          setTargetPopoverOpen(open);
                          if (open) {
                            setTargetInput(orgTargetScore != null ? String(orgTargetScore) : "");
                          }
                        }}
                      >
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            className="z-focus inline-flex items-center gap-1.5 h-8 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[12px] font-medium text-[var(--z-ink-secondary)] hover:border-[var(--z-border-strong)] hover:text-[var(--z-ink)] transition-colors"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="z-tabular">
                              {orgTargetScore != null
                                ? `${copy.overview.targetLabel}: ${orgTargetScore}%`
                                : copy.overview.noTargetConfigured}
                            </span>
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            align="end"
                            sideOffset={6}
                            className="z-50 w-64 z-panel p-4 space-y-3"
                          >
                            <div className="text-[12.5px] font-semibold text-[var(--z-ink)]">
                              Organization QA Target (%)
                            </div>
                            <p className="text-[11.5px] text-[var(--z-ink-muted)]">
                              Rendered on trend charts across your workspace. Leave blank to clear.
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={10}
                                max={100}
                                placeholder="e.g. 85"
                                value={targetInput}
                                onChange={(e) => setTargetInput(e.target.value)}
                                className="z-focus h-8 flex-1 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[13px] text-[var(--z-ink)] z-tabular"
                              />
                              <button
                                type="button"
                                disabled={updatePrefs.isPending}
                                onClick={() => {
                                  const num = Number(targetInput);
                                  void saveOrgTarget(
                                    targetInput.trim() && Number.isFinite(num)
                                      ? Math.min(100, Math.max(10, Math.round(num)))
                                      : null,
                                  );
                                }}
                                className="z-focus inline-flex h-8 items-center gap-1 rounded-[var(--z-radius-control)] bg-[var(--z-accent)] px-3 text-[12px] font-semibold text-white hover:bg-[var(--z-accent-hover)] disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Save</span>
                              </button>
                            </div>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    ) : orgTargetScore != null ? (
                      <span className="inline-flex h-8 items-center rounded-[var(--z-radius-control)] bg-[var(--z-pass-tint)] px-2.5 text-[12px] font-semibold text-[var(--z-pass)] z-tabular">
                        {copy.overview.targetLabel}: {orgTargetScore}%
                      </span>
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] px-2.5 text-[11.5px] text-[var(--z-ink-muted)]">
                        {copy.overview.noTargetConfigured}
                      </span>
                    )}

                    {/* 7D / 30D / 90D toggle */}
                    <div
                      role="group"
                      aria-label="Trend time window"
                      className="inline-flex rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-0.5"
                    >
                      {(["7d", "30d", "90d"] as const).map((rangeOption) => {
                        const active = effectiveTrendRange === rangeOption;
                        return (
                          <button
                            key={rangeOption}
                            type="button"
                            onClick={() => setTrendRangeOverride(rangeOption)}
                            aria-pressed={active}
                            className={cn(
                              "z-focus h-7 rounded-[6px] px-2.5 text-[11.5px] font-semibold uppercase transition-colors",
                              active
                                ? "bg-[var(--z-surface)] text-[var(--z-ink)] shadow-xs"
                                : "text-[var(--z-ink-muted)] hover:text-[var(--z-ink)]",
                            )}
                          >
                            {rangeOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                }
              >
                <LazyQaTrendChart
                  series={trendQuery.data?.series ?? []}
                  targetScore={orgTargetScore ?? null}
                  targetLabel={copy.overview.targetLabel}
                />
              </ChartCard>
            </div>

            <div className="xl:col-span-4">
              <FailureReasonsPanel
                reasons={trendQuery.data?.failureReasons ?? []}
                isLoading={trendQuery.isLoading}
                isFetching={trendQuery.isFetching}
                error={trendQuery.error}
                onRetry={() => void trendQuery.refetch()}
                onClearFilters={resetFilters}
                onSelectFlaggedFilter={() =>
                  updateFilters({ flagged: !filters.flagged })
                }
                copy={copy}
              />
            </div>
          </div>

          {/* Row 3: 1/2 Agent Leaderboard + 1/2 Sentiment Breakdown Donut */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            <div className="xl:col-span-6">
              <AgentLeaderboardPanel
                agents={leaderboardQuery.data?.agents ?? []}
                selectedAgentId={filters.agentId}
                onSelectAgent={(agentId) => updateFilters({ agentId })}
                isLoading={leaderboardQuery.isLoading}
                isFetching={leaderboardQuery.isFetching}
                error={leaderboardQuery.error}
                onRetry={() => void leaderboardQuery.refetch()}
                onClearFilters={resetFilters}
                copy={copy}
              />
            </div>

            <div className="xl:col-span-6">
              <ChartCard
                title={copy.overview.sentimentTitle}
                subtitle={copy.overview.sentimentSubtitle}
                isLoading={sentimentQuery.isLoading}
                isFetching={sentimentQuery.isFetching}
                error={sentimentQuery.error}
                onRetry={() => void sentimentQuery.refetch()}
                isEmpty={
                  !sentimentQuery.isLoading &&
                  !sentimentQuery.error &&
                  (sentimentQuery.data?.totalScored ?? 0) === 0
                }
                emptyVariant="filtered"
                onClearFilters={hasActiveFilters ? resetFilters : undefined}
                statesCopy={copy.states}
                staleLabel={copy.overview.staleRefreshing}
                heightClass="h-[220px]"
                className="h-full"
                action={
                  <div
                    role="group"
                    aria-label="Sentiment grouping"
                    className="inline-flex rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-0.5"
                  >
                    {(
                      [
                        { key: "channel", label: "Channel" },
                        { key: "queue", label: "Queue" },
                      ] as const
                    ).map((opt) => {
                      const active = sentimentGroupBy === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setSentimentGroupBy(opt.key)}
                          aria-pressed={active}
                          className={cn(
                            "z-focus h-7 rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors",
                            active
                              ? "bg-[var(--z-surface)] text-[var(--z-ink)] shadow-xs"
                              : "text-[var(--z-ink-muted)] hover:text-[var(--z-ink)]",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                }
              >
                {sentimentQuery.data ? (
                  <LazySentimentDonutChart
                    data={sentimentQuery.data}
                    onSelectSentiment={(selected) =>
                      updateFilters({
                        sentiment: filters.sentiment === selected ? "all" : selected,
                      })
                    }
                  />
                ) : null}
              </ChartCard>
            </div>
          </div>

          {/* Row 4: Full-width Flagged & Audited Calls DataTable */}
          <div className="space-y-2">
            {bulkFeedback ? (
              <div
                role="status"
                className="flex items-center justify-between rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-4 py-2 text-[12.5px] text-[var(--z-ink)]"
              >
                <span>{bulkFeedback}</span>
                <button
                  type="button"
                  onClick={() => setBulkFeedback(null)}
                  className="text-[12px] font-semibold text-[var(--z-accent)] hover:underline"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <DataTable<CallListItem>
              title={copy.overview.flaggedTableTitle}
              subtitle={copy.overview.flaggedTableSubtitle}
              data={callsQuery.data?.items ?? []}
              columns={columns}
              total={callsQuery.data?.total ?? 0}
              page={callsQuery.data?.page ?? filters.page}
              pageSize={callsQuery.data?.pageSize ?? filters.pageSize}
              totalPages={callsQuery.data?.totalPages ?? 1}
              sortBy={filters.sortBy}
              sortDir={filters.sortDir}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              onSortChange={(sortBy, sortDir) => updateFilters({ sortBy, sortDir })}
              onPageChange={(page) => updateFilters({ page }, false)}
              onPageSizeChange={(pageSize) => updateFilters({ pageSize })}
              onRowClick={(row) => openInspection(row.id)}
              bulkActions={bulkActions}
              isLoading={callsQuery.isLoading}
              isFetching={callsQuery.isFetching}
              error={callsQuery.error}
              onRetry={() => void callsQuery.refetch()}
              emptyVariant={
                (callsQuery.data?.totalWorkspaceCalls ?? 1) === 0
                  ? "first-run"
                  : "filtered"
              }
              onClearFilters={() => {
                setDraftQ(null);
                resetFilters();
              }}
              searchPlaceholder={copy.filters.searchCallsPlaceholder}
              copy={copy}
            />
          </div>
        </>
      )}

      {/* Right-side Call Inspection Drawer (480px) */}
      <CallInspectionDrawer
        callId={inspectedCallId}
        onClose={closeInspection}
        canAssignCoaching={can("coaching:assign")}
        timezone={timezone}
        locale={locale}
        copy={copy}
      />
    </div>
  );
}
