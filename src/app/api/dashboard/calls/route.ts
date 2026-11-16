import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { parseDashboardFilters } from "@/lib/server/dashboard-filters";
import {
  applyCallFilters,
  loadScopedCalls,
  sortNormalizedCalls,
} from "@/lib/server/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "calls:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const filters = parseDashboardFilters(new URL(request.url), ctx.workspace.timezone);
    const { calls } = await loadScopedCalls(ctx);

    const filtered = applyCallFilters(calls, filters, { window: "current" });
    const sorted = sortNormalizedCalls(filtered, filters.sortBy, filters.sortDir);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
    const safePage = Math.min(filters.page, totalPages);
    const offset = (safePage - 1) * filters.pageSize;
    const slice = sorted.slice(offset, offset + filters.pageSize);

    const lastAnalyzedAt =
      calls
        .filter((c) => c.status === "completed")
        .map((c) => c.auditedAt)
        .sort()
        .pop() ?? null;

    return apiSuccessResponse(
      {
        items: slice.map((c) => ({
          id: c.id,
          title: c.title,
          fileName: c.fileName,
          hasAudio: c.hasAudio,
          durationSeconds: c.durationSeconds,
          language: c.language,
          status: c.status,
          channel: c.channel,
          agentId: c.agentId,
          agentName: c.agentName,
          teamId: c.teamId,
          teamName: c.teamName,
          queueId: c.queueId,
          queueName: c.queueName,
          reviewStatus: c.reviewStatus,
          createdAt: c.createdAt,
          auditedAt: c.auditedAt,
          overallScore: c.overallScore,
          verdict: c.verdict,
          sentiment: c.sentiment,
          compliancePct: c.compliancePct,
          complianceFailedCount: c.complianceFailedCount,
          criticalFailureCount: c.criticalFailureCount,
          needsReview: c.needsReview,
          summary: c.summary,
        })),
        total,
        page: safePage,
        pageSize: filters.pageSize,
        totalPages,
        totalWorkspaceCalls: calls.length,
        lastAnalyzedAt,
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load calls table.";
    return apiErrorResponse(500, message, ctx.requestId, "CALLS_QUERY_ERROR");
  }
}

