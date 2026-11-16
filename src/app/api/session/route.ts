import { z } from "zod";
import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { hasCapability } from "@/lib/rbac/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  locale: z.enum(["en", "sw"]).optional(),
  timezone: z.string().trim().min(2).max(80).optional(),
  qaTargetScore: z.number().min(10).max(100).nullable().optional(),
  reviewScoreThreshold: z.number().min(10).max(100).optional(),
});

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  return apiSuccessResponse(
    {
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
    ctx.requestId,
  );
}

export async function PATCH(request: Request) {
  const auth = await resolveWorkspaceAuth(request);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const rawBody = await request.json().catch(() => null);
  const parsed = UpdatePreferencesSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      "Invalid preference values supplied.",
      ctx.requestId,
      "VALIDATION_ERROR",
    );
  }

  const { theme, locale, timezone, qaTargetScore, reviewScoreThreshold } = parsed.data;

  // Persist user preferences in both profiles and Supabase auth user_metadata
  if (theme || locale || timezone) {
    const existingMeta = (ctx.user.user_metadata || {}) as Record<string, unknown>;
    await ctx.admin.auth.admin.updateUserById(ctx.user.id, {
      user_metadata: {
        ...existingMeta,
        ...(theme ? { theme_preference: theme } : {}),
        ...(locale ? { locale_preference: locale } : {}),
        ...(timezone ? { timezone_preference: timezone } : {}),
      },
    });

    const profilePatch: Record<string, string> = {};
    if (theme) profilePatch.theme_preference = theme;
    if (locale) profilePatch.locale_preference = locale;
    if (timezone) profilePatch.timezone_preference = timezone;

    // Best-effort profile table sync (graceful if extended columns are not yet migrated)
    await ctx.admin
      .from("profiles")
      .update(profilePatch)
      .eq("id", ctx.user.id);
  }

  // Server-enforced RBAC guard for organization QA target updates
  if (qaTargetScore !== undefined || reviewScoreThreshold !== undefined) {
    if (!hasCapability(ctx.capabilities, "settings:org_manage")) {
      return apiErrorResponse(
        403,
        "Only workspace admins can modify organization QA targets.",
        ctx.requestId,
        "FORBIDDEN",
      );
    }

    const { data: ws } = await ctx.admin
      .from("workspaces")
      .select("configuration")
      .eq("id", ctx.workspace.id)
      .maybeSingle();

    const prevConfig =
      ws?.configuration && typeof ws.configuration === "object"
        ? (ws.configuration as Record<string, unknown>)
        : {};

    const nextConfig: Record<string, unknown> = { ...prevConfig };
    if (qaTargetScore !== undefined) nextConfig.qa_target_score = qaTargetScore;
    if (reviewScoreThreshold !== undefined) {
      nextConfig.review_score_threshold = Math.round(reviewScoreThreshold);
    }

    const { error: updateErr } = await ctx.admin
      .from("workspaces")
      .update({ configuration: nextConfig })
      .eq("id", ctx.workspace.id);

    if (updateErr && !/configuration|column/i.test(updateErr.message)) {
      return apiErrorResponse(500, updateErr.message, ctx.requestId, "DB_ERROR");
    }
  }

  return apiSuccessResponse(
    {
      preferences: {
        theme: theme ?? ctx.preferences.theme,
        locale: locale ?? ctx.preferences.locale,
        timezone: timezone ?? ctx.preferences.timezone,
      },
      workspace: {
        ...ctx.workspace,
        qaTargetScore:
          qaTargetScore !== undefined ? qaTargetScore : ctx.workspace.qaTargetScore,
        reviewScoreThreshold:
          reviewScoreThreshold !== undefined
            ? Math.round(reviewScoreThreshold)
            : ctx.workspace.reviewScoreThreshold,
      },
    },
    ctx.requestId,
  );
}

