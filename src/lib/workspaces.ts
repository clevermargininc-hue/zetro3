import { createAdminClient } from "@/lib/supabase/admin";
import { displayCountry, parseCountryName } from "@/lib/locale";

export type WorkspacePlan = "solo" | "team";
export type WorkspaceRole = "admin" | "member";

export type Workspace = {
  id: string;
  name: string;
  plan: WorkspacePlan;
  domain: string | null;
  country: string | null;
  created_by: string;
  created_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
};

/** Later: prompt solo workspaces to upgrade to team after a second invite or usage cap. Not part of signup. */
export const SOLO_UPGRADE_HOOK = "solo-to-team";

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "hey.com",
  "fastmail.com",
  "tutanota.com",
]);

const SUFFIXES = new Set([
  "com",
  "co",
  "org",
  "net",
  "io",
  "ai",
  "edu",
  "gov",
  "ac",
  "or",
  "tz",
  "ke",
  "ug",
  "za",
  "uk",
  "us",
]);

export function emailDomain(email: string) {
  const at = email.trim().toLowerCase().split("@")[1];
  return at || null;
}

export function isPersonalEmail(email: string) {
  const domain = emailDomain(email);
  return !domain || PERSONAL_DOMAINS.has(domain);
}

export function guessWorkspaceName(domain: string) {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1] || "")) {
    parts.pop();
  }
  const raw = parts[parts.length - 1] || domain;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function firstNameFrom(fullName: string | null | undefined, email: string) {
  const fromName = (fullName || "").trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = (email.split("@")[0] || "My").replace(/[._-]+/g, " ").trim();
  const token = local.split(/\s+/)[0] || "My";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function isSetupRequired(error: unknown) {
  return Boolean(error && typeof error === "object" && "setupRequired" in error);
}

export function isMissingWorkspaceTable(error: { message?: string; code?: string } | null) {
  const message = (error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    (message.includes("workspaces") && message.includes("does not exist")) ||
    (message.includes("workspace_members") && message.includes("does not exist"))
  );
}

function setupError() {
  const setup = new Error(
    "Run supabase/workspaces.sql in the Supabase SQL Editor, then continue signup.",
  );
  (setup as Error & { setupRequired?: boolean }).setupRequired = true;
  return setup;
}

export function isMissingCountryColumn(error: { message?: string } | null) {
  const message = (error?.message || "").toLowerCase();
  return (
    message.includes("country") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("could not find"))
  );
}

function countrySetupError() {
  const setup = new Error(
    "Run supabase/country.sql in the Supabase SQL Editor, then continue.",
  );
  (setup as Error & { setupRequired?: boolean }).setupRequired = true;
  return setup;
}

export async function getMembership(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingWorkspaceTable(error)) throw setupError();
    throw new Error(error.message);
  }
  if (!data) return null;

  let workspaceQuery = await supabase
    .from("workspaces")
    .select("id, name, plan, domain, country")
    .eq("id", data.workspace_id)
    .maybeSingle();
  if (workspaceQuery.error && isMissingCountryColumn(workspaceQuery.error)) {
    workspaceQuery = await supabase
      .from("workspaces")
      .select("id, name, plan, domain")
      .eq("id", data.workspace_id)
      .maybeSingle();
  }
  if (workspaceQuery.error) throw new Error(workspaceQuery.error.message);
  const workspace = workspaceQuery.data;
  if (!workspace) return null;

  return {
    workspaceId: workspace.id as string,
    name: workspace.name as string,
    plan: workspace.plan as WorkspacePlan,
    domain: (workspace.domain as string | null) ?? null,
    country: displayCountry((workspace as { country?: string | null }).country),
    role: data.role as WorkspaceRole,
  };
}

