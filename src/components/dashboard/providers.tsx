"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetryQuery } from "@/lib/api/client";
import type { SessionResponse } from "@/features/session/api/schemas";
import {
  useSessionQuery,
  useSwitchWorkspace,
  useUpdatePreferencesMutation,
} from "@/features/session/api/queries";
import {
  DEFAULT_TIMEZONE,
  getDashboardCopy,
  type DashboardCopy,
  type DashboardLocale,
} from "@/lib/i18n/dashboard";
import { hasCapability, type DashboardCapability } from "@/lib/rbac/roles";

type DashboardContextValue = {
  session: SessionResponse;
  theme: "light" | "dark";
  locale: DashboardLocale;
  timezone: string;
  copy: DashboardCopy;
  can: (capability: DashboardCapability) => boolean;
  setTheme: (theme: "light" | "dark") => void;
  setLocale: (locale: DashboardLocale) => void;
  switchWorkspace: (workspaceId: string) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: shouldRetryQuery,
      },
    },
  });
}

function DashboardSessionProviderInner({
  initialSession,
  children,
}: {
  initialSession: SessionResponse;
  children: ReactNode;
}) {
  const sessionQuery = useSessionQuery(initialSession);
  const updatePrefs = useUpdatePreferencesMutation();
  const switchWorkspace = useSwitchWorkspace();

  const session = sessionQuery.data ?? initialSession;
  const theme = session.preferences.theme;
  const locale = session.preferences.locale;
  const timezone = session.preferences.timezone || DEFAULT_TIMEZONE;

  const value = useMemo<DashboardContextValue>(
    () => ({
      session,
      theme,
      locale,
      timezone,
      copy: getDashboardCopy(locale),
      can: (cap) => hasCapability(session.user.capabilities, cap),
      setTheme: (nextTheme) => updatePrefs.mutate({ theme: nextTheme }),
      setLocale: (nextLocale) => updatePrefs.mutate({ locale: nextLocale }),
      switchWorkspace,
    }),
    [locale, session, switchWorkspace, theme, timezone, updatePrefs],
  );

  return (
    <DashboardContext.Provider value={value}>
      <div
        data-zetro-app=""
        data-theme={theme}
        className="min-h-screen bg-[var(--z-canvas)] text-[var(--z-ink)] transition-colors duration-150"
      >
        {children}
      </div>
    </DashboardContext.Provider>
  );
}

export function DashboardProviders({
  initialSession,
  children,
}: {
  initialSession: SessionResponse;
  children: ReactNode;
}) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardSessionProviderInner initialSession={initialSession}>
        {children}
      </DashboardSessionProviderInner>
    </QueryClientProvider>
  );
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used inside DashboardProviders.");
  }
  return ctx;
}

