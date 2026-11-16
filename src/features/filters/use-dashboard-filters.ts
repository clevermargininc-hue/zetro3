"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type FilterDatePreset = "7d" | "30d" | "90d" | "custom";
export type FilterChannel = "all" | "voice" | "whatsapp" | "email" | "chat" | "other";
export type FilterSentiment = "all" | "positive" | "neutral" | "negative";
export type FilterSortBy =
  | "created_at"
  | "overall_score"
  | "duration_seconds"
  | "agent_name"
  | "review_status";

export type DashboardFiltersState = {
  preset: FilterDatePreset;
  from: string;
  to: string;
  teamId: string;
  queueId: string;
  agentId: string;
  channel: FilterChannel;
  sentiment: FilterSentiment;
  needsReview: boolean;
  flagged: boolean;
  q: string;
  sortBy: FilterSortBy;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function serializeDashboardFilterParams(filters: DashboardFiltersState): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.preset !== "30d") sp.set("preset", filters.preset);
  if (filters.preset === "custom" && filters.from) sp.set("from", filters.from);
  if (filters.preset === "custom" && filters.to) sp.set("to", filters.to);
  if (filters.teamId) sp.set("teamId", filters.teamId);
  if (filters.queueId) sp.set("queueId", filters.queueId);
  if (filters.agentId) sp.set("agentId", filters.agentId);
  if (filters.channel !== "all") sp.set("channel", filters.channel);
  if (filters.sentiment !== "all") sp.set("sentiment", filters.sentiment);
  if (filters.needsReview) sp.set("needsReview", "1");
  if (filters.flagged) sp.set("flagged", "1");
  if (filters.q) sp.set("q", filters.q);
  if (filters.sortBy !== "created_at") sp.set("sortBy", filters.sortBy);
  if (filters.sortDir !== "desc") sp.set("sortDir", filters.sortDir);
  if (filters.page > 1) sp.set("page", String(filters.page));
  if (filters.pageSize !== 20) sp.set("pageSize", String(filters.pageSize));
  return sp;
}

export function buildDashboardQueryString(
  filters: DashboardFiltersState,
  overrides?: Partial<DashboardFiltersState> & { groupBy?: "channel" | "queue"; range?: string; limit?: number },
): string {
  const merged: DashboardFiltersState = { ...filters, ...overrides };
  const sp = serializeDashboardFilterParams(merged);
  if (!sp.has("preset")) sp.set("preset", merged.preset);
  if (overrides?.groupBy) sp.set("groupBy", overrides.groupBy);
  if (overrides?.range) sp.set("range", overrides.range);
  if (overrides?.limit) sp.set("limit", String(overrides.limit));
  return sp.toString();
}

export function useDashboardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<DashboardFiltersState>(() => {
    const rawPreset = (searchParams.get("preset") || searchParams.get("range") || "30d").toLowerCase();
    const preset: FilterDatePreset =
      rawPreset === "7d" || rawPreset === "90d" || rawPreset === "custom"
        ? (rawPreset as FilterDatePreset)
        : "30d";
    const rawChannel = (searchParams.get("channel") || "all").toLowerCase();
    const channel: FilterChannel =
      rawChannel === "voice" ||
      rawChannel === "whatsapp" ||
      rawChannel === "email" ||
      rawChannel === "chat" ||
      rawChannel === "other"
        ? rawChannel
        : "all";

    const rawSentiment = (searchParams.get("sentiment") || "all").toLowerCase();
    const sentiment: FilterSentiment =
      rawSentiment === "positive" || rawSentiment === "neutral" || rawSentiment === "negative"
        ? rawSentiment
        : "all";

    const rawSortBy = searchParams.get("sortBy") || "created_at";
    const sortBy: FilterSortBy =
      rawSortBy === "overall_score" ||
      rawSortBy === "duration_seconds" ||
      rawSortBy === "agent_name" ||
      rawSortBy === "review_status"
        ? rawSortBy
        : "created_at";

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.max(
      5,
      Math.min(100, Number.parseInt(searchParams.get("pageSize") || "20", 10) || 20),
    );

    return {
      preset,
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      teamId: searchParams.get("teamId") || "",
      queueId: searchParams.get("queueId") || "",
      agentId: searchParams.get("agentId") || "",
      channel,
      sentiment,
      needsReview: searchParams.get("needsReview") === "1" || searchParams.get("needsReview") === "true",
      flagged: searchParams.get("flagged") === "1" || searchParams.get("flagged") === "true",
      q: searchParams.get("q") || "",
      sortBy,
      sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc",
      page,
      pageSize,
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<DashboardFiltersState>, resetPage = true) => {
      const next: DashboardFiltersState = {
        ...filters,
        ...patch,
        page: resetPage && patch.page === undefined ? 1 : (patch.page ?? filters.page),
      };
      const qs = serializeDashboardFilterParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters = Boolean(
    filters.preset !== "30d" ||
      filters.teamId ||
      filters.queueId ||
      filters.agentId ||
      filters.channel !== "all" ||
      filters.sentiment !== "all" ||
      filters.needsReview ||
      filters.flagged ||
      filters.q,
  );

  const buildCallsDrilldownHref = useCallback(
    (extra?: Partial<DashboardFiltersState>) => {
      const merged = { ...filters, ...extra, page: 1 };
      const qs = serializeDashboardFilterParams(merged).toString();
      return qs ? `/calls?${qs}` : "/calls";
    },
    [filters],
  );

  return {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    buildCallsDrilldownHref,
  };
}

