import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWorkspace,
  emailDomain,
  findInviteForEmail,
  findWorkspaceByDomain,
  firstNameFrom,
  getMembership,
  getPendingJoinRequest,
  guessWorkspaceName,
  isPersonalEmail,
  isSetupRequired,
  listWorkspaceAdmins,
} from "@/lib/workspaces";

import { appOrigin, sendWorkspaceInvites } from "@/lib/invites";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: object, hasWorkspace = false) {
  const response = NextResponse.json(data);
  if (hasWorkspace) setWorkspaceCookie(response);
  return response;
}

function jsonError(error: unknown, fallback = "Something went wrong") {
  const message = error instanceof Error ? error.message : fallback;
  const status = isSetupRequired(error) ? 503 : 400;
  return NextResponse.json(
    { error: message, setupRequired: isSetupRequired(error) },
    { status },
  );
}

async function profileFor(userId: string, fallbackEmail: string, fallbackName: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  return {
    email: (data?.email as string) || fallbackEmail,
    fullName: (data?.full_name as string) || fallbackName,
  };
}

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await profileFor(
      user.id,
      user.email || "",
      (user.user_metadata?.full_name as string) || "",
    );
    const email = profile.email;
    const membership = await getMembership(user.id);
    const domain = emailDomain(email);
    const personal = isPersonalEmail(email);
    const pendingRequest = await getPendingJoinRequest(user.id);
    const invite = email ? await findInviteForEmail(email) : null;
    const match = !personal && domain ? await findWorkspaceByDomain(domain) : null;
    const pendingForMatch = match
      ? await getPendingJoinRequest(user.id, match.id)
      : null;

    return json(
      {
        ready: Boolean(membership),
        profile: {
          email,
          fullName: profile.fullName,
          firstName: firstNameFrom(profile.fullName, email),
        },
        membership,
        domain,
        isPersonalEmail: personal,
        suggestedName: domain && !personal ? guessWorkspaceName(domain) : "My team",
        match: match ? { id: match.id, name: match.name } : null,
        pendingRequest: pendingForMatch || pendingRequest,
        invite,
      },
      Boolean(membership),
    );
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
    name?: string;
    workspaceId?: string;
    emails?: unknown;
  };

  try {
    const profile = await profileFor(
      user.id,
      user.email || "",
      (user.user_metadata?.full_name as string) || "",
    );
    const email = profile.email;
    const membership = await getMembership(user.id);

    if (body.action === "solo") {
      if (membership) {
        return json({ ok: true, next: "/upload", workspaceId: membership.workspaceId }, true);
      }
      const first = firstNameFrom(profile.fullName, email);
      const workspace = await createWorkspace({
        name: `${first}'s Workspace`,
        plan: "solo",
        domain: null,
        userId: user.id,
      });
      return json({ ok: true, next: "/upload", workspaceId: workspace.id }, true);
    }

    if (body.action === "create-team") {
      if (membership) {
        return json({
          ok: true,
          next: "/onboarding?step=invite",
          workspaceId: membership.workspaceId,
        }, true);
      }
      const name = (body.name || "").trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "Name your workspace." }, { status: 400 });
      }
      const personal = isPersonalEmail(email);
      const domain = personal ? null : emailDomain(email);
      if (domain) {
        const existing = await findWorkspaceByDomain(domain);
        if (existing) {
          return NextResponse.json(
            {
              error: "Your team is already on Zetro.",
              match: { id: existing.id, name: existing.name },
            },
            { status: 409 },
          );
        }
      }
      try {
        const workspace = await createWorkspace({
          name,
          plan: "team",
          domain,
          userId: user.id,
        });
        return json({
          ok: true,
          next: "/onboarding?step=invite",
          workspaceId: workspace.id,
        }, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (domain && /duplicate|unique/i.test(message)) {
          const existing = await findWorkspaceByDomain(domain);
          if (existing) {
            return NextResponse.json(
              {
                error: "Your team is already on Zetro.",
                match: { id: existing.id, name: existing.name },
              },
              { status: 409 },
            );
          }
        }
        throw error;
      }
    }

    if (body.action === "join") {
      if (membership) {
        return NextResponse.json({ error: "You already have a workspace." }, { status: 400 });
      }
      const workspaceId = body.workspaceId;
      if (!workspaceId) {
        return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
      }
      const supabase = createAdminClient();
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", workspaceId)
        .maybeSingle();
      if (workspaceError) throw new Error(workspaceError.message);
      if (!workspace) {
        return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
      }

      const existing = await getPendingJoinRequest(user.id, workspaceId);
      if (existing) {
        return NextResponse.json({
          ok: true,
          pending: true,
          workspaceName: existing.workspaceName,
        });
      }

      const { data: prior } = await supabase
        .from("join_requests")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (prior?.status === "approved") {
        return NextResponse.json({ error: "This request was already approved." }, { status: 400 });
      }

      if (prior) {
        const { error: updateError } = await supabase
          .from("join_requests")
          .update({ status: "pending" })
          .eq("id", prior.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase.from("join_requests").insert({
          workspace_id: workspaceId,
          user_id: user.id,
          status: "pending",
        });
        if (insertError) throw new Error(insertError.message);
      }

      // Admins review requests on /team. Transactional email is not wired yet.
      await listWorkspaceAdmins(workspaceId);

      return NextResponse.json({
        ok: true,
        pending: true,
        workspaceName: workspace.name as string,
      });
    }

    if (body.action === "accept-invite") {
      if (membership) {
        return json({ ok: true, next: "/upload", workspaceId: membership.workspaceId }, true);
      }
      const invite = email ? await findInviteForEmail(email) : null;
      if (!invite || (body.workspaceId && invite.workspaceId !== body.workspaceId)) {
        return NextResponse.json({ error: "No invite found for this email." }, { status: 404 });
      }
      const supabase = createAdminClient();
      const { error: memberError } = await supabase.from("workspace_members").insert({
        workspace_id: invite.workspaceId,
        user_id: user.id,
        role: "member",
      });
      if (memberError && !/duplicate|unique/i.test(memberError.message)) {
        throw new Error(memberError.message);
      }
      await supabase.from("workspace_invites").delete().eq("id", invite.id);
      return json({ ok: true, next: "/upload", workspaceId: invite.workspaceId }, true);
    }

    if (body.action === "invite") {
      if (!membership || membership.role !== "admin") {
        return NextResponse.json({ error: "Only workspace admins can invite." }, { status: 403 });
      }
      const raw = Array.isArray(body.emails) ? body.emails : [];
      const emails = [
        ...new Set(
          raw
            .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
            .filter((value) => EMAIL_RE.test(value) && value !== email.toLowerCase()),
        ),
      ].slice(0, 20);

      if (emails.length > 0) {
        await sendWorkspaceInvites({
          workspaceId: membership.workspaceId,
          workspaceName: membership.name,
          invitedById: user.id,
          inviterEmail: email,
          emails,
          origin: appOrigin(request),
        });
      }

      return json({ ok: true, invited: emails.length, next: "/upload" }, true);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
