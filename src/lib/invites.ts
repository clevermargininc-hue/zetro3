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

async function sendResendInvite(input: {
  to: string;
  workspaceName: string;
  inviterName: string;
  url: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.RESEND_FROM || "Zetro <beth.t@example.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Join ${input.workspaceName} on Zetro`,
      html: `
        <p>${input.inviterName} invited you to the <strong>${input.workspaceName}</strong> workspace on Zetro.</p>
        <p><a href="${input.url}">Accept invitation</a></p>
        <p>If you already have an account, sign in with this email. If not, create one, then open the link again.</p>
      `,
      text: `${input.inviterName} invited you to ${input.workspaceName} on Zetro. Accept: ${input.url}`,
    }),
  });
  return response.ok;
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

  if (process.env.RESEND_API_KEY) {
    const emailed = await sendResendInvite({
      to: input.email,
      workspaceName: input.workspaceName,
      inviterName,
      url,
    });
    return { emailed, joinUrl: url };
  }

  const supabase = createAdminClient();
  const authInvite = await supabase.auth.admin.inviteUserByEmail(input.email, {
    data: { invite_token: input.token },
    redirectTo: `${input.origin}/auth/callback?next=/invite/${input.token}`,
  });
  return { emailed: !authInvite.error, joinUrl: url };
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