export async function createWorkspace(input: {
  name: string;
  plan: WorkspacePlan;
  domain: string | null;
  userId: string;
  role?: WorkspaceRole;
  country?: string | null;
}) {
  const supabase = createAdminClient();
  const country = input.country ? parseCountryName(input.country) : "Tanzania";
  let inserted = await supabase
    .from("workspaces")
    .insert({
      name: input.name.trim(),
      plan: input.plan,
      domain: input.domain,
      country,
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (inserted.error && isMissingCountryColumn(inserted.error)) {
    inserted = await supabase
      .from("workspaces")
      .insert({
        name: input.name.trim(),
        plan: input.plan,
        domain: input.domain,
        created_by: input.userId,
      })
      .select("*")
      .single();
  }

  const { data: workspace, error } = inserted;
  if (error) {
    if (isMissingWorkspaceTable(error)) throw setupError();
    throw new Error(error.message);
  }

  try {
    await saveProfileCountry(input.userId, country);
  } catch {
    // Profile country is optional; workspace create should still succeed.
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: input.userId,
    role: input.role || "admin",
  });
  if (memberError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    throw new Error(memberError.message);
  }

  return { ...(workspace as Workspace), country };
}

export async function saveProfileCountry(userId: string, country: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ country }).eq("id", userId);
  if (error && !isMissingCountryColumn(error)) {
    throw new Error(error.message);
  }
}

export async function updateWorkspaceCountry(workspaceId: string, country: string) {
  const value = parseCountryName(country);
  const supabase = createAdminClient();
  const { error } = await supabase.from("workspaces").update({ country: value }).eq("id", workspaceId);
  if (error) {
    if (isMissingCountryColumn(error)) throw countrySetupError();
    throw new Error(error.message);
  }
  return value;
}

export async function findWorkspaceByDomain(domain: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, plan, domain")
    .eq("domain", domain)
    .maybeSingle();
  if (error) {
    if (isMissingWorkspaceTable(error)) throw setupError();
    throw new Error(error.message);
  }
  return data as { id: string; name: string; plan: WorkspacePlan; domain: string | null } | null;
}

export async function getPendingJoinRequest(userId: string, workspaceId?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("join_requests")
    .select("id, workspace_id, status")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (isMissingWorkspaceTable(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", data.workspace_id)
    .maybeSingle();

  return {
    id: data.id as string,
    workspaceId: data.workspace_id as string,
    workspaceName: workspace?.name || "your team",
    status: data.status as string,
  };
}

export async function findInviteForEmail(email: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingWorkspaceTable(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", data.workspace_id)
    .maybeSingle();

  return {
    id: data.id as string,
    workspaceId: data.workspace_id as string,
    workspaceName: workspace?.name || "your team",
  };
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Name your workspace.");
  const supabase = createAdminClient();
  const { error } = await supabase.from("workspaces").update({ name: trimmed }).eq("id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function upgradeToTeam(workspaceId: string, adminEmail: string) {
  const supabase = createAdminClient();
  const personal = isPersonalEmail(adminEmail);
  const domain = personal ? null : emailDomain(adminEmail);
  let nextDomain: string | null = null;
  if (domain) {
    const existing = await findWorkspaceByDomain(domain);
    if (!existing || existing.id === workspaceId) nextDomain = domain;
  }
  const patch: { plan: WorkspacePlan; domain?: string | null } = { plan: "team" };
  if (nextDomain) patch.domain = nextDomain;
  const { error } = await supabase.from("workspaces").update(patch).eq("id", workspaceId);
  if (error) {
    if (/duplicate|unique/i.test(error.message) && nextDomain) {
      const { error: planOnly } = await supabase
        .from("workspaces")
        .update({ plan: "team" })
        .eq("id", workspaceId);
      if (planOnly) throw new Error(planOnly.message);
      return;
    }
    throw new Error(error.message);
  }
}

export async function listWorkspaceAdmins(workspaceId: string) {
  const supabase = createAdminClient();
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  const ids = (members || []).map((row) => row.user_id as string);
  if (ids.length === 0) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);
  return profiles || [];
}

export async function getTeamScope(userId: string): Promise<string[]> {
  const membership = await getMembership(userId);
  if (!membership) return [userId];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', membership.workspaceId);
  if (data && data.length > 0) {
    return data.map(row => row.user_id as string);
  }
  return [userId];
}

