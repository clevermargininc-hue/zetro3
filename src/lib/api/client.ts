"use client";

import type { ZodType } from "zod";
import { createClient } from "@/lib/supabase/client";
import { reportClientError } from "@/lib/telemetry/error-reporter";

const ACTIVE_WORKSPACE_KEY = "zetro.activeWorkspaceId";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(options: {
    message: string;
    status: number;
    code: string;
    requestId?: string | null;
  }) {
    super(options.message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId ?? null;
  }
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ACTIVE_WORKSPACE_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveWorkspaceId(workspaceId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (workspaceId) {
      window.sessionStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    } else {
      window.sessionStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  } catch {
    // Storage access may be restricted in hardened browser contexts.
  }
}

async function resolveAccessToken(forceRefresh = false): Promise<string | null> {
  const supabase = createClient();
  if (!forceRefresh) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  }
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) return null;
  return data.session.access_token;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const pathname = window.location.pathname;
  if (pathname === "/login") return;
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("next", `${pathname}${window.location.search}`);
  window.location.assign(loginUrl.toString());
}

export type ApiRequestOptions<T> = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  schema: ZodType<T>;
  signal?: AbortSignal;
  workspaceId?: string | null;
  skipAuthRedirect?: boolean;
};

/**
 * Single typed API fetch wrapper:
 * - Attaches Bearer token + active multi-tenant workspace header (`credentials: "omit"` avoids HTTP 431)
 * - Handles 401 session refresh & redirect fallback
 * - Normalizes error payloads with x-request-id
 * - Validates every JSON response via Zod before data reaches components
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions<T>,
): Promise<T> {
  const execute = async (forceRefresh: boolean): Promise<Response> => {
    const token = await resolveAccessToken(forceRefresh);
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const activeWs = options.workspaceId ?? getActiveWorkspaceId();
    if (activeWs) headers.set("x-workspace-id", activeWs);

    let serializedBody: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      serializedBody = JSON.stringify(options.body);
    }

    return fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: serializedBody,
      credentials: "omit",
      signal: options.signal,
    });
  };

  let res: Response;
  try {
    res = await execute(false);
    if (res.status === 401) {
      res = await execute(true);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    reportClientError(err, { area: "api-network", metadata: { path } });
    throw new ApiClientError({
      message: "Unable to reach Zetro API. Check your connection and retry.",
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  const headerRequestId = res.headers.get("x-request-id");

  if (res.status === 401) {
    if (!options.skipAuthRedirect) {
      redirectToLogin();
    }
    throw new ApiClientError({
      message: "Your session has expired. Please sign in again.",
      status: 401,
      code: "UNAUTHORIZED",
      requestId: headerRequestId,
    });
  }

  const rawJson = await res.json().catch(() => null);
  const bodyObj =
    rawJson && typeof rawJson === "object" ? (rawJson as Record<string, unknown>) : null;
  const requestId =
    (typeof bodyObj?.requestId === "string" ? bodyObj.requestId : null) ?? headerRequestId;

  if (!res.ok) {
    const message =
      (typeof bodyObj?.error === "string" && bodyObj.error.trim()) ||
      (typeof bodyObj?.message === "string" && bodyObj.message.trim()) ||
      `Request failed (${res.status})`;
    const code =
      typeof bodyObj?.code === "string" && bodyObj.code.trim()
        ? bodyObj.code
        : res.status === 403
          ? "FORBIDDEN"
          : "API_ERROR";

    const apiErr = new ApiClientError({
      message,
      status: res.status,
      code,
      requestId,
    });

    if (res.status >= 500) {
      reportClientError(apiErr, { area: "api-server-error", status: res.status, requestId });
    }
    throw apiErr;
  }

  const validated = options.schema.safeParse(rawJson);
  if (!validated.success) {
    const validationErr = new ApiClientError({
      message: "Unexpected response shape received from server.",
      status: res.status,
      code: "SCHEMA_VALIDATION_ERROR",
      requestId,
    });
    reportClientError(validationErr, {
      area: "api-zod-validation",
      status: res.status,
      requestId,
      metadata: {
        path,
        issueCount: validated.error.issues.length,
        firstIssue: validated.error.issues[0]?.message ?? "unknown",
      },
    });
    throw validationErr;
  }

  return validated.data;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError) {
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404 ||
      error.status === 400 ||
      error.code === "SCHEMA_VALIDATION_ERROR"
    ) {
      return false;
    }
  }
  return failureCount < 2;
}
