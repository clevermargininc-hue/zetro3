"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import { QueuesResponseSchema, TeamsResponseSchema } from "@/features/teams/api/schemas";

export function useTeamsQuery() {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["teams", wsId],
    queryFn: ({ signal }) =>
      apiRequest("/api/teams", { schema: TeamsResponseSchema, signal }),
    staleTime: 5 * 60_000,
    retry: shouldRetryQuery,
  });
}

export function useQueuesQuery() {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["queues", wsId],
    queryFn: ({ signal }) =>
      apiRequest("/api/queues", { schema: QueuesResponseSchema, signal }),
    staleTime: 5 * 60_000,
    retry: shouldRetryQuery,
  });
}

