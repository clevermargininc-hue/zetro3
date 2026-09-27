import { listWorkspacesForAdmin } from "@/lib/admin-data";
import { BILLING_PLANS, emptyBandCounts, estimateInvoice, type BandCounts, type BillingPlan, type LengthBand } from "@/lib/billing";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { billingMonthStart, isMissingBillingSetup } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

/** A user counts as live if the app pinged within this many minutes (it pings every minute). */
export const LIVE_MINUTES = 3;

const TZ = "Africa/Dar_es_Salaam";
const TEST_EMAIL = /@(example\.(com|org|net)|[^@]+\.(test|example|invalid|localhost))$/i;

/** Zetro staff and reserved test addresses are never counted as customers. */
function isStaffOrTestEmail(email: string | null | undefined) {
  return Boolean(email) && (isPlatformAdmin(email) || TEST_EMAIL.test(email!.trim()));
}

function tanzaniaDay(value: string | Date) {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: TZ });
}

function lastDays(days: number) {
  const [y, m, d] = tanzaniaDay(new Date()).split("-").map(Number);
  return Array.from({ length: days }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (days - 1 - i))).toISOString().slice(0, 10),
  );
}

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function isAnalyticsRange(value: number): value is AnalyticsRange {
  return (ANALYTICS_RANGES as readonly number[]).includes(value);
}

export type DailyPoint = {
  day: string;
  activeUsers: number;
  uploads: number;
  firstScores: number;
  rescores: number;
  newUsers: number;
  newWorkspaces: number;
};

export type LiveUser = {
  userId: string;
  name: string;
  email: string | null;
  company: string | null;
  path: string | null;
  lastSeenAt: string;
};

function isMissingAnalyticsSetup(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    isMissingBillingSetup(error) ||
    /user_presence|user_active_days|record_presence|admin_daily_activity|admin_active_counts|all_band_usage/.test(
      (error.message || "").toLowerCase(),
    )
  );
}

