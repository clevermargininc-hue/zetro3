import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfileFromAuth, updateProfileName, updateUsername } from "@/lib/workspace-settings";
import { displayCountry, workspaceLanguages } from "@/lib/locale";
import {
  getMembership,
  isSetupRequired,
  renameWorkspace,
  saveProfileCountry,
  updateWorkspaceCountry,
  upgradeToTeam,
} from "@/lib/workspaces";

import { setWorkspaceCookie } from "@/lib/workspace-cookie";

export const runtime = "nodejs";

function jsonError(error: unknown, fallback = "Could not save setting") {
  const message = error instanceof Error ? error.message : fallback;
  const status = isSetupRequired(error) ? 503 : 400;
  return NextResponse.json(
    { error: message, setupRequired: isSetupRequired(error) },
    { status },
  );
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
    await syncProfileFromAuth(user);
    let profile: { email?: string; full_name?: string; username?: string } | null = null;
    const withUsername = await supabase
      .from("profiles")
      .select("email, full_name, username")
      .eq("id", user.id)
      .maybeSingle();
    if (withUsername.error && /username/i.test(withUsername.error.message)) {
      const fallback = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .maybeSingle();
      profile = fallback.data;
    } else if (withUsername.error) {
      throw new Error(withUsername.error.message);
    } else {
      profile = withUsername.data;
    }

    const { count } = await supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId);

    const payload = {
      profile: {
        email: (profile?.email as string) || user.email || "",
        fullName:
          (profile?.full_name as string) ||
          (user.user_metadata?.full_name as string) ||
          "",
        username: (profile?.username as string) || "",
      },
      workspace: {
        id: membership.workspaceId,
        name: membership.name,
        plan: membership.plan,
        domain: membership.domain,
        country: displayCountry(membership.country),
        languages: workspaceLanguages(membership.country),
        role: membership.role,
        memberCount: count || 1,
      },
    };
    const response = NextResponse.json(payload);
    setWorkspaceCookie(response);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    full_name?: unknown;
    username?: unknown;
    workspace_name?: unknown;
    country?: unknown;
    plan?: unknown;
  };

  try {
    const membership = await getMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No workspace yet." }, { status: 404 });
    }

    if (typeof body.full_name === "string") {
      await updateProfileName(user.id, body.full_name);
    }

    if (typeof body.username === "string") {
      await updateUsername(user.id, body.username);
    }

    if (typeof body.workspace_name === "string") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only admins can rename this workspace." }, { status: 403 });
      }
      await renameWorkspace(membership.workspaceId, body.workspace_name);
    }

    if (typeof body.country === "string") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only admins can change the country." }, { status: 403 });
      }
      const country = await updateWorkspaceCountry(membership.workspaceId, body.country);
      try {
        await saveProfileCountry(user.id, country);
      } catch {
        // Profile country is optional.
      }
    }

    if (body.plan === "team") {
      if (membership.role !== "admin") {
        return NextResponse.json({ error: "Only admins can change the plan." }, { status: 403 });
      }
      if (membership.plan !== "team") {
        await upgradeToTeam(membership.workspaceId, user.email || "");
      }
    }

    if (
      typeof body.full_name !== "string" &&
      typeof body.username !== "string" &&
      typeof body.workspace_name !== "string" &&
      typeof body.country !== "string" &&
      body.plan !== "team"
    ) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    return GET(request);
  } catch (error) {
    return jsonError(error);
  }
}
