"use client";

import Link from "next/link";
import { CountryRegionPicker } from "@/components/country-region-picker";
import { useSettings, type SettingsData } from "@/components/settings-provider";
import { BILLING_HONESTY, formatTzs, formatUsdFromTzs } from "@/lib/billing";
import { SALES_EMAIL } from "@/lib/contact";

function UsageTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="stat-tile">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[20px] font-semibold text-ink tabular-nums">{value}</p>
      <p className="mt-0.5 text-[12px] text-muted">{hint}</p>
    </div>
  );
}

function UsagePanel({
  billing,
  usage,
}: {
  billing: NonNullable<SettingsData["billing"]>;
  usage: NonNullable<SettingsData["usage"]>;
}) {
  const count = (n: number) => n.toLocaleString("en-US");
  const isTrial = billing.plan === "trial";
  const isPaused = billing.plan === "paused";

  let remainingValue: string;
  let remainingHint: string;
  if (isTrial) {
    remainingValue = `${count(billing.trialRemaining ?? 0)} calls`;
    remainingHint = `Left of ${count(billing.trialCalls)} free calls`;
  } else if (isPaused) {
    remainingValue = "0 calls";
    remainingHint = "Scoring is paused";
  } else if (usage.committedRemaining != null && billing.committedCalls) {
    remainingValue = `${count(usage.committedRemaining)} calls`;
    remainingHint = `Left of ${count(billing.committedCalls)} in your contract this month`;
  } else {
    remainingValue = "No limit";
    remainingHint = "Every scored call is billed";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-ink">Usage · {usage.monthLabel}</h4>
        <p className="text-[12px] text-muted">Prices exclude VAT</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UsageTile
          label="Calls scored this month"
          value={count(usage.scoredThisMonth)}
          hint={
            usage.rescoredThisMonth
              ? `Plus ${count(usage.rescoredThisMonth)} re-scored at half price`
              : "No re-scores this month"
          }
        />
        <UsageTile label="Calls scored in total" value={count(billing.scoredCalls)} hint="Deleting calls does not reset this" />
        <UsageTile
          label="Spent this month"
          value={formatTzs(usage.spentTzs)}
          hint={isTrial ? "Free trial, nothing to pay" : `${formatUsdFromTzs(usage.spentTzs)} for scored calls`}
        />
        <UsageTile label="What remains" value={remainingValue} hint={remainingHint} />
      </div>
      <p className="text-[12px] text-muted">
        Short {count(usage.byBand.short)} · Medium {count(usage.byBand.medium)} · Long {count(usage.byBand.long)}
        {usage.tierLabel ? ` · Priced at the ${usage.tierLabel} calls a month rate` : ""}
      </p>
      {!isTrial && !isPaused ? (
        <p className="text-[13px] text-ink">
          Bill so far this month: <span className="font-semibold">{formatTzs(usage.invoiceTzs)}</span>{" "}
          <span className="text-muted">
            ({formatUsdFromTzs(usage.invoiceTzs)})
            {usage.minimumApplied ? " · the monthly minimum applies" : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function AccountSettings() {
  const { data, fullName, setFullName, username, setUsername, saving, patch } = useSettings();
  if (!data) return <p className="text-sm text-muted">Loading account settings…</p>;

  return (
    <div className="space-y-6">
      <div className="surface p-6 space-y-6">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Personal Profile</h2>
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
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">@</span>
              <input
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/^@+/, ""))}
                className="field bg-slate-50/70 border-slate-200 text-ink text-[13px]"
                style={{ paddingLeft: "2rem" }}
                autoComplete="username"
                placeholder="optional username"
              />
            </div>
            <p className="text-[11px] text-muted">Optional handle for quick team identification.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">
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
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">
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
              className="btn bg-blue hover:bg-blue-2 text-white text-[13px] px-5 py-2 font-semibold"
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
      <div className="surface p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">General Workspace Details</h2>
            <p className="text-[13px] text-muted mt-0.5">
              Organization profile and regional quality auditing parameters.
            </p>
          </div>
          <span className="chip capitalize">Access: {data.workspace.plan}</span>
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
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted">
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
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted block">
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
              <label className="text-[12px] font-medium uppercase tracking-wider text-muted block">
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
                className="btn bg-blue hover:bg-blue-2 text-white text-[13px] px-5 py-2 font-semibold"
              >
                {saving === "workspace" ? "Saving changes…" : "Save Workspace"}
              </button>
            ) : (
              <p className="text-[12px] text-muted italic">Only organization administrators can update workspace settings.</p>
            )}
          </div>
        </form>
      </div>

      <div className="surface p-6 space-y-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Billing</h3>
          <p className="text-[13px] text-muted mt-0.5">
            You pay per scored call, in TZS, by call length and monthly volume. For contracts and
            payment, email {SALES_EMAIL}. Solo vs Team is who can log in, not this bill.
          </p>
        </div>
        {data.billing ? (
          <div className="border border-line bg-bg px-4 py-3 text-[13px]">
            <p className="font-semibold text-ink">
              Your plan: {data.billing.label}
              {!data.billing.canScore ? <span className="chip chip-bad ml-2">Scoring stopped</span> : null}
            </p>
            <p className="mt-1 text-muted">
              {data.billing.plan === "trial"
                ? `${data.billing.scoredCalls} of ${data.billing.trialCalls} free calls scored · ${data.billing.trialRemaining ?? 0} left. Deleting a call does not give the slot back.`
                : data.billing.plan === "paused"
                  ? `Scoring is paused. Email ${SALES_EMAIL} to restart.`
                  : [
                      data.billing.committedCalls
                        ? `${data.billing.committedCalls.toLocaleString("en-US")} calls a month in your contract`
                        : null,
                      data.billing.contractEnd ? `contract ends ${data.billing.contractEnd}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Active."}
            </p>
          </div>
        ) : null}
        {data.billing && data.usage ? <UsagePanel billing={data.billing} usage={data.usage} /> : null}
        <p className="text-[12px] leading-relaxed text-muted">{BILLING_HONESTY}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/pricing" className="btn btn-ghost text-[13px]">
            View pricing
          </Link>
          <Link href="/talk-sales" className="btn btn-blue text-[13px]">
            Talk to sales
          </Link>
        </div>
      </div>

      {isAdmin && isSolo && (
        <div className="surface p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Let teammates in</h3>
            <p className="text-[13px] text-muted mt-0.5 max-w-lg">
              Invite people and set roles. Your calls and scorecard stay. This is who can log in, not
              the monthly bill.
            </p>
          </div>
          <button
            type="button"
            disabled={saving === "plan"}
            onClick={() => void patch({ plan: "team" }, "plan", "This workspace is now on the team plan.")}
            className="btn bg-slate-900 hover:bg-slate-800 text-white text-[13px] px-4 py-2 font-semibold shrink-0"
          >
            {saving === "plan" ? "Updating…" : "Turn on team access"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AuditingSettings() {
  const { data, error } = useSettings();
  if (!data) {
    return (
      <div className="surface p-6">
        <h2 className="text-[16px] font-semibold text-ink">Auditing Rules</h2>
        <p className="mt-2 text-sm text-muted">{error ? "Could not load settings." : "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="surface p-6 space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">Documents audit</h2>
        <p className="text-[13px] text-muted mt-0.5">
          Scoring never starts on its own. After a transcript is prepared, someone on the team starts an SOP
          audit against your uploaded Standards files.
          {data.workspace.languages.bilingual
            ? " This workspace prepares calls in Kiswahili and English from the recording. The transcript is speech-to-text, not rewritten."
            : " This workspace prepares and audits calls in English."}
        </p>
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50/70">
        <p className="font-semibold text-ink text-[14px]">Manual scoring only</p>
        <p className="text-[12px] text-muted leading-relaxed">
          Upload recordings, wait until the call is ready to audit, then run <strong>SOP &amp; Scorecard Audit</strong>.
          Automatic post-transcription scoring is disabled so audits are not run on a broken transcript.
        </p>
        <p className="text-[12px] text-muted leading-relaxed">
          Required files: process document, scorecard, and compliance. Opening, closing, and holding scripts are optional.
        </p>
      </div>
    </div>
  );
}

export function TeamSettings() {
  return null;
}
