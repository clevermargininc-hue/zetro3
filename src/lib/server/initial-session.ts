import type { User } from "@supabase/supabase-js";
import type { SessionResponse } from "@/features/session/api/schemas";
import { resolveWorkspaceForUser } from "@/lib/server/workspace-auth";

export type InitialSessionResult =
  | { ok: true; session: SessionResponse }
  | { ok: false; code: string; message: string };

export async function loadInitialSession(user: User): Promise<InitialSessionResult> {
  const auth = await resolveWorkspaceForUser(user);
  if (!auth.ok) {
    return { ok: false, code: auth.code, message: auth.message };
  }

  const { ctx } = auth;
  return {
    ok: true,
    session: {
      user: {
        id: ctx.user.id,
        email: ctx.user.email || "",
        fullName: ctx.fullName || ctx.user.email?.split("@")[0] || "Member",
        username: ctx.username,
        role: ctx.operationalRole,
        capabilities: ctx.capabilities,
      },
      workspace: ctx.workspace,
      workspaces: ctx.workspaces,
      preferences: ctx.preferences,
    },
  };
}

