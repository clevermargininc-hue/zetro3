"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  shouldRetryQuery,
} from "@/lib/api/client";
import {
  PreferencesUpdateResponseSchema,
  SessionResponseSchema,
  type SessionResponse,
} from "@/features/session/api/schemas";

export const sessionQueryKey = (workspaceId?: string | null) =>
  ["session", workspaceId ?? getActiveWorkspaceId() ?? "default"] as const;

export function useSessionQuery(initialData?: SessionResponse) {
  const wsId = getActiveWorkspaceId();
  return useQuery({
    queryKey: sessionQueryKey(wsId),
    queryFn: ({ signal }) =>
      apiRequest("/api/session", {
        schema: SessionResponseSchema,
        signal,
        workspaceId: wsId,
      }),
    initialData: !wsId || wsId === initialData?.workspace.id ? initialData : undefined,
    staleTime: 60_000,
    retry: shouldRetryQuery,
  });
}

export type UpdatePreferencesPayload = {
  theme?: "light" | "dark";
  locale?: "en" | "sw";
  timezone?: string;
  qaTargetScore?: number | null;
  reviewScoreThreshold?: number;
};

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();
  const wsId = getActiveWorkspaceId();

  return useMutation({
    mutationFn: (payload: UpdatePreferencesPayload) =>
      apiRequest("/api/session", {
        method: "PATCH",
        body: payload,
        schema: PreferencesUpdateResponseSchema,
        workspaceId: wsId,
      }),
    onMutate: async (payload) => {
      const key = sessionQueryKey(wsId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<SessionResponse>(key);
      if (prev) {
        queryClient.setQueryData<SessionResponse>(key, {
          ...prev,
          preferences: {
            theme: payload.theme ?? prev.preferences.theme,
            locale: payload.locale ?? prev.preferences.locale,
            timezone: payload.timezone ?? prev.preferences.timezone,
          },
          workspace: {
            ...prev.workspace,
            qaTargetScore:
              payload.qaTargetScore !== undefined
                ? payload.qaTargetScore
                : prev.workspace.qaTargetScore,
            reviewScoreThreshold:
              payload.reviewScoreThreshold !== undefined
                ? payload.reviewScoreThreshold
                : prev.workspace.reviewScoreThreshold,
          },
        });
      }
      return { prev, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient();
  return (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    void queryClient.invalidateQueries();
  };
}
