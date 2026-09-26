import Link from "next/link";
import { PlanChip } from "@/components/admin-plan-chip";
import { KpiStrip, PageHeader } from "@/components/ui";
import { listWorkspacesForAdmin, type AdminWorkspaceRow } from "@/lib/admin-data";
import { BILLING_PLANS, BILLING_PLAN_LABELS, isBillingPlan } from "@/lib/billing";

type Filter = "all" | "attention" | (typeof BILLING_PLANS)[number];

function trialUsed(row: AdminWorkspaceRow) {
  return row.billing.plan === "trial" && row.scoredCalls >= row.billing.trialCalls;
}

function contractEnded(row: AdminWorkspaceRow) {
  return Boolean(row.billing.contractEnd && row.billing.contractEnd < new Date().toISOString().slice(0, 10));
}

function needsAttention(row: AdminWorkspaceRow) {
  return trialUsed(row) || contractEnded(row) || (row.duplicateCompany && row.billing.plan === "trial");
}

function matches(row: AdminWorkspaceRow, q: string) {
  if (!q) return true;
  const haystack = [row.name, row.domain, row.contact?.email, row.contact?.full_name].join(" ").toLowerCase();
  return haystack.includes(q);
}

function filterHref(filter: Filter, q: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("plan", filter);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter: Filter =
    params.plan === "attention" ? "attention" : isBillingPlan(params.plan) ? params.plan : "all";
  const q = (params.q || "").trim().toLowerCase();
  const { rows, setupMissing } = await listWorkspacesForAdmin();

  const visible = rows.filter((row) => {
    if (!matches(row, q)) return false;
    if (filter === "all") return true;
    if (filter === "attention") return needsAttention(row);
    return row.billing.plan === filter;
  });

  const count = (plan: string) => rows.filter((row) => row.billing.plan === plan).length;
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: rows.length },
    { id: "attention", label: "Needs attention", n: rows.filter(needsAttention).length },
    ...BILLING_PLANS.map((plan) => ({ id: plan, label: BILLING_PLAN_LABELS[plan], n: count(plan) })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Admin"
        title="Companies and plans"
        description="Every workspace, its plan, and how many calls it has scored. Open one to change its plan."
      />

      {setupMissing ? (
        <p className="alert-error text-[13px]">
          Plans are not set up in the database yet. Run <code>supabase/billing.sql</code> in the Supabase SQL
          Editor. Until then every workspace shows as a free trial and nothing is enforced.
        </p>
      ) : null}

      <KpiStrip
        items={[
          { label: "Workspaces", value: String(rows.length) },
          { label: "On free trial", value: String(count("trial")), hint: `${rows.filter(trialUsed).length} used up` },
          { label: "Paying", value: String(count("monthly") + count("annual")) },
          { label: "Paused", value: String(count("paused")) },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Link
              key={item.id}
              href={filterHref(item.id, q)}
              className={`chip ${filter === item.id ? "border-blue bg-blue-soft text-blue" : ""}`}
            >
              {item.label} · {item.n}
            </Link>
          ))}
        </div>
        <form action="/admin" className="flex gap-2">
          {filter !== "all" ? <input type="hidden" name="plan" value={filter} /> : null}
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Search company or email"
            className="field w-56"
          />
          <button type="submit" className="btn btn-ghost text-[13px]">
            Search
          </button>
        </form>
      </div>

      <div className="surface overflow-x-auto">
        <table className="data-table min-w-[56rem]">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Usage</th>
              <th>This month</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-[12px] text-muted">
                    {row.companyDomain || "Personal email"} · {row.access === "team" ? "Team" : "Solo"} ·{" "}
                    {row.memberCount} {row.memberCount === 1 ? "member" : "members"}
                  </p>
                </td>
                <td>
                  <p className="text-ink">{row.contact?.full_name || "—"}</p>
                  <p className="text-[12px] text-muted">{row.contact?.email || "—"}</p>
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PlanChip plan={row.billing.plan} />
                    {trialUsed(row) ? <span className="chip chip-bad">Trial used</span> : null}
                    {row.duplicateCompany ? <span className="chip chip-wait">Same company twice</span> : null}
                    {contractEnded(row) ? <span className="chip chip-bad">Contract ended</span> : null}
                  </div>
                </td>
                <td className="tabular-nums">
                  {row.billing.plan === "trial"
                    ? `${row.scoredCalls.toLocaleString("en-US")} / ${row.billing.trialCalls.toLocaleString("en-US")} trial calls`
                    : `${row.scoredCalls.toLocaleString("en-US")} scored${
                        row.billing.committedCalls
                          ? ` · ${row.billing.committedCalls.toLocaleString("en-US")}/mo committed`
                          : ""
                      }`}
                </td>
                <td className="tabular-nums">
                  {row.firstThisMonth.toLocaleString("en-US")} scored
                  {row.rescoresThisMonth ? ` · ${row.rescoresThisMonth} re-scored` : ""}
                </td>
                <td className="text-[12px] text-muted">{row.createdAt.slice(0, 10)}</td>
                <td className="text-right">
                  <Link href={`/admin/workspaces/${row.id}`} className="btn btn-ghost text-[13px]">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  No workspaces match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
