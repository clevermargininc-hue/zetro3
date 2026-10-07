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
  mailConfigured?: boolean;
  error?: string;
};

function personLabel(person: { username?: string; fullName: string; email: string }) {
  const name = publicName(person);
  return person.username ? `@${name}` : name;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function TeamBoard() {
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteDraft, setInviteDraft] = useState("");

  function load() {
    return authFetch("/api/team")
      .then(async (response) => {
        const json = (await response.json()) as TeamData;
        if (!response.ok) {
          setError(json.error || "Could not load team.");
          return;
        }
        setData(json);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load team.");
      });
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
        setNotice(null);
        setError("Invite saved, but email could not be sent. Copy the link and share it.");
      } else if (body.action === "invite" || body.action === "resend-invite") {
        setError(null);
        setNotice("Invite email dispatched successfully.");
      } else {
        setError(null);
        setNotice(null);
      }
      await load();
      return true;
    } catch (err) {
      setNotice(null);
      setError(err instanceof Error ? err.message : "Could not update");
      if (body.action === "invite" || body.action === "resend-invite") await load();
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function review(requestId: string, action: "approve" | "reject") {
    await act({ action, requestId }, requestId);
  }

  if (!data && !error) {
    return <p className="text-sm text-muted">Loading team directory…</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="alert-error">{error}</p> : null}
      {notice ? <p className="alert-ok">{notice}</p> : null}
      {data ? (
        <>
          {/* Invite Teammate Card */}
          {data.workspace.role === "admin" ? (
            <section className="surface p-6 space-y-4">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Invite Team Member</h2>
                <p className="text-[13px] text-muted mt-0.5">
                  Send an email invitation with workspace access credentials.
                </p>
              </div>

              {data.mailConfigured === false ? (
                <p className="text-[12px] text-muted">
                  <span className="chip chip-wait mr-2">Email pending</span>
                  Email delivery service is pending configuration. Invitations will generate manual shareable links.
                </p>
              ) : null}

              <form
                className="flex flex-col sm:flex-row gap-3 max-w-xl"
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
                  placeholder="colleague@company.com"
                  className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
                />
                <button
                  type="submit"
                  disabled={busy === "invite"}
                  className="btn bg-blue hover:bg-blue-2 text-white text-[13px] px-5 py-2 font-semibold shrink-0"
                >
                  {busy === "invite" ? "Sending…" : "Send Invite"}
                </button>
              </form>

              {/* Active Pending Invitations */}
              {(data.invites || []).length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Pending Invitations ({(data.invites || []).length})
                  </span>
                  <div className="divide-y divide-slate-100 border border-line overflow-hidden">
                    {(data.invites || []).map((invite) => (
                      <div
                        key={invite.id}
                        className="px-4 py-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-[13px]"
                      >
                        <span className="font-medium text-ink">{invite.email}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="font-semibold text-blue hover:underline text-[12px]"
                            onClick={() => {
                              const raw = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                              const origin = (raw.match(/https?:\/\/[^\s]+/i)?.[0] || raw).replace(/\/$/, "");
                              const url = `${origin}/invite/${invite.token}`;
                              void navigator.clipboard.writeText(url);
                            }}
                          >
                            Copy Link
                          </button>
                          <button
                            type="button"
                            disabled={busy === `resend-${invite.id}`}
                            onClick={() => void act({ action: "resend-invite", inviteId: invite.id }, `resend-${invite.id}`)}
                            className="text-slate-600 hover:text-ink text-[12px]"
                          >
                            {busy === `resend-${invite.id}` ? "Sending…" : "Resend"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === invite.id}
                            onClick={() => void act({ action: "cancel-invite", inviteId: invite.id }, invite.id)}
                            className="text-rose hover:text-rose/80 text-[12px]"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* Join Requests Card */}
          {data.workspace.role === "admin" && data.requests.length > 0 ? (
            <section className="surface p-6 space-y-4">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Pending Join Requests</h2>
                <p className="text-[13px] text-muted mt-0.5">Teammates requesting to access this organization workspace.</p>
              </div>

              <div className="divide-y divide-slate-100 border border-line overflow-hidden">
                {data.requests.map((request) => (
                  <div key={request.id} className="p-4 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink text-[13px]">{personLabel(request)}</p>
                      <p className="text-[12px] text-muted">{request.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => review(request.id, "approve")}
                        className="btn bg-blue hover:bg-blue-2 text-white text-[12px] px-3.5 py-1.5 font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => review(request.id, "reject")}
                        className="btn bg-white hover:bg-slate-50 text-slate-700 border border-line text-[12px] px-3.5 py-1.5"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Members Directory */}
          <section className="surface overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-[15px] font-bold text-ink">Active Workspace Members</h2>
                <p className="text-[12px] text-muted mt-0.5">Teammates with active access to calls and scorecards</p>
              </div>
              <span className="text-[12px] font-semibold text-slate-500">
                {data.members.length} {data.members.length === 1 ? "member" : "members"}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {data.members.map((member) => (
                <div key={member.userId} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {getInitials(member.fullName || member.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate">{personLabel(member)}</p>
                      <p className="text-[11px] text-muted truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="chip capitalize">
                      {member.role || "Member"}
                    </span>
                    {data.workspace.role === "admin" && member.role === "member" && (
                      <button
                        type="button"
                        disabled={busy === member.userId}
                        onClick={() =>
                          void act({ action: "remove-member", userId: member.userId }, member.userId)
                        }
                        className="text-[12px] text-slate-400 hover:text-rose font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
