"use client";

import { createClient } from "@/lib/supabase/client";

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
 * Prefer Bearer token and omit cookies — bundling huge Supabase auth cookie
 * chunks with Authorization causes HTTP 431 (headers too large).
 */
export async function authFetch(input: string, init: RequestInit = {}) {
  const session = await activeSession();
  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
    return fetch(input, {
      ...init,
      headers,
      credentials: "omit",
    });
  }

  // No token — fall back to cookie session (may still 431 if cookies are bloated).
  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
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
  if (body.error?.trim()) return body.error.trim();
  if (body.message?.trim()) return body.message.trim();
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