export async function getLiveUsers(): Promise<{ users: LiveUser[]; setupMissing: boolean; generatedAt: string }> {
  const db = createAdminClient();
  const cutoff = new Date(Date.now() - LIVE_MINUTES * 60_000).toISOString();
  const generatedAt = new Date().toISOString();
  const { data, error } = await db
    .from("user_presence")
    .select("user_id, workspace_id, path, last_seen_at")
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false })
    .limit(200);
  if (error) {
    if (isMissingAnalyticsSetup(error)) return { users: [], setupMissing: true, generatedAt };
    throw new Error(error.message);
  }

  const rows = data || [];
  const userIds = rows.map((row) => row.user_id as string);
  const workspaceIds = [...new Set(rows.map((row) => row.workspace_id as string | null).filter(Boolean))] as string[];
  const [profilesRes, workspacesRes] = await Promise.all([
    userIds.length
      ? db.from("profiles").select("id, email, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    workspaceIds.length
      ? db.from("workspaces").select("id, name").in("id", workspaceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const profiles = new Map(
    ((profilesRes.data || []) as { id: string; email: string | null; full_name: string | null }[]).map((row) => [
      row.id,
      row,
    ]),
  );
  const workspaces = new Map(
    ((workspacesRes.data || []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  return {
    setupMissing: false,
    generatedAt,
    users: rows
      .map((row) => {
        const profile = profiles.get(row.user_id as string);
        return {
          userId: row.user_id as string,
          name: profile?.full_name || profile?.email?.split("@")[0] || "Unknown user",
          email: profile?.email || null,
          company: workspaces.get(row.workspace_id as string) || null,
          path: (row.path as string | null) ?? null,
          lastSeenAt: row.last_seen_at as string,
        };
      })
      .filter((user) => !isStaffOrTestEmail(user.email)),
  };
}

/**
 * Real customers = people who finished setup and belong to a workspace, minus Zetro staff and test
 * addresses. Accounts that never joined a workspace are mostly bot sign-ups hitting Supabase directly.
 */
async function loadRealAudience() {
  const db = createAdminClient();
  const [membersRes, signupsRes] = await Promise.all([
    db.from("workspace_members").select("workspace_id, user_id"),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  if (membersRes.error) throw new Error(membersRes.error.message);
  if (signupsRes.error) throw new Error(signupsRes.error.message);

  const members = (membersRes.data || []) as { workspace_id: string; user_id: string }[];
  const memberIds = [...new Set(members.map((row) => row.user_id))];
  const profilesRes = memberIds.length
    ? await db.from("profiles").select("id, email, created_at").in("id", memberIds)
    : { data: [], error: null };
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const profiles = (profilesRes.data || []) as { id: string; email: string | null; created_at: string }[];
  const realProfiles = profiles.filter((row) => !isStaffOrTestEmail(row.email));
  const realUserIds = new Set(realProfiles.map((row) => row.id));
  const realWorkspaceIds = new Set(
    members.filter((row) => realUserIds.has(row.user_id)).map((row) => row.workspace_id),
  );

  return {
    realProfiles,
    realUserIds,
    realWorkspaceIds,
    unfinishedSignups: Math.max(0, (signupsRes.count ?? 0) - memberIds.length),
  };
}

export async function getAdminAnalytics(days: AnalyticsRange) {
  const db = createAdminClient();
  const since = billingMonthStart();

  const [audience, allCompanies, live] = await Promise.all([
    loadRealAudience(),
    listWorkspacesForAdmin(),
    getLiveUsers(),
  ]);
  const userIds = [...audience.realUserIds];
  const workspaceIds = [...audience.realWorkspaceIds];
  const companies = {
    ...allCompanies,
    rows: allCompanies.rows.filter((row) => audience.realWorkspaceIds.has(row.id)),
  };

  const [dailyRes, countsRes, bandsRes] = await Promise.all([
    db.rpc("admin_daily_activity", { days, p_users: userIds, p_workspaces: workspaceIds }),
    db.rpc("admin_active_counts", { p_users: userIds }),
    db.rpc("all_band_usage", { since: since.toISOString() }),
  ]);

  for (const res of [dailyRes, countsRes, bandsRes]) {
    if (res.error && !isMissingAnalyticsSetup(res.error)) throw new Error(res.error.message);
  }
  const setupMissing =
    live.setupMissing ||
    isMissingAnalyticsSetup(dailyRes.error) ||
    isMissingAnalyticsSetup(countsRes.error) ||
    isMissingAnalyticsSetup(bandsRes.error);

  const activityByDay = new Map(
    ((dailyRes.data || []) as Record<string, unknown>[]).map((row) => [String(row.day), row]),
  );
  const tally = (dates: string[]) => {
    const map = new Map<string, number>();
    for (const day of dates) map.set(day, (map.get(day) || 0) + 1);
    return map;
  };
  const newUsersByDay = tally(audience.realProfiles.map((row) => tanzaniaDay(row.created_at)));
  const newWorkspacesByDay = tally(companies.rows.map((row) => tanzaniaDay(row.createdAt)));

  const daily: DailyPoint[] = lastDays(days).map((day) => {
    const row = activityByDay.get(day) || {};
    return {
      day,
      activeUsers: Number(row.active_users) || 0,
      uploads: Number(row.uploads) || 0,
      firstScores: Number(row.first_scores) || 0,
      rescores: Number(row.rescores) || 0,
      newUsers: newUsersByDay.get(day) || 0,
      newWorkspaces: newWorkspacesByDay.get(day) || 0,
    };
  });

  const countsRow = ((countsRes.data || []) as Record<string, unknown>[])[0] || {};
  const counts = {
    activeToday: Number(countsRow.active_today) || 0,
    active7d: Number(countsRow.active_7d) || 0,
    active30d: Number(countsRow.active_30d) || 0,
    totalUsers: audience.realUserIds.size,
    unfinishedSignups: audience.unfinishedSignups,
  };

  const bandsByWorkspace = new Map<string, { first: BandCounts; rescore: BandCounts }>();
  for (const row of (bandsRes.data || []) as { workspace_id: string; kind: string; band: LengthBand; calls: number }[]) {
    const entry = bandsByWorkspace.get(row.workspace_id) || { first: emptyBandCounts(), rescore: emptyBandCounts() };
    const bucket = row.kind === "rescore" ? entry.rescore : entry.first;
    if (row.band in bucket) bucket[row.band] += Number(row.calls) || 0;
    bandsByWorkspace.set(row.workspace_id, entry);
  }

  let billedTzs = 0;
  const planMix = Object.fromEntries(BILLING_PLANS.map((plan) => [plan, 0])) as Record<BillingPlan, number>;
  for (const row of companies.rows) {
    planMix[row.billing.plan] += 1;
    const bands = bandsByWorkspace.get(row.id);
    const invoice = estimateInvoice({
      plan: row.billing.plan,
      committedCalls: row.billing.committedCalls,
      first: bands?.first || emptyBandCounts(),
      rescore: bands?.rescore || emptyBandCounts(),
    });
    if (invoice) billedTzs += invoice.totalTzs;
  }

  const topCompanies = companies.rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      plan: row.billing.plan,
      calls: row.firstThisMonth + row.rescoresThisMonth,
    }))
    .filter((row) => row.calls > 0)
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 8);

  const trials = companies.rows.filter((row) => row.billing.plan === "trial");
  const funnel = [
    { label: "Companies signed up", value: companies.rows.length },
    { label: "Scored at least one call", value: companies.rows.filter((row) => row.scoredCalls > 0).length },
    { label: "Used the whole free trial", value: trials.filter((row) => row.scoredCalls >= row.billing.trialCalls).length },
    { label: "Paying (monthly or annual)", value: planMix.monthly + planMix.annual },
  ];

  const scoredThisMonth = companies.rows.reduce((sum, row) => sum + row.firstThisMonth + row.rescoresThisMonth, 0);

  return {
    days,
    setupMissing,
    billingSetupMissing: companies.setupMissing,
    live,
    counts,
    daily,
    planMix,
    topCompanies,
    funnel,
    companyCount: companies.rows.length,
    payingCount: planMix.monthly + planMix.annual,
    scoredThisMonth,
    billedTzs,
    monthStart: since.toISOString(),
  };
}
