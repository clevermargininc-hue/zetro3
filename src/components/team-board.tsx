"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { publicName } from "@/lib/display-name";

type Person = {
  userId: string;
  role?: string;
  email: string;
  fullName: string;
  username?: string;
  createdAt?: string;
};

type TeamData = {
  workspace: { id: string; name: string; plan: string; role: string; domain?: string | null };
  members: Person[];
  requests: Array<Person & { id: string; createdAt: string }>;
  invites?: Array<{ id: string; email: string; token: string; createdAt: string }>;
  error?: string;
};

function personLabel(person: { username?: string; fullName: string; email: string }) {
  const name = publicName(person);
  return person.username ? `@${name}` : name;
}

export function TeamBoard({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteDraft, setInviteDraft] = useState("");

  async function load() {
    try {
      const response = await authFetch("/api/team");
      const json = (await response.json()) as TeamData;
      if (!response.ok) {
        setError(json.error || "Could not load team.");
        return;
      }
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(body: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      const response = await authFetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { error?: string; emailed?: number | boolean };
      if (!response.ok) throw new Error(json.error || "Could not update");
      if (
        (body.action === "invite" && json.emailed === 0) ||
        (body.action === "resend-invite" && json.emailed === false)
      ) {
        setError("Invite saved, but email could not be sent. Copy the link and share it.");
      } else {
        setError(null);
      }
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function review(requestId: string, action: "approve" | "reject") {
    await act({ action, requestId }, requestId);
  }

  if (!data && !error) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      {error ? <p className="alert-error">{error}</p> : null}
      {data ? (
        <>
          {!embedded ? (
          <div>
            <p className="text-sm text-muted">
              {data.workspace.name} · {data.workspace.plan} plan
              {data.workspace.domain ? ` · ${data.workspace.domain}` : ""}
            </p>
          </div>
          ) : null}

          {data.workspace.role === "admin" ? (
            <section className="panel rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Invite</h2>
              {data.workspace.plan === "solo" ? (
                <p className="mt-2 text-sm text-muted">
                  Inviting a teammate upgrades this workspace from solo to team. We’ll email them a join link.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  We’ll email them a link to join this workspace.
                </p>
              )}
              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const email = inviteDraft.trim().toLowerCase();
                  if (!email) return;
                  const ok = await act({ action: "invite", emails: [email] }, "invite");
                  if (ok) setInviteDraft("");
                }}
              >
                <input
                  type="email"
                  required
                  value={inviteDraft}
                  onChange={(event) => setInviteDraft(event.target.value)}
                  placeholder="nina.v@example.com"
                  className="field"
                />
                <button type="submit" disabled={busy === "invite"} className="btn btn-blue shrink-0">
                  {busy === "invite" ? "Sending…" : "Send invite"}
                </button>
              </form>
              {(data.invites || []).length > 0 ? (
                <ul className="mt-4 divide-y divide-line">
                  {(data.invites || []).map((invite) => (
                    <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <p className="text-sm text-ink">{invite.email}</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-sm text-muted hover:text-ink"
                          onClick={() => {
                            const origin = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
                            const url = `${origin}/invite/${invite.token}`;
                            void navigator.clipboard.writeText(url);
                          }}
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          disabled={busy === `resend-${invite.id}`}
                          onClick={() => void act({ action: "resend-invite", inviteId: invite.id }, `resend-${invite.id}`)}
                          className="text-sm text-muted hover:text-ink"
                        >
                          {busy === `resend-${invite.id}` ? "Sending…" : "Resend"}
                        </button>
                        <button
                          type="button"
                          disabled={busy === invite.id}
                          onClick={() => void act({ action: "cancel-invite", inviteId: invite.id }, invite.id)}
                          className="text-sm text-muted hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {data.workspace.role === "admin" && data.requests.length > 0 ? (
            <section className="panel rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Join requests</h2>
              <ul className="mt-4 divide-y divide-line">
                {data.requests.map((request) => (
                  <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-ink">{personLabel(request)}</p>
                      {request.fullName && request.username ? (
                        <p className="text-sm text-muted">{request.fullName}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => review(request.id, "approve")}
                        className="btn btn-blue"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => review(request.id, "reject")}
                        className="btn btn-ghost"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="panel rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Members</h2>
            {data.workspace.plan === "solo" ? (
              <p className="mt-2 text-sm text-muted">
                This is a solo workspace. When you bring in a teammate, you can move it to the team
                plan.
              </p>
            ) : null}
            <ul className="mt-4 divide-y divide-line">
              {data.members.map((member) => (
                <li key={member.userId} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink">{personLabel(member)}</p>
                    {member.fullName && member.username ? (
                      <p className="text-sm text-muted">{member.fullName}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge bg-blue-soft text-blue">{member.role}</span>
                    {data.workspace.role === "admin" && member.role === "member" ? (
                      <button
                        type="button"
                        disabled={busy === member.userId}
                        onClick={() =>
                          void act({ action: "remove-member", userId: member.userId }, member.userId)
                        }
                        className="text-sm text-muted hover:text-rose"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
