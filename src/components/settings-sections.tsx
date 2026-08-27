"use client";

import { CountryRegionPicker } from "@/components/country-region-picker";
import { useSettings } from "@/components/settings-provider";

export function AccountSettings() {
  const { data, fullName, setFullName, username, setUsername, saving, patch } = useSettings();
  if (!data) return <p className="text-sm text-muted">Loading account settings…</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-line shadow-sm space-y-6">
        <div>
          <h2 className="text-[16px] font-bold text-ink">Personal Profile</h2>
          <p className="text-[13px] text-muted mt-0.5">Your identity across team audits and comments.</p>
        </div>

        <form
          className="space-y-4 max-w-xl"
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
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">@</span>
              <input
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/^@+/, ""))}
                className="field pl-8 bg-slate-50/70 border-slate-200 text-ink text-[13px]"
                autoComplete="username"
                placeholder="optional username"
              />
            </div>
            <p className="text-[11px] text-muted">Optional handle for quick team identification.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Full Name
            </label>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Work Email Address
            </label>
            <input
              value={data.profile.email}
              readOnly
              className="field bg-slate-100 border-slate-200 text-slate-600 text-[13px] cursor-not-allowed"
            />
            <p className="text-[11px] text-muted">Email is managed through your authentication provider.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving === "profile"}
              className="btn bg-blue hover:bg-blue-2 text-white shadow-sm text-[13px] px-5 py-2 font-semibold"
            >
              {saving === "profile" ? "Saving changes…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  if (!data) return <p className="text-sm text-muted">Loading workspace settings…</p>;

  const isAdmin = data.workspace.role === "admin";
  const isSolo = data.workspace.plan === "solo";
  const languages = data.workspace.languages;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-line shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-[16px] font-bold text-ink">General Workspace Details</h2>
            <p className="text-[13px] text-muted mt-0.5">
              Organization profile and regional quality auditing parameters.
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider bg-blue/10 text-blue border border-blue/20">
            Plan: {data.workspace.plan}
          </span>
        </div>

        <form
          className="space-y-4 max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            const country = locationMode === "tz" ? "Tanzania" : countryDraft;
            void patch({ workspace_name: workspaceName, country }, "workspace");
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Organization / Workspace Name
            </label>
            <input
              required
              minLength={2}
              value={workspaceName}
              disabled={!isAdmin}
              onChange={(event) => setWorkspaceName(event.target.value)}
              className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 block">
              Country & Regional Language Protocol
            </label>
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
            <p className="text-[12px] text-muted bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Active Language Models: <span className="font-semibold text-ink">{languages.label}</span>
              {data.workspace.country ? ` · ${data.workspace.country}` : null}
            </p>
          </div>

          {data.workspace.domain && (
            <div className="space-y-1">
              <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 block">
                Company Domain
              </label>
              <p className="text-[13px] font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                {data.workspace.domain}
              </p>
            </div>
          )}

          <div className="text-[12px] text-muted pt-1">
            <span>Workforce: </span>
            <span className="font-semibold text-ink">
              {data.workspace.memberCount} {data.workspace.memberCount === 1 ? "member" : "members"}
            </span>
            <span> · Your role: </span>
            <span className="font-semibold text-blue capitalize">{data.workspace.role}</span>
          </div>

          <div className="pt-2">
            {isAdmin ? (
              <button
                type="submit"
                disabled={saving === "workspace"}
                className="btn bg-blue hover:bg-blue-2 text-white shadow-sm text-[13px] px-5 py-2 font-semibold"
              >
                {saving === "workspace" ? "Saving changes…" : "Save Workspace"}
              </button>
            ) : (
              <p className="text-[12px] text-muted italic">Only organization administrators can update workspace settings.</p>
            )}
          </div>
        </form>
      </div>

      {isAdmin && isSolo && (
        <div className="bg-white rounded-lg p-6 border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-bold text-ink">Upgrade to Multi-User Team Workspace</h3>
            <p className="text-[13px] text-muted mt-0.5 max-w-lg">
              Enable multi-seat collaboration, teammate invitations, and role-based access while preserving existing calls and evaluation standards.
            </p>
          </div>
          <button
            type="button"
            disabled={saving === "plan"}
            onClick={() => void patch({ plan: "team" }, "plan", "This workspace is now on the team plan.")}
            className="btn bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-[13px] px-4 py-2 font-semibold shrink-0"
          >
            {saving === "plan" ? "Upgrading…" : "Enable Team Plan"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AuditingSettings() {
  const { data, error, saving, patch } = useSettings();
  if (!data) {
    return (
      <div className="bg-white rounded-lg p-6 border border-line shadow-sm">
        <h2 className="text-[16px] font-bold text-ink">Auditing Rules</h2>
        <p className="mt-2 text-sm text-muted">{error ? "Could not load settings." : "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-line shadow-sm space-y-6">
      <div>
        <h2 className="text-[16px] font-bold text-ink">Automated Quality Scoring</h2>
        <p className="text-[13px] text-muted mt-0.5">
          Configure how uploaded customer call recordings are evaluated.
          {data.workspace.languages.bilingual
            ? " This workspace audits in Kiswahili and English."
            : " This workspace audits in English only."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-6 p-4 rounded-lg border border-slate-200 bg-slate-50/70">
        <div>
          <p className="font-semibold text-ink text-[14px]">Automatic Post-Transcription Scoring</p>
          <p className="text-[12px] text-muted mt-0.5">
            Automatically trigger QA scoring as soon as audio transcription and speaker diarization finish.
          </p>
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
              data.auto_audit ? "Automatic scoring is off." : "Calls will score automatically after transcription.",
            )
          }
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            data.auto_audit ? "bg-blue" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              data.auto_audit ? "left-5.5" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export function TeamSettings() {
  return null;
}
