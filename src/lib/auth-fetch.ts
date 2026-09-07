"use client";

import { createClient } from "@/lib/supabase/client";
import { friendlyPrepareError } from "@/lib/prepare-error";

async function activeSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) return session;

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) return null;
  return data.session;
}

/**
 * Authenticated API fetch.
 * Always omit cookies — bundling huge Supabase auth cookie chunks
 * with Authorization causes HTTP 431 (headers too large).
 */
export async function authFetch(input: string, init: RequestInit = {}) {
  const session = await activeSession();
  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, {
        ...init,
        headers,
        credentials: "omit",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/fetch failed|failed to fetch|networkerror|load failed/i.test(message)) {
        throw error;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      }
    }
  }
  throw new Error(
    "Could not reach the server. Check your internet connection and try again.",
  );
}

/** Prefer API JSON errors; fall back to status-aware messages. */
export async function readApiError(
  res: Response,
  fallback = "Request failed",
): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  if (body.error?.trim()) return friendlyPrepareError(body.error.trim());
  if (body.message?.trim()) return friendlyPrepareError(body.message.trim());
  if (res.status === 401 || res.status === 403) {
    return "Please sign in again, then retry.";
  }
  if (res.status === 404) return "Call not found.";
  if (res.status === 431) {
    return "Sign out, sign back in, then retry prepare. Session data was too large to send.";
  }
  if (res.status >= 500) return "Server error while preparing. Try again in a moment.";
  return `${fallback} (${res.status})`;
}
