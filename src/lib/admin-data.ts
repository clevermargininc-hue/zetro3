import { emptyBandCounts, estimateInvoice } from "@/lib/billing";
import {
  BILLING_COLUMNS,
  billingFromRow,
  billingMonthStart,
  defaultBilling,
  getMonthBandUsage,
  getPlanStatus,
  isMissingBillingSetup,
  type BillingRow,
  type WorkspaceBilling,
} from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailDomain, isPersonalEmail } from "@/lib/workspaces";

type Profile = { id: string; email: string | null; full_name: string | null };

export type AdminWorkspaceRow = {
  id: string;
  name: string;
  access: string;
  domain: string | null;
  country: string | null;
  createdAt: string;
  memberCount: number;
  contact: Profile | null;
  companyDomain: string | null;
  billing: WorkspaceBilling;
  scoredCalls: number;
  firstThisMonth: number;
  rescoresThisMonth: number;
  duplicateCompany: boolean;
};

async function loadProfiles(ids: string[]) {
  const map = new Map<string, Profile>();
  if (!ids.length) return map;
  const { data, error } = await createAdminClient().from("profiles").select("id, email, full_name").in("id", ids);
  if (error) throw new Error(error.message);
  for (const row of data || []) map.set(row.id as string, row as Profile);
  return map;
}

function companyDomainFor(domain: string | null, contactEmail: string | null | undefined) {
  if (domain) return domain.toLowerCase();
  if (contactEmail && !isPersonalEmail(contactEmail)) return emailDomain(contactEmail);
  return null;
}

export async function listWorkspacesForAdmin() {
  const db = createAdminClient();
  const since = billingMonthStart().toISOString();

  const [workspacesRes, membersRes, billingRes, usageRes, eventsRes] = await Promise.all([
    db
      .from("workspaces")
      .select("id, name, plan, domain, country, created_by, created_at")
      .order("created_at", { ascending: false }),
    db.from("workspace_members").select("workspace_id, user_id, role"),
    db.from("workspace_billing").select(BILLING_COLUMNS),
    db.rpc("workspace_usage", { since }),
    db.from("score_events").select("workspace_id").eq("kind", "first"),
  ]);
  if (workspacesRes.error) throw new Error(workspacesRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  const setupMissing = isMissingBillingSetup(billingRes.error) || isMissingBillingSetup(usageRes.error);
  if (billingRes.error && !isMissingBillingSetup(billingRes.error)) throw new Error(billingRes.error.message);
  if (usageRes.error && !isMissingBillingSetup(usageRes.error)) throw new Error(usageRes.error.message);

  const members = membersRes.data || [];
  const billingById = new Map<string, WorkspaceBilling>();
  for (const row of (billingRes.data || []) as BillingRow[]) billingById.set(row.workspace_id, billingFromRow(row));
  const usageById = new Map<string, { scored_calls: number; first_scores: number; rescores: number }>();
  for (const row of (usageRes.data || []) as {
    workspace_id: string;
    scored_calls: number;
    first_scores: number;
    rescores: number;
  }[]) {
    usageById.set(row.workspace_id, row);
  }

  const firstScoresByWs = new Map<string, number>();
  for (const row of (eventsRes.data || []) as { workspace_id: string }[]) {
    if (row.workspace_id) {
      firstScoresByWs.set(row.workspace_id, (firstScoresByWs.get(row.workspace_id) || 0) + 1);
    }
  }

  const contactIdFor = new Map<string, string>();
  for (const ws of workspacesRes.data || []) {
    const admin = members.find((m) => m.workspace_id === ws.id && m.role === "admin");
    contactIdFor.set(ws.id as string, (admin?.user_id as string) || (ws.created_by as string));
  }
  const profiles = await loadProfiles([...new Set(contactIdFor.values())]);

  const rows: AdminWorkspaceRow[] = (workspacesRes.data || []).map((ws) => {
    const id = ws.id as string;
    const contact = profiles.get(contactIdFor.get(id) || "") || null;
    const usage = usageById.get(id);
    const cumulativeScored = Math.max(Number(usage?.scored_calls) || 0, firstScoresByWs.get(id) || 0);
    return {
      id,
      name: ws.name as string,
      access: ws.plan as string,
      domain: (ws.domain as string | null) ?? null,
      country: (ws.country as string | null) ?? null,
      createdAt: ws.created_at as string,
      memberCount: members.filter((m) => m.workspace_id === id).length,
      contact,
      companyDomain: companyDomainFor((ws.domain as string | null) ?? null, contact?.email),
      billing: billingById.get(id) || defaultBilling(id),
      scoredCalls: cumulativeScored,
      firstThisMonth: Number(usage?.first_scores) || 0,
      rescoresThisMonth: Number(usage?.rescores) || 0,
      duplicateCompany: false,
    };
  });

  const domainCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.companyDomain) domainCounts.set(row.companyDomain, (domainCounts.get(row.companyDomain) || 0) + 1);
  }
  for (const row of rows) {
    row.duplicateCompany = Boolean(row.companyDomain && (domainCounts.get(row.companyDomain) || 0) > 1);
  }

  return { rows, setupMissing, since };
}

export async function getWorkspaceForAdmin(workspaceId: string) {
  const db = createAdminClient();
  const { data: workspace, error } = await db
    .from("workspaces")
    .select("id, name, plan, domain, country, created_by, created_at")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!workspace) return null;

  const { data: memberRows, error: memberError } = await db
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (memberError) throw new Error(memberError.message);
  const profiles = await loadProfiles((memberRows || []).map((row) => row.user_id as string));
  const members = (memberRows || []).map((row) => ({
    userId: row.user_id as string,
    role: row.role as string,
    email: profiles.get(row.user_id as string)?.email || null,
    fullName: profiles.get(row.user_id as string)?.full_name || null,
  }));

  const status = await getPlanStatus(workspaceId);
  const { since, first, rescore } = status.setupMissing
    ? { since: billingMonthStart(), first: emptyBandCounts(), rescore: emptyBandCounts() }
    : await getMonthBandUsage(workspaceId);

  return {
    workspace: {
      id: workspace.id as string,
      name: workspace.name as string,
      access: workspace.plan as string,
      domain: (workspace.domain as string | null) ?? null,
      country: (workspace.country as string | null) ?? null,
      createdAt: workspace.created_at as string,
    },
    members,
    status,
    since: since.toISOString(),
    first,
    rescore,
    invoice: estimateInvoice({
      plan: status.plan,
      committedCalls: status.committedCalls,
      first,
      rescore,
    }),
  };
}
