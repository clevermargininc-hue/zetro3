import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMembership,
  isSetupRequired,
  upgradeToTeam,
} from "@/lib/workspaces";
import { appOrigin, emailInviteLink, sendWorkspaceInvites } from "@/lib/invites";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(error: unknown, fallback = "Something went wrong") {
  const message = error instanceof Error ? error.message : fallback;
  const status = isSetupRequired(error) ? 503 : 400;
  return NextResponse.json(
    { error: message, setupRequired: isSetupRequired(error) },
    { status },
  );
}

type ProfileRow = { id: string; email: string; fullName: string; username: string };

async function loadProfiles(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<ProfileRow[]> {
  if (ids.length === 0) return [];
  const withUsername = await supabase
    .from("profiles")
    .select("id, email, full_name, username")
    .in("id", ids);
  let rows: any[] | null = withUsername.data;
  if (withUsername.error && /username/i.test(withUsername.error.message)) {
    const fallback = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
    if (fallback.error) throw new Error(fallback.error.message);
    rows = fallback.data;
  } else if (withUsername.error) {
    throw new Error(withUsername.error.message);
  }

  const mapped = new Map<string, ProfileRow>(
    (rows || []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        email: (row.email as string) || "",
        fullName: (row.full_name as string) || "",
        username: ((row as { username?: string }).username as string) || "",
      },
    ]),
  );

  for (const id of ids) {
    const current = mapped.get(id);
    if (current?.fullName && current.email) continue;
    const { data } = await supabase.auth.admin.getUserById(id);
    const authUser = data.user;
    if (!authUser) continue;
    const meta = authUser.user_metadata || {};
    const fullName =
      current?.fullName ||
      [meta.full_name, meta.name, meta.given_name]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .find(Boolean) ||
      (authUser.email || "").split("@")[0] ||
      "";
    mapped.set(id, {
      id,
      email: current?.email || authUser.email || "",
      fullName,
      username: current?.username || "",
    });
  }

  return [...mapped.values()];
}

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const membership = await getMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No workspace yet." }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: memberRows, error: memberError } = await supabase
      .from("workspace_members")
      .select("user_id, role, created_at")
      .eq("workspace_id", membership.workspaceId)
      .order("created_at", { ascending: true });
    if (memberError) throw new Error(memberError.message);

    const memberIds = (memberRows || []).map((row) => row.user_id as string);
    const profiles = await loadProfiles(supabase, memberIds);
    const profileById = new Map(profiles.map((row) => [row.id, row]));

    const members = (memberRows || []).map((row) => {
      const profile = profileById.get(row.user_id as string);
      return {
        userId: row.user_id as string,
        role: row.role as string,
        email: profile?.email || "",
        fullName: profile?.fullName || "",
        username: profile?.username || "",
      };
    });

    let requests: Array<{
      id: string;
      userId: string;
      email: string;
      fullName: string;
      username: string;
      createdAt: string;
    }> = [];

    if (membership.role === "admin") {
      const { data: requestRows, error: requestError } = await supabase
        .from("join_requests")
        .select("id, user_id, created_at")
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (requestError) throw new Error(requestError.message);
      const requesterIds = (requestRows || []).map((row) => row.user_id as string);
      const requesterProfiles = await loadProfiles(supabase, requesterIds);
      const requesterById = new Map(requesterProfiles.map((row) => [row.id, row]));
      requests = (requestRows || []).map((row) => {
        const profile = requesterById.get(row.user_id as string);
        return {
          id: row.id as string,
          userId: row.user_id as string,
          email: profile?.email || "",
          fullName: profile?.fullName || "",
          username: profile?.username || "",
          createdAt: row.created_at as string,
        };
      });
    }

    let invites: Array<{ id: string; email: string; token: string; createdAt: string }> = [];
    if (membership.role === "admin") {
      let inviteRows: Array<{ id: string; email: string; created_at: string; token?: string | null }> | null = null;
      const withToken = await supabase
        .from("workspace_invites")
        .select("id, email, created_at, token")
        .eq("workspace_id", membership.workspaceId)
        .order("created_at", { ascending: false });
      if (withToken.error && /token/i.test(withToken.error.message)) {
        const withoutToken = await supabase
          .from("workspace_invites")
          .select("id, email, created_at")
          .eq("workspace_id", membership.workspaceId)
          .order("created_at", { ascending: false });
        if (withoutToken.error) throw new Error(withoutToken.error.message);
        inviteRows = withoutToken.data;
      } else if (withToken.error) {
        throw new Error(withToken.error.message);
      } else {
        inviteRows = withToken.data;
      }
      invites = (inviteRows || []).map((row) => ({
        id: row.id as string,
        email: row.email as string,
        token: (row.token as string) || (row.id as string),
        createdAt: row.created_at as string,
      }));
    }

    return NextResponse.json({
      workspace: {
        id: membership.workspaceId,
        name: membership.name,
        plan: membership.plan,
        domain: membership.domain,
        role: membership.role,
      },
      members,
      requests,
      invites,
      mailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    requestId?: string;
    emails?: unknown;
    inviteId?: string;
    userId?: string;
  };

  try {
    const membership = await getMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No workspace yet." }, { status: 404 });
    }

    if (body.action === "invite") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only workspace admins can invite." }, { status: 403 });
      }
      const raw = Array.isArray(body.emails) ? body.emails : [];
      const emails = [
        ...new Set(
          raw
            .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
            .filter((value) => EMAIL_RE.test(value) && value !== (user.email || "").toLowerCase()),
        ),
      ].slice(0, 20);
      if (emails.length === 0) {
        return NextResponse.json({ error: "Add at least one email." }, { status: 400 });
      }

      const results = await sendWorkspaceInvites({
        workspaceId: membership.workspaceId,
        workspaceName: membership.name,
        invitedById: user.id,
        inviterEmail: user.email || "",
        emails,
        origin: appOrigin(request),
      });

      if (membership.plan === "solo") {
        await upgradeToTeam(membership.workspaceId, user.email || "");
      }

      const emailed = results.filter((row) => row.emailed).length;
      return NextResponse.json({
        ok: true,
        invited: emails.length,
        emailed,
        plan: "team",
        invites: results,
      });
    }

    if (body.action === "resend-invite") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only admins can resend invites." }, { status: 403 });
      }
      if (!body.inviteId) {
        return NextResponse.json({ error: "Missing invite." }, { status: 400 });
      }
      const supabase = createAdminClient();
      let row: { id: string; email: string; token?: string | null } | null = null;
      const withToken = await supabase
        .from("workspace_invites")
        .select("id, email, token")
        .eq("id", body.inviteId)
        .eq("workspace_id", membership.workspaceId)
        .maybeSingle();
      if (withToken.error && /token/i.test(withToken.error.message)) {
        const withoutToken = await supabase
          .from("workspace_invites")
          .select("id, email")
          .eq("id", body.inviteId)
          .eq("workspace_id", membership.workspaceId)
          .maybeSingle();
        if (withoutToken.error) throw new Error(withoutToken.error.message);
        row = withoutToken.data;
      } else if (withToken.error) {
        throw new Error(withToken.error.message);
      } else {
        row = withToken.data;
      }
      if (!row) {
        return NextResponse.json({ error: "Invite not found." }, { status: 404 });
      }
      const mailed = await emailInviteLink({
        email: row.email.toLowerCase(),
        token: row.token || row.id,
        workspaceName: membership.name,
        inviterEmail: user.email || "",
        origin: appOrigin(request),
      });
      return NextResponse.json({ ok: true, emailed: mailed.emailed, joinUrl: mailed.joinUrl });
    }

    if (body.action === "cancel-invite") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only admins can cancel invites." }, { status: 403 });
      }
      if (!body.inviteId) {
        return NextResponse.json({ error: "Missing invite." }, { status: 400 });
      }
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("workspace_invites")
        .delete()
        .eq("id", body.inviteId)
        .eq("workspace_id", membership.workspaceId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove-member") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only admins can remove members." }, { status: 403 });
      }
      if (!body.userId || body.userId === user.id) {
        return NextResponse.json({ error: "You cannot remove yourself here." }, { status: 400 });
      }
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", membership.workspaceId)
        .eq("user_id", body.userId)
        .eq("role", "member");
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can review join requests." }, { status: 403 });
    }
    if (!body.requestId || (body.action !== "approve" && body.action !== "reject")) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: joinRequest, error: lookupError } = await supabase
      .from("join_requests")
      .select("id, user_id, workspace_id, status")
      .eq("id", body.requestId)
      .eq("workspace_id", membership.workspaceId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found." }, { status: 404 });
    }

    if (body.action === "reject") {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", joinRequest.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: membership.workspaceId,
      user_id: joinRequest.user_id,
      role: "member",
    });
    if (memberError && !/duplicate|unique/i.test(memberError.message)) {
      throw new Error(memberError.message);
    }
    const { error: updateError } = await supabase
      .from("join_requests")
      .update({ status: "approved" })
      .eq("id", joinRequest.id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
