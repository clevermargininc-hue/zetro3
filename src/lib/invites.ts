import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/workspaces";

export type InviteRecord = {
  id: string;
  email: string;
  token: string;
  workspaceId: string;
  workspaceName: string;
  invitedBy: string;
};

export function appOrigin(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export function inviteJoinUrl(origin: string, token: string) {
  return `${origin}/invite/${token}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] || char;
  });
}

async function postResendEmail(input: {
  key: string;
  from: string;
  to: string;
  workspaceName: string;
  inviterName: string;
  url: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: `Join ${input.workspaceName} on Zetro`,
      html: `
        <p>You were invited to join <strong>${escapeHtml(input.workspaceName)}</strong> on Zetro.</p>
        <p>
          <a href="${input.url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">
            Join ${escapeHtml(input.workspaceName)}
          </a>
        </p>
        <p>This link adds you to that workspace. Sign in or create an account with <strong>${escapeHtml(input.to)}</strong>, then you will enter it automatically.</p>
        <p>If the button does not work, open: ${escapeHtml(input.url)}</p>
      `,
      text: `You were invited to join ${input.workspaceName} on Zetro.\n\nJoin here: ${input.url}\n\nUse ${input.to}. After you sign in, you will be added to that workspace automatically.`,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; name?: string };
  if (response.ok) return { ok: true as const };
  return {
    ok: false as const,
    message: body.message || `Resend returned ${response.status}.`,
  };
}

async function sendResendInvite(input: {
  to: string;
  workspaceName: string;
  inviterName: string;
  url: string;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY is missing. Add it in .env.local and in Vercel env vars.");
  }

  const fromAddresses = [
    process.env.RESEND_FROM?.trim(),
    "Zetro <beth.t@example.com>",
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  let lastError = "Resend could not send the invite email.";
  for (const from of fromAddresses) {
    const result = await postResendEmail({ key, from, ...input });
    if (result.ok) return true;
    lastError = result.message;
    if (!/domain|verified|from|testing emails/i.test(result.message)) break;
  }
  throw new Error(lastError);
}

function rowToInvite(
  data: {
    id: string;
    email: string;
    token?: string | null;
    workspace_id: string;
    invited_by: string;
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
  };
}

export async function getInviteByToken(token: string) {
  const supabase = createAdminClient();
  const select = "id, email, token, workspace_id, invited_by";
  let { data, error } = await supabase.from("workspace_invites").select(select).eq("token", token).maybeSingle();
  if (error && /token/i.test(error.message)) {
    const fallback = await supabase
      .from("workspace_invites")
      .select("id, email, workspace_id, invited_by")
      .eq("id", token)
      .maybeSingle();
    data = fallback.data ? { ...fallback.data, token: fallback.data.id } : null;
    error = fallback.error;
  }
  if (error) throw new Error(error.message);
  if (!data) {
    const byId = await supabase.from("workspace_invites").select(select).eq("id", token).maybeSingle();
    if (byId.error && /token/i.test(byId.error.message)) {
      const plain = await supabase
        .from("workspace_invites")
        .select("id, email, workspace_id, invited_by")
        .eq("id", token)
        .maybeSingle();
      data = plain.data ? { ...plain.data, token: plain.data.id } : null;
    } else {
      data = byId.data;
    }
  }
  if (!data) return null;
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", data.workspace_id)
    .maybeSingle();
  return rowToInvite(data, (workspace?.name as string) || "a Zetro workspace");
}

export async function acceptInvite(token: string, userId: string, userEmail: string) {
  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("This invitation is invalid or has already been used.");
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
  const row: Record<string, string> = {
    workspace_id: input.workspaceId,
    email: input.email,
    invited_by: input.invitedById,
    token,
  };
  let { data, error } = await supabase.from("workspace_invites").insert(row).select("id, token").single();
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
