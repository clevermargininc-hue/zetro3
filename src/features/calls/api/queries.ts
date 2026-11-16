"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import {
  buildDashboardQueryString,
  type DashboardFiltersState,
} from "@/features/filters/use-dashboard-filters";
import {
  BulkCallActionResponseSchema,
  CallAudioUrlResponseSchema,
  CallDetailResponseSchema,
  FlaggedCallsResponseSchema,
} from "@/features/calls/api/schemas";

export function useFlaggedCallsQuery(filters: DashboardFiltersState) {
  const qs = buildDashboardQueryString(filters);
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["calls", "flagged-list", wsId, qs],
    queryFn: ({ signal }) =>
      apiRequest(`/api/dashboard/calls?${qs}`, {
        schema: FlaggedCallsResponseSchema,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 25_000,
    retry: shouldRetryQuery,
  });
}

export function useCallDetailQuery(callId: string | null) {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["calls", "detail", wsId, callId],
    queryFn: ({ signal }) =>
      apiRequest(`/api/calls/${callId}/detail`, {
        schema: CallDetailResponseSchema,
        signal,
      }),
    enabled: Boolean(callId),
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

export function useCallAudioUrlQuery(callId: string | null, enabled: boolean) {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["calls", "audio-url", wsId, callId],
    queryFn: ({ signal }) =>
      apiRequest(`/api/calls/${callId}/audio-url`, {
        schema: CallAudioUrlResponseSchema,
        signal,
      }),
    enabled: Boolean(callId) && enabled,
    staleTime: 10 * 60_000, // Signed URL lasts 15m; keep fresh within 10m
    gcTime: 12 * 60_000,
    retry: shouldRetryQuery,
  });
}

export function useBulkCallActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      callIds: string[];
      action: "approve" | "needs_coaching" | "escalate";
    }) =>
      apiRequest("/api/calls/bulk", {
        method: "PATCH",
        body: payload,
        schema: BulkCallActionResponseSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calls"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Watches Supabase Realtime (calls + call_scores) and lightweight polling to surface
 * a non-intrusive "New results available" refresh chip instead of jumping the table.
 */
export function useCallsLiveSignal(knownLastAnalyzedAt: string | null) {
  const queryClient = useQueryClient();
  const [hasNewResults, setHasNewResults] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("zetro-overview-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => setHasNewResults(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_scores" },
        () => setHasNewResults(true),
      )
      .subscribe();

    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await apiRequest(`/api/dashboard/kpis?preset=7d`, {
          schema: (await import("@/features/dashboard/api/schemas")).KpiSummaryResponseSchema,
          skipAuthRedirect: true,
        });
        if (
          res.lastAnalyzedAt &&
          knownLastAnalyzedAt &&
          res.lastAnalyzedAt > knownLastAnalyzedAt
        ) {
          setHasNewResults(true);
        }
      } catch {
        // Silent background check; explicit errors appear in active queries.
      }
    }, 45_000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [knownLastAnalyzedAt]);

  const acknowledgeAndRefresh = async () => {
    setHasNewResults(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["calls"] }),
      queryClient.invalidateQueries({ queryKey: ["agents"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };

  return { hasNewResults, acknowledgeAndRefresh };
}

