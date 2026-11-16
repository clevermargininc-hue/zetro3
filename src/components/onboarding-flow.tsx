"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, User } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { CountryRegionPicker, TanzaniaFlagIcon, WorldFlagIcon } from "@/components/country-region-picker";
import { parseCountryName } from "@/lib/locale";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";

type Match = { id: string; name: string };
type Pending = { id: string; workspaceId: string; workspaceName: string; status: string };
type Invite = { id: string; workspaceId: string; workspaceName: string };

type Status = {
  ready: boolean;
  setupRequired?: boolean;
  error?: string;
  profile: { email: string; fullName: string; firstName: string };
  membership: { workspaceId: string; name: string; plan: string; role: string } | null;
  domain: string | null;
  isPersonalEmail: boolean;
  suggestedName: string;
  match: Match | null;
  pendingRequest: Pending | null;
  invite: Invite | null;
};

type Step = "location" | "choice" | "team" | "invite" | "pending";

export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [step, setStep] = useState<Step>("location");
  const [name, setName] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<"tz" | "other" | null>(null);
  const [otherCountry, setOtherCountry] = useState("");
  const [pendingAction, setPendingAction] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await authFetch("/api/onboarding");
        const data = (await response.json()) as Status;
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error || "Could not load onboarding.");
          setStatus(data);
          return;
        }
        setStatus(data);
        setName(data.suggestedName || "");
        if (data.ready && searchParams.get("step") === "invite") {
          setStep("invite");
          return;
        }
        if (data.ready) {
          window.location.replace("/dashboard");
          return;
        }
        if (data.pendingRequest) {
          setStep("pending");
          return;
        }
        if (data.invite || data.match) {
          setStep("team");
          return;
        }
        setStep("location");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load onboarding.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const inviteHint = useMemo(() => {
    if (!status?.invite) return null;
    return status.invite;
  }, [status]);

  function resolvedCountry() {
    if (locationMode === "tz") return "Tanzania";
    if (locationMode === "other") return otherCountry.trim();
    return "";
  }

  async function post(body: Record<string, unknown>) {
    const needsCountry = body.action === "solo" || body.action === "create-team";
    if (needsCountry && !body.country) {
      try {
        body.country = parseCountryName(resolvedCountry());
      } catch {
        setPendingAction(body);
        setStep("location");
        setError("Choose where you operate first.");
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        next?: string;
        pending?: boolean;
        workspaceName?: string;
        match?: Match;
      };
      if (!response.ok) {
        if (data.match) {
          setStatus((current) =>
            current ? { ...current, match: data.match || null } : current,
          );
          setStep("team");
        }
        throw new Error(data.error || "Something went wrong");
      }
      if (data.pending) {
        setStatus((current) =>
          current
            ? {
                ...current,
                pendingRequest: {
                  id: "pending",
                  workspaceId: current.match?.id || "",
                  workspaceName: data.workspaceName || current.match?.name || "your team",
                  status: "pending",
                },
              }
            : current,
        );
        setStep("pending");
        return;
      }
      if (data.next) {
        if (data.next.startsWith("/onboarding")) {
          setStep("invite");
          router.replace("/onboarding?step=invite");
          return;
        }
        window.location.href = data.next;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function continueFromLocation() {
    setError(null);
    try {
      const country = parseCountryName(resolvedCountry());
      const next = pendingAction;
      setPendingAction(null);
      if (next) {
        void post({ ...next, country });
        return;
      }
      setStep("choice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Choose where you operate.");
    }
  }

  function addEmail() {
    const value = emailDraft.trim().toLowerCase();
    if (!value) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email.");
      return;
    }
    if (emails.includes(value)) {
      setEmailDraft("");
      return;
    }
    setEmails((current) => [...current, value]);
    setEmailDraft("");
    setError(null);
  }

  if (!status && !error) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (error && !status?.profile) {
    return <p className="alert-error">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {step === "location" ? (
        <>
          <div>
            <p className="page-kicker">Welcome</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Where do you operate?
            </h1>
            <p className="mt-2 text-sm text-muted">
              Pick Tanzania or another country. You can change this later in Settings. Tanzania scores
              in Kiswahili and English. Other countries score in English only.
            </p>
          </div>
          <CountryRegionPicker
            mode={locationMode}
            otherCountry={otherCountry}
            onModeChange={(next) => {
              setLocationMode(next);
              if (next === "tz") setOtherCountry("");
              setError(null);
            }}
            onOtherCountryChange={(value) => {
              setOtherCountry(value);
              setError(null);
            }}
          />
          <button
            type="button"
            disabled={loading || !locationMode || (locationMode === "other" && otherCountry.trim().length < 2)}
            onClick={continueFromLocation}
            className="btn btn-lg btn-blue"
          >
            Continue
          </button>
        </>
      ) : null}

      {step === "choice" ? (
        <>
          <div>
            <p className="page-kicker">Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              How will you use Zetro?
            </h1>
            <p className="mt-2 text-sm text-muted">
              This sets up the right workspace. You can change it later.
            </p>
            {locationMode ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-muted">
                {locationMode === "tz" ? (
                  <TanzaniaFlagIcon className="h-5 w-5 rounded-sm" />
                ) : (
                  <WorldFlagIcon country={otherCountry} className="h-5 w-5" />
                )}
                <span>
                  {locationMode === "tz" ? "Tanzania · Kiswahili & English" : `${otherCountry.trim()} · English only`}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep("team")}
              className="flex w-full items-start gap-4 rounded-xl border border-[#E3E9F5] bg-white p-5 text-left transition-colors hover:border-[#2F6BFF]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#E3E9F5] bg-[#F8FAFF] text-[#2459E8]">
                <Building2 className="h-[22px] w-[22px]" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-[#0A1A3F]">With my team</span>
                <span className="mt-1 block text-sm text-[#5A6882]">
                  A shared workspace for your contact center.
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => post({ action: "solo" })}
              className="flex w-full items-start gap-4 rounded-xl border border-[#E3E9F5] bg-white p-5 text-left transition-colors hover:border-[#2F6BFF]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#E3E9F5] bg-[#F8FAFF] text-[#2459E8]">
                <User className="h-[22px] w-[22px]" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-[#0A1A3F]">Just me for now</span>
                <span className="mt-1 block text-sm text-[#5A6882]">
                  A private workspace. Invite people when you are ready.
                </span>
              </span>
            </button>
          </div>
          <button type="button" onClick={() => setStep("location")} className="text-sm text-muted hover:text-ink">
            Back
          </button>
        </>
      ) : null}

      {step === "team" && status ? (
        status.match ? (
          <>
            <div>
              <p className="page-kicker">Team</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Your team at {status.match.name} is already on Zetro
              </h1>
              <p className="mt-2 text-sm text-muted">
                Ask an admin to let you in. You will not be added automatically.
              </p>
            </div>
            {status.pendingRequest?.workspaceId === status.match.id ||
            status.pendingRequest?.workspaceName === status.match.name ? (
              <p className="alert-ok">Request pending. An admin will review it.</p>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => post({ action: "join", workspaceId: status.match?.id })}
                className="btn btn-lg btn-blue"
              >
                {loading ? "Sending…" : "Request to join"}
              </button>
            )}
            {inviteHint ? (
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  post({ action: "accept-invite", workspaceId: inviteHint.workspaceId })
                }
                className="btn btn-ghost"
              >
                I have an invite to {inviteHint.workspaceName}
              </button>
            ) : null}
            <button type="button" onClick={() => setStep("choice")} className="text-sm text-muted hover:text-ink">
              Back
            </button>
          </>
        ) : (
          <>
            {inviteHint ? (
              <div>
                <p className="page-kicker">Invite</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  You were invited to {inviteHint.workspaceName}
                </h1>
                <p className="mt-2 text-sm text-muted">Join that workspace, or create a new one.</p>
              </div>
            ) : (
              <div>
                <p className="page-kicker">Workspace</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Name your workspace</h1>
                <p className="mt-2 text-sm text-muted">
                  {status.isPersonalEmail
                    ? "Personal email addresses skip company matching. Pick a name your team will recognize."
                    : "You will be the admin. Teammates can request to join from this domain later."}
                </p>
              </div>
            )}
            {inviteHint ? (
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  post({ action: "accept-invite", workspaceId: inviteHint.workspaceId })
                }
                className="btn btn-lg btn-blue"
              >
                Join {inviteHint.workspaceName}
              </button>
            ) : null}
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                post({ action: "create-team", name });
              }}
            >
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-ink">Workspace name</span>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="field"
                />
              </label>
              <button type="submit" disabled={loading} className="btn btn-lg btn-blue">
                {loading ? "Creating…" : "Create workspace"}
              </button>
            </form>
            <button type="button" onClick={() => setStep("choice")} className="text-sm text-muted hover:text-ink">
              Back
            </button>
          </>
        )
      ) : null}

      {step === "invite" ? (
        <>
          <div>
            <p className="page-kicker">Teammates</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Invite teammates</h1>
            <p className="mt-2 text-sm text-muted">Optional. We will email them a link. You can also do this later in Settings → Team.</p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (emailDraft.trim()) addEmail();
              post({ action: "invite", emails });
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">Work emails</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="nina.v@example.com"
                  className="field"
                />
                <button type="button" onClick={addEmail} className="btn btn-ghost">
                  Add
                </button>
              </div>
            </label>
            {emails.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {emails.map((value) => (
                  <li
                    key={value}
                    className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-sm"
                  >
                    {value}
                    <button
                      type="button"
                      className="text-muted hover:text-ink"
                      onClick={() => setEmails((current) => current.filter((item) => item !== value))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="submit" disabled={loading} className="btn btn-lg btn-blue">
              {loading ? "Sending…" : emails.length ? "Send invites" : "Continue"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/upload";
            }}
            className="text-sm text-muted hover:text-ink"
          >
            Skip for now
          </button>
        </>
      ) : null}

      {step === "pending" && status?.pendingRequest ? (
        <>
          <div>
            <p className="page-kicker">Request sent</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Request pending</h1>
            <p className="mt-2 text-sm text-muted">
              An admin at {status.pendingRequest.workspaceName} will review your request. You are
              not a member yet.
            </p>
          </div>
          <p className="alert-ok">We’ll open the workspace once they approve you.</p>
        </>
      ) : null}

      {error ? <p className="alert-error">{error}</p> : null}

      <button
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          clearWorkspaceCookie();
          window.location.href = "/login";
        }}
        className="text-sm text-muted hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
