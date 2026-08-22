"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";

function authHref(path: "login" | "signup", token: string, email: string | null) {
  const next = encodeURIComponent(`/invite/${token}`);
  const extra = email ? `&email=${encodeURIComponent(email)}` : "";
  return `/${path}?next=${next}${extra}`;
}

export function InviteAccept({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [match, setMatch] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/invites/${token}`);
        const json = (await response.json()) as {
          error?: string;
          workspaceName?: string;
          email?: string;
          signedIn?: boolean;
          match?: boolean;
        };
        if (!response.ok) throw new Error(json.error || "This invitation is invalid.");
        if (cancelled) return;
        setWorkspaceName(json.workspaceName || "a workspace");
        setInviteEmail(json.email || null);
        setSignedIn(Boolean(json.signedIn));
        setMatch(Boolean(json.match));
        if (json.signedIn && json.match) {
          setJoining(true);
          const join = await authFetch(`/api/invites/${token}`, { method: "POST" });
          const joinJson = (await join.json()) as { error?: string; next?: string };
          if (!join.ok) throw new Error(joinJson.error || "Could not join.");
          window.location.href = joinJson.next || "/dashboard";
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

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Invitation</h1>
        <p className="alert-error">{error}</p>
        <Link href="/login" className="btn btn-blue w-fit">
          Sign in
        </Link>
      </div>
    );
  }

  if (!workspaceName || joining) {
    return (
      <p className="text-sm text-muted">{joining ? "Joining workspace…" : "Opening invitation…"}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="page-kicker">Invitation</p>
      <h1 className="text-2xl font-semibold">Join {workspaceName}</h1>
      <p className="text-sm text-muted">
        This invite adds you to <span className="font-medium text-ink">{workspaceName}</span>
        {inviteEmail ? ` as ${inviteEmail}` : ""}.
      </p>
      {!signedIn ? (
        <div className="flex flex-wrap gap-3">
          <Link href={authHref("signup", token, inviteEmail)} className="btn btn-blue w-fit">
            Create account and join
          </Link>
          <Link href={authHref("login", token, inviteEmail)} className="btn btn-ghost w-fit">
            Sign in and join
          </Link>
        </div>
      ) : !match ? (
        <div className="flex flex-col gap-3">
          <p className="alert-error">You are signed in with a different email. Use {inviteEmail}.</p>
          <button
            type="button"
            className="btn btn-blue w-fit"
            onClick={async () => {
              await createClient().auth.signOut();
              window.location.href = authHref("login", token, inviteEmail);
            }}
          >
            Sign in as {inviteEmail}
          </button>
        </div>
      ) : null}
    </div>
  );
}
