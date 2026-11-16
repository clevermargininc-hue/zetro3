"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import {
  buildDashboardQueryString,
  type DashboardFiltersState,
} from "@/features/filters/use-dashboard-filters";
import { AgentLeaderboardResponseSchema } from "@/features/agents/api/schemas";

export function useAgentLeaderboardQuery(filters: DashboardFiltersState, limit = 10) {
  const qs = buildDashboardQueryString(filters, { limit });
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["agents", "leaderboard", wsId, qs],
    queryFn: ({ signal }) =>
      apiRequest(`/api/agents/leaderboard?${qs}`, {
        schema: AgentLeaderboardResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

