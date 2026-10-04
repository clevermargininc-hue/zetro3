import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPlanForm } from "@/components/admin-plan-form";
import { PlanChip } from "@/components/admin-plan-chip";
import { KpiStrip, PageHeader } from "@/components/ui";
import { getWorkspaceForAdmin } from "@/lib/admin-data";
import { LENGTH_BANDS, SETUP_FEE_TZS, formatTzs, formatUsdFromTzs } from "@/lib/billing";

export default async function AdminWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkspaceForAdmin(id);
  if (!data) notFound();
  const { workspace, members, status, first, rescore, invoice, since } = data;
  const monthLabel = new Date(since).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Dar_es_Salaam",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">
            <Link href="/admin" className="hover:underline">Admin Console</Link>
            <span className="text-slate-300">/</span>
            <Link href="/admin/companies" className="hover:underline text-muted">Companies</Link>
            <span className="text-slate-300">/</span>
            <span className="text-ink font-normal">{workspace.name}</span>
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink">
            {workspace.name}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {[
              workspace.domain || "No company domain",
              workspace.access === "team" ? "Team access" : "Solo access",
              workspace.country || "Tanzania",
              `Workspace created ${workspace.createdAt.slice(0, 10)}`,
            ].join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PlanChip plan={status.plan} />
          <Link
            href="/admin/companies"
            className="rounded border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-ink hover:bg-slate-50 transition-colors shadow-2xs"
          >
            ← Back to Companies
          </Link>
        </div>
      </div>

      {status.setupMissing ? (
        <p className="alert-error text-[13px]">
          Run <code>supabase/billing.sql</code> in the Supabase SQL Editor before saving plans.
        </p>
      ) : null}

      <KpiStrip
        items={[
          { label: "Calls scored (all time)", value: status.scoredCalls.toLocaleString("en-US") },
          {
            label: status.plan === "trial" ? "Trial left" : "Committed / month",
            value:
              status.plan === "trial"
                ? `${status.trialRemaining ?? 0} of ${status.trialCalls}`
                : status.committedCalls
                  ? status.committedCalls.toLocaleString("en-US")
                  : "—",
          },
          {
            label: `Scored in ${monthLabel}`,
            value: (first.short + first.medium + first.long).toLocaleString("en-US"),
            hint: `${rescore.short + rescore.medium + rescore.long} re-scored`,
          },
          {
            label: "Can score now",
            value: status.canScore ? "Yes" : "No",
            hint: status.canScore ? undefined : status.plan === "paused" ? "Paused" : "Trial used",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="surface p-6">
          <h2 className="text-[15px] font-bold text-ink">Set plan</h2>
          <p className="mt-1 text-[13px] text-muted">
            The customer sees this plan in the app. Changes apply on their next upload or score.
          </p>
          <div className="mt-5">
            <AdminPlanForm
              workspaceId={workspace.id}
              initial={{
                plan: status.plan,
                trialCalls: status.trialCalls,
                committedCalls: status.committedCalls,
                contractStart: status.contractStart,
                contractEnd: status.contractEnd,
                notes: status.notes,
              }}
            />
          </div>
          {status.updatedAt ? (
            <p className="mt-4 text-[12px] text-muted">
              Last changed {status.updatedAt.slice(0, 16).replace("T", " ")} UTC
              {status.updatedBy ? ` by ${status.updatedBy}` : ""}.
            </p>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="surface p-6">
            <h2 className="text-[15px] font-bold text-ink">Invoice estimate · {monthLabel}</h2>
            {invoice ? (
              <div className="mt-3 space-y-3 text-[13px]">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Length</th>
                      <th className="text-right">Scored</th>
                      <th className="text-right">Re-scored</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LENGTH_BANDS.map((band) => (
                      <tr key={band.id}>
                        <td>
                          {band.label} <span className="text-muted">({band.range.toLowerCase()})</span>
                        </td>
                        <td className="text-right tabular-nums">{first[band.id].toLocaleString("en-US")}</td>
                        <td className="text-right tabular-nums">{rescore[band.id].toLocaleString("en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Volume level</dt>
                    <dd className="text-ink">{invoice.tier.label}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Scored calls</dt>
                    <dd className="tabular-nums text-ink">{formatTzs(invoice.firstTzs)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Re-scores (half price)</dt>
                    <dd className="tabular-nums text-ink">{formatTzs(invoice.rescoreTzs)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                    <dt className="text-ink">Invoice (excl. VAT)</dt>
                    <dd className="tabular-nums text-ink">
                      {formatTzs(invoice.totalTzs)}{" "}
                      <span className="font-normal text-muted">({formatUsdFromTzs(invoice.totalTzs)})</span>
                    </dd>
                  </div>
                </dl>
                <p className="text-[12px] leading-relaxed text-muted">
                  {invoice.minimumApplied ? "The 500,000 TZS monthly minimum applies. " : ""}
                  {invoice.cycle === "annual"
                    ? "Annual prices (10% off). Setup waived."
                    : `Add the ${formatTzs(SETUP_FEE_TZS)} setup fee on the first invoice.`}{" "}
                  Counts only scores made after plans were switched on.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-muted">
                {status.plan === "trial" ? "Free trial — nothing to invoice." : "Paused — nothing to invoice."}
              </p>
            )}
          </section>

          <section className="surface p-6">
            <h2 className="text-[15px] font-bold text-ink">Members</h2>
            <ul className="mt-3 divide-y divide-line">
              {members.map((member) => (
                <li key={member.userId} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div>
                    <p className="font-semibold text-ink">{member.fullName || member.email || member.userId}</p>
                    <p className="text-[12px] text-muted">{member.email || "—"}</p>
                  </div>
                  <span className="chip capitalize">{member.role}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
