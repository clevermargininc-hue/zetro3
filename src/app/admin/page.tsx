import Link from "next/link";
import { BarChart, ChartCard, Donut, HBars, LineChart, dayLabel } from "@/components/admin-charts";
import { AdminLiveUsers } from "@/components/admin-live-users";
import { PlanChip } from "@/components/admin-plan-chip";
import { KpiStrip, PageHeader } from "@/components/ui";
import { ANALYTICS_RANGES, LIVE_MINUTES, getAdminAnalytics, isAnalyticsRange, type AnalyticsRange } from "@/lib/admin-analytics";
import { BILLING_PLAN_LABELS, formatTzs, formatUsdFromTzs } from "@/lib/billing";
import { billingMonthLabel } from "@/lib/plans";

const COLORS = {
  blue: "#04B6DA",
  soft: "#E3EBFB",
  green: "#15803D",
  amber: "#B45309",
  grey: "#061C52",
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const n = (value: number) => value.toLocaleString("en-US");

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const requested = Number(range);
  const days: AnalyticsRange = isAnalyticsRange(requested) ? requested : 30;
  const data = await getAdminAnalytics(days);

  const labels = data.daily.map((point) => dayLabel(point.day));
  const activeUsers = data.daily.map((point) => point.activeUsers);
  const firstScores = data.daily.map((point) => point.firstScores);
  const rescores = data.daily.map((point) => point.rescores);
  const uploads = data.daily.map((point) => point.uploads);
  const newUsers = data.daily.map((point) => point.newUsers);
  const newWorkspaces = data.daily.map((point) => point.newWorkspaces);
  const rangeText = `Last ${days} days`;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#04B6DA]">
            <span>Admin Console</span>
            <span className="text-[#334155]">/</span>
            <span className="text-[#334155] font-normal">Real-Time Operations</span>
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#061C52]">
            Platform Analytics &amp; Overview
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[#334155] leading-relaxed">
            Realtime activity, daily call auditing throughput, active user sessions, and conversion funnel from free trial to paying enterprise accounts.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-white p-1 shadow-2xs">
          {ANALYTICS_RANGES.map((option) => (
            <Link
              key={option}
              href={option === 30 ? "/admin" : `/admin?range=${option}`}
              className={`rounded-none px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                option === days
                  ? "bg-[#04B6DA] text-white shadow-2xs"
                  : "text-[#334155] hover:text-[#061C52] hover:bg-[#F3F6FD]"
              }`}
            >
              {option}d
            </Link>
          ))}
        </div>
      </div>

      {data.setupMissing ? (
        <p className="alert-error text-[13px]">
          Analytics is not set up in the database, or it is out of date. Run <code>supabase/analytics.sql</code> in
          the Supabase SQL Editor (after <code>supabase/billing.sql</code>). Live users and activity charts start
          filling in from then.
        </p>
      ) : null}

      <AdminLiveUsers initial={data.live} liveMinutes={LIVE_MINUTES} />

      <KpiStrip
        items={[
          { label: "Active today", value: n(data.counts.activeToday) },
          { label: "Active in 7 days", value: n(data.counts.active7d) },
          { label: "Active in 30 days", value: n(data.counts.active30d) },
          { label: "Total users", value: n(data.counts.totalUsers), hint: `${n(data.companyCount)} companies` },
        ]}
      />
      {data.counts.unfinishedSignups > 0 ? (
        <p className="text-[12px] text-muted">
          {n(data.counts.unfinishedSignups)} more accounts signed up but never finished setup or joined a company.
          Most of them are bots, so they are not counted anywhere on this page.
        </p>
      ) : null}
      <KpiStrip
        items={[
          { label: "Paying companies", value: n(data.payingCount), hint: `of ${n(data.companyCount)}` },
          { label: `Calls scored in ${billingMonthLabel(new Date(data.monthStart))}`, value: n(data.scoredThisMonth) },
          {
            label: "Billing so far this month",
            value: formatTzs(data.billedTzs),
            hint: `${formatUsdFromTzs(data.billedTzs)} · estimate, excl. VAT`,
          },
          {
            label: "Calls uploaded",
            value: n(sum(uploads)),
            hint: rangeText.toLowerCase(),
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Active users per day"
          subtitle={`${rangeText} · people who opened the app`}
          total={n(Math.max(0, ...activeUsers))}
        >
          <LineChart labels={labels} values={activeUsers} label="Active users" />
          <p className="mt-2 text-[11px] text-muted">Big number: busiest day in the range.</p>
        </ChartCard>

        <ChartCard
          title="Calls scored per day"
          subtitle={rangeText}
          total={n(sum(firstScores) + sum(rescores))}
          legend={[
            { label: "First score", color: COLORS.blue },
            { label: "Re-score", color: COLORS.soft },
          ]}
        >
          <BarChart
            labels={labels}
            series={[
              { label: "First scores", color: COLORS.blue, values: firstScores },
              { label: "Re-scores", color: COLORS.soft, values: rescores },
            ]}
          />
        </ChartCard>

        <ChartCard title="Calls uploaded per day" subtitle={rangeText} total={n(sum(uploads))}>
          <BarChart labels={labels} series={[{ label: "Uploads", color: COLORS.green, values: uploads }]} />
        </ChartCard>

        <ChartCard
          title="New sign-ups per day"
          subtitle={rangeText}
          total={n(sum(newUsers))}
          legend={[
            { label: "New users", color: COLORS.blue },
            { label: "New companies", color: COLORS.amber },
          ]}
        >
          <BarChart
            labels={labels}
            series={[
              { label: "New users", color: COLORS.blue, values: newUsers },
              { label: "New companies", color: COLORS.amber, values: newWorkspaces },
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Companies by plan" subtitle="Right now">
          <Donut
            centerLabel="companies"
            slices={[
              { label: BILLING_PLAN_LABELS.trial, value: data.planMix.trial, color: COLORS.soft },
              { label: BILLING_PLAN_LABELS.monthly, value: data.planMix.monthly, color: COLORS.blue },
              { label: BILLING_PLAN_LABELS.annual, value: data.planMix.annual, color: COLORS.green },
              { label: BILLING_PLAN_LABELS.paused, value: data.planMix.paused, color: COLORS.grey },
            ]}
          />
        </ChartCard>

        <ChartCard title="Trial to paying" subtitle="All companies, all time">
          <HBars
            empty="No companies yet."
            rows={data.funnel.map((step) => ({
              key: step.label,
              label: step.label,
              value: step.value,
              hint: data.funnel[0].value ? `${Math.round((step.value / data.funnel[0].value) * 100)}%` : undefined,
            }))}
          />
        </ChartCard>

        <ChartCard title="Top companies this month" subtitle="Calls scored, including re-scores">
          <HBars
            empty="No calls scored this month yet."
            rows={data.topCompanies.map((company) => ({
              key: company.id,
              value: company.calls,
              label: (
                <Link href={`/admin/workspaces/${company.id}`} className="inline-flex items-center gap-2 hover:text-blue">
                  <span className="truncate">{company.name}</span>
                  <PlanChip plan={company.plan} />
                </Link>
              ),
            }))}
          />
        </ChartCard>
      </div>
    </div>
  );
}
