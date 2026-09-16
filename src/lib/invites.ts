import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendResendEmail } from "@/lib/email";
import { getMembership } from "@/lib/workspaces";

export type InviteRecord = {
  id: string;
  email: string;
  token: string;
  workspaceId: string;
  workspaceName: string;
  invitedBy: string;
  createdAt?: string | null;
  expiresAt?: string | null;
};

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function inviteExpired(invite: { createdAt?: string | null; expiresAt?: string | null }) {
  const expiresAt = invite.expiresAt
    ? new Date(invite.expiresAt).getTime()
    : invite.createdAt
      ? new Date(invite.createdAt).getTime() + INVITE_TTL_MS
      : null;
  if (expiresAt == null || !Number.isFinite(expiresAt)) return false;
  return Date.now() > expiresAt;
}

export function appOrigin(request: Request) {
  return cleanSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, new URL(request.url).origin);
}

function cleanSiteUrl(raw: string | undefined, fallbackOrigin: string) {
  const fallback = fallbackOrigin.replace(/\/$/, "");
  const extracted = raw?.match(/https?:\/\/[^\s]+/i)?.[0] || raw?.trim() || "";
  try {
    const parsed = new URL(extracted);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
}

export function inviteJoinUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/invite/${token}`;
}

async function sendResendInvite(input: {
  to: string;
  workspaceName: string;
  inviterName: string;
  url: string;
}) {
  await sendResendEmail({
    to: input.to,
    subject: `Join ${input.workspaceName} on Zetro`,
    html: `
        <p>You were invited to join <strong>${escapeHtml(input.workspaceName)}</strong> on Zetro.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background:#2563eb;border-radius:8px;">
              <a href="${input.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:600;font-family:sans-serif;">
                Join ${escapeHtml(input.workspaceName)}
              </a>
            </td>
          </tr>
        </table>
        <p>This link adds you to that workspace. Sign in or create an account with <strong>${escapeHtml(input.to)}</strong>, then you will enter it automatically.</p>
        <p>If the button does not work, open this link:<br><a href="${input.url}">${escapeHtml(input.url)}</a></p>
      `,
    text: `You were invited to join ${input.workspaceName} on Zetro.\n\nJoin here: ${input.url}\n\nUse ${input.to}. After you sign in, you will be added to that workspace automatically.`,
  });
  return true;
}

function rowToInvite(
  data: {
    id: string;
    email: string;
    token?: string | null;
    workspace_id: string;
    invited_by: string;
    created_at?: string | null;
    expires_at?: string | null;
  },
  workspaceName: string,
): InviteRecord {
  return {
    id: data.id,
    email: data.email.toLowerCase(),
    token: data.token || data.id,
    workspaceId: data.workspace_id,
    workspaceName: workspaceName || "a Zetro workspace",
    invitedBy: data.invited_by,
    createdAt: data.created_at ?? null,
    expiresAt: data.expires_at ?? null,
  };
}

type InviteRow = {
  id: string;
  email: string;
  token?: string | null;
  workspace_id: string;
  invited_by: string;
  created_at?: string | null;
  expires_at?: string | null;
};

export async function getInviteByToken(token: string) {
  const supabase = createAdminClient();
  const select = "id, email, token, workspace_id, invited_by, created_at, expires_at";
  let data: InviteRow | null = null;
  let error: { message: string } | null = null;

  {
    const res = await supabase.from("workspace_invites").select(select).eq("token", token).maybeSingle();
    data = (res.data as InviteRow | null) || null;
    error = res.error;
  }

  if (error && /token|expires_at|created_at/i.test(error.message)) {
    const fallback = await supabase
      .from("workspace_invites")
      .select("id, email, workspace_id, invited_by")
      .eq("id", token)
      .maybeSingle();
    data = fallback.data
      ? ({ ...fallback.data, token: fallback.data.id } as InviteRow)
      : null;
    error = fallback.error;
  }
  if (error && /expires_at|created_at/i.test(error.message)) {
    const plain = await supabase
      .from("workspace_invites")
      .select("id, email, token, workspace_id, invited_by")
      .eq("token", token)
      .maybeSingle();
    data = (plain.data as InviteRow | null) || null;
    error = plain.error;
  }
  if (error) throw new Error(error.message);
  if (!data) {
    const byId = await supabase.from("workspace_invites").select(select).eq("id", token).maybeSingle();
    if (byId.error && /token|expires_at|created_at/i.test(byId.error.message)) {
      const plain = await supabase
        .from("workspace_invites")
        .select("id, email, workspace_id, invited_by")
        .eq("id", token)
        .maybeSingle();
      data = plain.data ? ({ ...plain.data, token: plain.data.id } as InviteRow) : null;
    } else {
      data = (byId.data as InviteRow | null) || null;
    }
  }
  if (!data) return null;
  const invite = rowToInvite(data, "a Zetro workspace");
  if (inviteExpired(invite)) {
    await supabase.from("workspace_invites").delete().eq("id", invite.id);
    return null;
  }
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", data.workspace_id)
    .maybeSingle();
  return rowToInvite(data, (workspace?.name as string) || "a Zetro workspace");
}

export async function acceptInvite(token: string, userId: string, userEmail: string) {
  const invite = await getInviteByToken(token);
  if (!invite) {
    throw new Error("This invitation is invalid, expired, or has already been used.");
  }
  if (invite.email !== userEmail.trim().toLowerCase()) {
    throw new Error(`This invitation is for ${invite.email}. Sign in with that email.`);
  }
  const existing = await getMembership(userId);
  if (existing) {
    if (existing.workspaceId === invite.workspaceId) {
      const supabase = createAdminClient();
      await supabase.from("workspace_invites").delete().eq("id", invite.id);
      return invite;
    }
    throw new Error("You already belong to a workspace.");
  }
  const supabase = createAdminClient();
  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: invite.workspaceId,
    user_id: userId,
    role: "member",
  });
  if (memberError && !/duplicate|unique/i.test(memberError.message)) {
    throw new Error(memberError.message);
  }
  await supabase.from("workspace_invites").delete().eq("id", invite.id);
  return invite;
}

async function insertInvite(input: {
  workspaceId: string;
  email: string;
  invitedById: string;
}) {
  const supabase = createAdminClient();
  await supabase
    .from("workspace_invites")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("email", input.email);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const row: Record<string, string> = {
    workspace_id: input.workspaceId,
    email: input.email,
    invited_by: input.invitedById,
    token,
    expires_at: expiresAt,
  };
  let { data, error } = await supabase.from("workspace_invites").insert(row).select("id, token").single();
  if (error && /expires_at/i.test(error.message)) {
    delete row.expires_at;
    ({ data, error } = await supabase.from("workspace_invites").insert(row).select("id, token").single());
  }
  if (error && /token/i.test(error.message)) {
    delete row.token;
    const retry = await supabase.from("workspace_invites").insert(row).select("id").single();
    data = retry.data ? { id: retry.data.id as string, token: retry.data.id as string } : null;
    error = retry.error;
  }
  if (error || !data) throw new Error(error?.message || "Could not save invite.");
  return { id: data.id as string, token: (data.token as string) || (data.id as string) };
}

export async function emailInviteLink(input: {
  email: string;
  token: string;
  workspaceName: string;
  inviterEmail: string;
  origin: string;
}) {
  const url = inviteJoinUrl(input.origin, input.token);
  const inviterName = input.inviterEmail.split("@")[0] || "A teammate";
  await sendResendInvite({
    to: input.email,
    workspaceName: input.workspaceName,
    inviterName,
    url,
  });
  return { emailed: true, joinUrl: url };
}

export async function sendWorkspaceInvites(input: {
  workspaceId: string;
  workspaceName: string;
  invitedById: string;
  inviterEmail: string;
  emails: string[];
  origin: string;
}) {
  const results: Array<{ email: string; token: string; emailed: boolean; joinUrl: string }> = [];
  for (const email of input.emails) {
    const saved = await insertInvite({
      workspaceId: input.workspaceId,
      email,
      invitedById: input.invitedById,
    });
    const mailed = await emailInviteLink({
      email,
      token: saved.token,
      workspaceName: input.workspaceName,
      inviterEmail: input.inviterEmail,
      origin: input.origin,
    });
    results.push({ email, token: saved.token, ...mailed });
  }
  return results;
}
