"use client";

import { CountryRegionPicker } from "@/components/country-region-picker";
import { useSettings } from "@/components/settings-provider";

export function AccountSettings() {
  const { data, fullName, setFullName, username, setUsername, saving, patch } = useSettings();
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted">Your name is what teammates see.</p>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void patch(
            username.trim()
              ? { full_name: fullName, username }
              : { full_name: fullName },
            "profile",
          );
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Username</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input
              minLength={3}
              maxLength={24}
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/^@+/, ""))}
              className="field pl-7"
              autoComplete="username"
              placeholder="optional"
            />
          </div>
          <span className="text-xs text-muted">Optional. Teammates also see your full name.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Full name</span>
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Email</span>
          <input value={data.profile.email} readOnly className="field opacity-80" />
        </label>
        <button type="submit" disabled={saving === "profile"} className="btn btn-blue self-start">
          {saving === "profile" ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}

export function WorkspaceSettings() {
  const {
    data,
    workspaceName,
    setWorkspaceName,
    countryDraft,
    setCountryDraft,
    locationMode,
    setLocationMode,
    saving,
    patch,
  } = useSettings();
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  const isAdmin = data.workspace.role === "admin";
  const isSolo = data.workspace.plan === "solo";
  const languages = data.workspace.languages;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          <p className="mt-1 text-sm text-muted">
            Created at signup as {isSolo ? "Just me for now" : "With my team"}.
          </p>
        </div>
        <span className="badge bg-blue-soft text-blue capitalize">{data.workspace.plan}</span>
      </div>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const country = locationMode === "tz" ? "Tanzania" : countryDraft;
          void patch({ workspace_name: workspaceName, country }, "workspace");
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Workspace name</span>
          <input
            required
            minLength={2}
            value={workspaceName}
            disabled={!isAdmin}
            onChange={(event) => setWorkspaceName(event.target.value)}
            className="field"
          />
        </label>
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-ink">Country / region</span>
          <CountryRegionPicker
            mode={locationMode}
            otherCountry={countryDraft}
            disabled={!isAdmin}
            onModeChange={(next) => {
              setLocationMode(next);
              if (next === "tz") setCountryDraft("");
            }}
            onOtherCountryChange={setCountryDraft}
          />
          <p className="text-sm text-muted">
            Auditing languages: <span className="font-medium text-ink">{languages.label}</span>
            {data.workspace.country ? ` · ${data.workspace.country}` : null}
          </p>
        </div>
        {data.workspace.domain ? (
          <p className="text-sm text-muted">
            Company domain: <span className="font-medium text-ink">{data.workspace.domain}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {data.workspace.memberCount} {data.workspace.memberCount === 1 ? "member" : "members"} · you are{" "}
          {data.workspace.role}.
        </p>
        {isAdmin ? (
          <button type="submit" disabled={saving === "workspace"} className="btn btn-blue self-start">
            {saving === "workspace" ? "Saving…" : "Save workspace"}
          </button>
        ) : (
          <p className="text-sm text-muted">Ask an admin to change workspace settings.</p>
        )}
      </form>
      {isAdmin && isSolo ? (
        <div className="mt-8 rounded-xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">Move to a team workspace</p>
          <p className="mt-1 text-sm text-muted">
            Keeps your calls and standards. Teammates can then request to join or accept an emailed invite.
          </p>
          <button
            type="button"
            disabled={saving === "plan"}
            onClick={() => void patch({ plan: "team" }, "plan", "This workspace is now on the team plan.")}
            className="btn btn-ghost mt-3"
          >
            {saving === "plan" ? "Updating…" : "Upgrade to team"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function AuditingSettings() {
  const { data, error, saving, patch } = useSettings();
  if (!data) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Auditing</h1>
        <p className="mt-2 text-sm text-muted">{error ? "Could not load this setting." : "Loading…"}</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Auditing</h1>
      <p className="mt-1 text-sm text-muted">
        When this is on, Zetro scores a call automatically after transcription finishes.
        {data.workspace.languages.bilingual
          ? " This workspace audits Kiswahili and English."
          : " This workspace audits in English only."}
      </p>
      <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-line bg-white/70 p-5">
        <div>
          <p className="font-medium text-ink">Automatic scoring</p>
          <p className="text-sm text-muted">Uses built-in QA criteria, not your uploaded standards.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.auto_audit}
          disabled={saving === "audit"}
          onClick={() =>
            void patch(
              { auto_audit: !data.auto_audit },
              "audit",
              data.auto_audit ? "Automatic scoring is off." : "Calls will score after transcription.",
            )
          }
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            data.auto_audit ? "bg-blue" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${
              data.auto_audit ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </section>
  );
}

export function TeamSettings() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
      <p className="mt-1 mb-8 text-sm text-muted">Members, invites, and join requests for this workspace.</p>
    </section>
  );
}
