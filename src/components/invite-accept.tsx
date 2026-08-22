"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";

export function InviteAccept({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [match, setMatch] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await authFetch(`/api/invites/${token}`);
        if (response.status === 401) {
          window.location.href = `/login?next=/invite/${token}`;
          return;
        }
        const json = (await response.json()) as {
          error?: string;
          workspaceName?: string;
          email?: string;
          match?: boolean;
        };
        if (!response.ok) throw new Error(json.error || "This invitation is invalid.");
        if (cancelled) return;
        setWorkspaceName(json.workspaceName || "a workspace");
        setInviteEmail(json.email || null);
        setMatch(Boolean(json.match));
        if (json.match) {
          setJoining(true);
          const join = await authFetch(`/api/invites/${token}`, { method: "POST" });
          const joinJson = (await join.json()) as { error?: string; next?: string };
          if (!join.ok) throw new Error(joinJson.error || "Could not join.");
          window.location.href = joinJson.next || "/upload";
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not open invite.");
        setJoining(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const join = await authFetch(`/api/invites/${token}`, { method: "POST" });
      const joinJson = (await join.json()) as { error?: string; next?: string };
      if (!join.ok) throw new Error(joinJson.error || "Could not join.");
      window.location.href = joinJson.next || "/upload";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
      setJoining(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Invitation</h1>
        <p className="alert-error">{error}</p>
        <p className="text-sm text-muted">
          Sign in with the invited email, then open this link again.
        </p>
        <Link href={`/login?next=/invite/${token}`} className="btn btn-blue w-fit">
          Sign in
        </Link>
      </div>
    );
  }

  if (!workspaceName || joining) {
    return <p className="text-sm text-muted">{joining ? "Joining workspace…" : "Opening invitation…"}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="page-kicker">Invitation</p>
      <h1 className="text-2xl font-semibold">Join {workspaceName}</h1>
      <p className="text-sm text-muted">
        This invite is for {inviteEmail}. You are signed in with a different email.
      </p>
      {!match ? (
        <Link href={`/login?next=/invite/${token}`} className="btn btn-blue w-fit">
          Sign in as {inviteEmail}
        </Link>
      ) : (
        <button type="button" onClick={() => void join()} className="btn btn-blue w-fit">
          Join workspace
        </button>
      )}
    </div>
  );
}
