"use client";

import { useEffect, useState } from "react";
import type { LiveUser } from "@/lib/admin-analytics";
import { authFetch } from "@/lib/auth-fetch";

const REFRESH_MS = 15_000;

type LiveState = { users: LiveUser[]; generatedAt: string; setupMissing: boolean };

function ago(lastSeenAt: string, now: string) {
  const seconds = Math.max(0, Math.round((Date.parse(now) - Date.parse(lastSeenAt)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

function pageName(path: string | null) {
  if (!path) return "App";
  const first = path.split("/").filter(Boolean)[0] || "dashboard";
  const names: Record<string, string> = {
    dashboard: "Overview",
    upload: "Score calls",
    calls: "Calls",
    leaderboard: "Leaderboard",
    reports: "Reports",
    standards: "Scorecard",
    settings: "Settings",
    team: "Team",
  };
  return names[first] || path;
}

export function AdminLiveUsers({ initial, liveMinutes }: { initial: LiveState; liveMinutes: number }) {
  const [live, setLive] = useState(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      authFetch("/api/admin/live")
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          setLive((await res.json()) as LiveState);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const companies = new Set(live.users.map((user) => user.company).filter(Boolean)).size;

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-blue-soft px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="relative flex h-3 w-3">
            {live.users.length ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
            ) : null}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${live.users.length ? "bg-good" : "bg-muted"}`} />
          </span>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Live now</p>
            <p className="text-[28px] font-bold leading-none text-ink tabular-nums">
              {live.users.length}
              <span className="ml-2 text-[13px] font-medium text-muted">
                {live.users.length === 1 ? "user" : "users"} · {companies} {companies === 1 ? "company" : "companies"}
              </span>
            </p>
          </div>
        </div>
        <p className="text-[12px] text-muted">
          Online in the last {liveMinutes} minutes · refreshes every {REFRESH_MS / 1000}s
          {failed ? " · last refresh failed" : ""}
        </p>
      </div>

      {live.setupMissing ? (
        <p className="px-5 py-4 text-[13px] text-muted">
          Live users start showing after you run <code>supabase/analytics.sql</code>.
        </p>
      ) : live.users.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-muted">Nobody is using the app right now.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[40rem]">
            <thead>
              <tr>
                <th>User</th>
                <th>Company</th>
                <th>Page</th>
                <th className="text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {live.users.map((user) => (
                <tr key={user.userId}>
                  <td>
                    <p className="font-semibold text-ink">{user.name}</p>
                    <p className="text-[12px] text-muted">{user.email || "—"}</p>
                  </td>
                  <td>{user.company || "No company yet"}</td>
                  <td className="text-muted">{pageName(user.path)}</td>
                  <td className="text-right tabular-nums text-muted">{ago(user.lastSeenAt, live.generatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
