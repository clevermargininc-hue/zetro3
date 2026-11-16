"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import { GlobalSearchResponseSchema } from "@/features/search/api/schemas";

export function useGlobalSearchQuery(debouncedQuery: string, enabled: boolean) {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["search", wsId, debouncedQuery],
    queryFn: ({ signal }) =>
      apiRequest(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
        schema: GlobalSearchResponseSchema,
        signal,
      }),
    enabled,
    staleTime: 15_000,
    retry: shouldRetryQuery,
  });
}

