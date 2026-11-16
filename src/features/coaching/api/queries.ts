"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getActiveWorkspaceId, shouldRetryQuery } from "@/lib/api/client";
import type { CallDetailResponse } from "@/features/calls/api/schemas";
import {
  CoachingTasksListResponseSchema,
  CreateCoachingTaskResponseSchema,
} from "@/features/coaching/api/schemas";

export function useCoachingTasksQuery(callId?: string | null) {
  const wsId = getActiveWorkspaceId();
  const qs = callId ? `?callId=${encodeURIComponent(callId)}` : "";
  return useQuery({
    queryKey: ["coaching", "list", wsId, callId ?? "all"],
    queryFn: ({ signal }) =>
      apiRequest(`/api/coaching-tasks${qs}`, {
        schema: CoachingTasksListResponseSchema,
        signal,
      }),
    staleTime: 30_000,
    retry: shouldRetryQuery,
  });
}

export type AssignCoachingInput = {
  callId: string;
  agentId?: string | null;
  title: string;
  notes?: string;
  criterion?: string | null;
  priority: "low" | "medium" | "high" | "critical";
};

export function useAssignCoachingMutation() {
  const queryClient = useQueryClient();
  const wsId = getActiveWorkspaceId();

  return useMutation({
    mutationFn: (payload: AssignCoachingInput) =>
      apiRequest("/api/coaching-tasks", {
        method: "POST",
        body: payload,
        schema: CreateCoachingTaskResponseSchema,
      }),
    onMutate: async (payload) => {
      const detailKey = ["calls", "detail", wsId, payload.callId] as const;
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prevDetail = queryClient.getQueryData<CallDetailResponse>(detailKey);

      if (prevDetail) {
        const optimisticTask = {
          id: `optimistic-${Date.now()}`,
          title: payload.title,
          notes: payload.notes || "",
          criterion: payload.criterion ?? null,
          priority: payload.priority,
          status: "open",
          dueAt: null,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<CallDetailResponse>(detailKey, {
          ...prevDetail,
          call: {
            ...prevDetail.call,
            reviewStatus: "needs_coaching",
          },
          coachingTasks: [optimisticTask, ...prevDetail.coachingTasks],
        });
      }
      return { prevDetail, detailKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevDetail) {
        queryClient.setQueryData(ctx.detailKey, ctx.prevDetail);
      }
    },
    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["calls", "detail", wsId, vars.callId] });
      void queryClient.invalidateQueries({ queryKey: ["calls", "flagged-list"] });
      void queryClient.invalidateQueries({ queryKey: ["agents", "leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["coaching"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
    },
  });
}

