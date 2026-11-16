"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import {
  buildDashboardQueryString,
  type DashboardFiltersState,
} from "@/features/filters/use-dashboard-filters";
import {
  KpiSummaryResponseSchema,
  QaTrendResponseSchema,
  SentimentBreakdownResponseSchema,
} from "@/features/dashboard/api/schemas";

export function useKpiSummaryQuery(filters: DashboardFiltersState) {
  const qs = buildDashboardQueryString(filters);
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["dashboard", "kpis", wsId, qs],
    queryFn: ({ signal }) =>
      apiRequest(`/api/dashboard/kpis?${qs}`, {
        schema: KpiSummaryResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

export function useQaTrendQuery(
  filters: DashboardFiltersState,
  trendRange?: "7d" | "30d" | "90d",
) {
  const qs = buildDashboardQueryString(filters, {
    preset: trendRange ?? (filters.preset === "custom" ? "30d" : filters.preset),
  });
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["dashboard", "qa-trend", wsId, qs],
    queryFn: ({ signal }) =>
      apiRequest(`/api/dashboard/qa-trend?${qs}`, {
        schema: QaTrendResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

export function useSentimentBreakdownQuery(
  filters: DashboardFiltersState,
  groupBy: "channel" | "queue",
) {
  const qs = buildDashboardQueryString(filters, { groupBy });
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["dashboard", "sentiment", wsId, qs],
    queryFn: ({ signal }) =>
      apiRequest(`/api/dashboard/sentiment?${qs}`, {
        schema: SentimentBreakdownResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

