import { z } from "zod";
import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BulkCallActionSchema = z.object({
  callIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["approve", "needs_coaching", "escalate"]),
});

const ACTION_TO_STATUS = {
  approve: "approved",
  needs_coaching: "needs_coaching",
  escalate: "escalated",
} as const;

export async function PATCH(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "calls:bulk_action",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const rawBody = await request.json().catch(() => null);
  const parsed = BulkCallActionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      "Select one or more valid calls and a valid bulk action.",
      ctx.requestId,
      "VALIDATION_ERROR",
    );
  }

  const nextStatus = ACTION_TO_STATUS[parsed.data.action];
  const nowIso = new Date().toISOString();

  const { data: updated, error } = await ctx.admin
    .from("calls")
    .update({
      review_status: nextStatus,
      reviewed_at: nowIso,
      reviewed_by: ctx.user.id,
    })
    .in("id", parsed.data.callIds)
    .in("user_id", ctx.teamScope)
    .select("id");

  if (error) {
    if (/review_status|column|schema cache/i.test(error.message)) {
      return apiErrorResponse(
        503,
        "Run supabase/dashboard-enterprise.sql in Supabase SQL Editor to persist review status updates.",
        ctx.requestId,
        "SCHEMA_MIGRATION_REQUIRED",
      );
    }
    return apiErrorResponse(500, error.message, ctx.requestId, "BULK_UPDATE_ERROR");
  }

  return apiSuccessResponse(
    {
      updatedCount: updated?.length ?? 0,
      reviewStatus: nextStatus,
    },
    ctx.requestId,
  );
}

