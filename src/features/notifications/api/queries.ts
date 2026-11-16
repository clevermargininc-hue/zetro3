"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import {
  MarkNotificationsReadResponseSchema,
  NotificationsResponseSchema,
} from "@/features/notifications/api/schemas";

export function useNotificationsQuery() {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: ["notifications", wsId],
    queryFn: ({ signal }) =>
      apiRequest("/api/notifications", {
        schema: NotificationsResponseSchema,
        signal,
      }),
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string; markAll?: boolean }) =>
      apiRequest("/api/notifications", {
        method: "PATCH",
        body: payload,
        schema: MarkNotificationsReadResponseSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

