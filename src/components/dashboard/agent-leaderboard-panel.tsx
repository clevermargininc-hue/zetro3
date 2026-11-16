"use client";

import { memo } from "react";
import type { AgentLeaderboardRow } from "@/features/agents/api/schemas";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DeltaBadge, ScoreBadge } from "@/components/dashboard/primitives";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import { cn } from "@/lib/cn";

export const AgentLeaderboardPanel = memo(function AgentLeaderboardPanel({
  agents,
  selectedAgentId,
  onSelectAgent,
  isLoading,
  isFetching,
  error,
  onRetry,
  onClearFilters,
  copy,
}: {
  agents: AgentLeaderboardRow[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  onClearFilters: () => void;
  copy: DashboardCopy;
}) {
  return (
    <ChartCard
      title={copy.overview.leaderboardTitle}
      subtitle={copy.overview.leaderboardSubtitle}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      isEmpty={!isLoading && !error && agents.length === 0}
      emptyVariant="filtered"
      onClearFilters={onClearFilters}
      statesCopy={copy.states}
      staleLabel={copy.overview.staleRefreshing}
      className="h-full"
    >
      <div className="overflow-x-auto -mx-2">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--z-border)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--z-ink-muted)]">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">Agent</th>
              <th className="py-2 px-2 text-right">Calls</th>
              <th className="py-2 px-2 text-right">Compliance</th>
              <th className="py-2 px-2 text-right">Delta</th>
              <th className="py-2 px-2 text-right">Avg Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--z-border)]">
            {agents.map((row, idx) => {
              const isSelected = Boolean(row.agentId && row.agentId === selectedAgentId);
              return (
                <tr
                  key={row.key}
                  onClick={() => {
                    if (row.agentId) {
                      onSelectAgent(isSelected ? "" : row.agentId);
                    }
                  }}
                  className={cn(
                    "transition-colors hover:bg-[var(--z-surface-muted)]",
                    row.agentId && "cursor-pointer",
                    isSelected && "bg-[var(--z-accent-tint)]",
                  )}
                >
                  <td className="py-2.5 px-2 font-semibold text-[var(--z-ink-muted)] z-tabular">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="font-semibold text-[var(--z-ink)] truncate max-w-[170px]">
                      {row.agentName}
                    </div>
                    {row.teamName || row.openCoachingCount > 0 ? (
                      <div className="text-[11px] text-[var(--z-ink-muted)] flex items-center gap-2">
                        {row.teamName ? <span>{row.teamName}</span> : null}
                        {row.openCoachingCount > 0 ? (
                          <span className="text-[var(--z-accent)] font-medium z-tabular">
                            {row.openCoachingCount} coaching open
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2.5 px-2 text-right font-medium text-[var(--z-ink-secondary)] z-tabular">
                    {row.callCount}
                  </td>
                  <td className="py-2.5 px-2 text-right font-medium text-[var(--z-ink-secondary)] z-tabular">
                    {row.complianceRate != null ? `${row.complianceRate}%` : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <DeltaBadge
                      delta={row.scoreDelta}
                      suffix=" pts"
                      noDataLabel={copy.overview.noPriorPeriod}
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <ScoreBadge score={row.avgScore} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
});
