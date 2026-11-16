import { z } from "zod";
import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { sanitizeDisplayText } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateCoachingTaskSchema = z.object({
  callId: z.string().uuid(),
  agentId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(160),
  notes: z.string().trim().max(2000).optional().default(""),
  criterion: z.string().trim().max(120).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueAt: z.string().datetime().nullable().optional(),
});

function isMissingCoachingTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    msg.includes("coaching_tasks") ||
    msg.includes("schema cache")
  );
}

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "coaching:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const url = new URL(request.url);
  const callId = url.searchParams.get("callId")?.trim() || null;

  let query = ctx.admin
    .from("coaching_tasks")
    .select("id, call_id, agent_id, title, notes, criterion, priority, status, due_at, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (callId) query = query.eq("call_id", callId);

  const res = await query;
  if (!res.error && res.data) {
    return apiSuccessResponse(
      {
        tasks: res.data.map((t) => ({
          id: String(t.id),
          callId: (t.call_id as string | null) ?? null,
          agentId: (t.agent_id as string | null) ?? null,
          title: sanitizeDisplayText(String(t.title || "")),
          notes: sanitizeDisplayText(String(t.notes || "")),
          criterion: typeof t.criterion === "string" ? sanitizeDisplayText(t.criterion) : null,
          priority: String(t.priority || "medium"),
          status: String(t.status || "open"),
          dueAt: (t.due_at as string | null) ?? null,
          createdAt: String(t.created_at),
        })),
      },
      ctx.requestId,
    );
  }

  if (isMissingCoachingTable(res.error)) {
    return apiSuccessResponse({ tasks: [] }, ctx.requestId);
  }

  return apiErrorResponse(
    500,
    res.error?.message || "Could not load coaching tasks.",
    ctx.requestId,
    "COACHING_LOAD_ERROR",
  );
}

export async function POST(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "coaching:assign",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const rawBody = await request.json().catch(() => null);
  const parsed = CreateCoachingTaskSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiErrorResponse(
      400,
      "Provide a coaching focus title (at least 3 characters) and valid call ID.",
      ctx.requestId,
      "VALIDATION_ERROR",
    );
  }

  const { callId, agentId, title, notes, criterion, priority, dueAt } = parsed.data;

  // Verify the call belongs to the active workspace
  const { data: ownedCall, error: callErr } = await ctx.admin
    .from("calls")
    .select("id, user_id, agent_id, title")
    .eq("id", callId)
    .in("user_id", ctx.teamScope)
    .maybeSingle();

  if (callErr) {
    return apiErrorResponse(500, callErr.message, ctx.requestId, "DB_ERROR");
  }
  if (!ownedCall) {
    return apiErrorResponse(404, "Call not found in this workspace.", ctx.requestId, "NOT_FOUND");
  }

  const resolvedAgentId = agentId ?? (ownedCall.agent_id as string | null) ?? null;

  const insertAttempt = await ctx.admin
    .from("coaching_tasks")
    .insert({
      workspace_id: ctx.workspace.id,
      user_id: ctx.user.id,
      call_id: callId,
      agent_id: resolvedAgentId,
      title,
      notes,
      criterion: criterion ?? null,
      priority,
      status: "open",
      assigned_by: ctx.user.id,
      due_at: dueAt ?? null,
    })
    .select("id, call_id, agent_id, title, notes, criterion, priority, status, due_at, created_at")
    .single();

  if (!insertAttempt.error && insertAttempt.data) {
    // Best-effort status flag on call & notification entry
    await ctx.admin
      .from("calls")
      .update({
        review_status: "needs_coaching",
        reviewed_at: new Date().toISOString(),
        reviewed_by: ctx.user.id,
      })
      .eq("id", callId);

    await ctx.admin.from("notifications").insert({
      workspace_id: ctx.workspace.id,
      user_id: ctx.user.id,
      category: "coaching",
      severity: priority === "critical" || priority === "high" ? "warning" : "info",
      title: `Coaching assigned: ${title}`,
      body: notes || `Assigned on call ${String(ownedCall.title || callId)}`,
      link_href: `/dashboard?q=${encodeURIComponent(callId)}`,
      call_id: callId,
    });

    const row = insertAttempt.data;
    return apiSuccessResponse(
      {
        task: {
          id: String(row.id),
          callId: String(row.call_id),
          agentId: (row.agent_id as string | null) ?? null,
          title: String(row.title),
          notes: String(row.notes || ""),
          criterion: (row.criterion as string | null) ?? null,
          priority: String(row.priority),
          status: String(row.status),
          dueAt: (row.due_at as string | null) ?? null,
          createdAt: String(row.created_at),
        },
      },
      ctx.requestId,
      201,
    );
  }

  // Graceful fallback onto operational_recommendations if coaching_tasks table is not yet created
  if (isMissingCoachingTable(insertAttempt.error)) {
    const recInsert = await ctx.admin
      .from("operational_recommendations")
      .insert({
        workspace_id: ctx.workspace.id,
        user_id: ctx.user.id,
        recommendation_type: "agent_coaching",
        recommended_action: `${title}${notes ? ` — ${notes}` : ""} [call:${callId}]`,
        priority,
        status: "accepted",
        due_at: dueAt ?? null,
      })
      .select("id, recommended_action, priority, status, due_at, created_at")
      .single();

    if (recInsert.error || !recInsert.data) {
      return apiErrorResponse(
        500,
        recInsert.error?.message || "Could not create coaching task.",
        ctx.requestId,
        "COACHING_CREATE_ERROR",
      );
    }

    const r = recInsert.data;
    return apiSuccessResponse(
      {
        task: {
          id: String(r.id),
          callId,
          agentId: resolvedAgentId,
          title,
          notes,
          criterion: criterion ?? null,
          priority: String(r.priority),
          status: "open",
          dueAt: (r.due_at as string | null) ?? null,
          createdAt: String(r.created_at),
        },
      },
      ctx.requestId,
      201,
    );
  }

  return apiErrorResponse(
    500,
    insertAttempt.error?.message || "Could not save coaching task.",
    ctx.requestId,
    "COACHING_CREATE_ERROR",
  );
}

