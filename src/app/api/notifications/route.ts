import { z } from "zod";
import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { loadScopedCalls } from "@/lib/server/dashboard-queries";
import { sanitizeDisplayText } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MarkReadSchema = z.object({
  id: z.string().uuid().optional(),
  markAll: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "overview:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const res = await ctx.admin
      .from("notifications")
      .select("id, category, severity, title, body, link_href, call_id, read_at, created_at")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!res.error && res.data && res.data.length > 0) {
      const items = res.data.map((n) => ({
        id: String(n.id),
        category: String(n.category || "review"),
        severity: String(n.severity || "info"),
        title: sanitizeDisplayText(String(n.title || "")),
        body: sanitizeDisplayText(String(n.body || "")),
        linkHref: typeof n.link_href === "string" ? n.link_href : null,
        callId: typeof n.call_id === "string" ? n.call_id : null,
        readAt: typeof n.read_at === "string" ? n.read_at : null,
        createdAt: String(n.created_at),
      }));

      return apiSuccessResponse(
        {
          unreadCount: items.filter((i) => !i.readAt).length,
          items,
        },
        ctx.requestId,
      );
    }

    // Derive factual real-time alerts from unreviewed / compliance-flagged calls in Postgres
    const { calls } = await loadScopedCalls(ctx);
    const flagged = calls.filter((c) => c.needsReview).slice(0, 8);
    const items = flagged.map((c) => ({
      id: `call-alert-${c.id}`,
      category: c.complianceFailedCount > 0 ? "compliance" : "review",
      severity: c.criticalFailureCount > 0 ? "critical" : "warning",
      title:
        c.complianceFailedCount > 0
          ? `${c.complianceFailedCount} compliance fail(s) · ${c.agentName}`
          : `Low QA (${c.overallScore ?? "—"}%) · ${c.agentName}`,
      body: c.title,
      linkHref: `/upload/score/${c.id}`,
      callId: c.id,
      readAt: null as string | null,
      createdAt: c.auditedAt,
    }));

    return apiSuccessResponse(
      {
        unreadCount: items.length,
        items,
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load notifications.";
    return apiErrorResponse(500, message, ctx.requestId, "NOTIFICATIONS_ERROR");
  }
}

export async function PATCH(request: Request) {
  const auth = await resolveWorkspaceAuth(request);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const rawBody = await request.json().catch(() => null);
  const parsed = MarkReadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErrorResponse(400, "Invalid notification request.", ctx.requestId, "VALIDATION_ERROR");
  }

  const nowIso = new Date().toISOString();
  let query = ctx.admin
    .from("notifications")
    .update({ read_at: nowIso })
    .eq("workspace_id", ctx.workspace.id)
    .is("read_at", null);

  if (parsed.data.id) {
    query = query.eq("id", parsed.data.id);
  }

  const { error } = await query;
  if (error && !/notifications|schema cache|42P01/i.test(error.message)) {
    return apiErrorResponse(500, error.message, ctx.requestId, "NOTIFICATIONS_UPDATE_ERROR");
  }

  return apiSuccessResponse({ ok: true, readAt: nowIso }, ctx.requestId);
}

