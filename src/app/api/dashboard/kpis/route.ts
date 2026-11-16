import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { parseDashboardFilters } from "@/lib/server/dashboard-filters";
import {
  applyCallFilters,
  computeKpiSparklines,
  computeMetricDelta,
  loadScopedCalls,
  summarizeWindowMetrics,
} from "@/lib/server/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "overview:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const filters = parseDashboardFilters(new URL(request.url), ctx.workspace.timezone);
    const { calls } = await loadScopedCalls(ctx);

    const currentCalls = applyCallFilters(calls, filters, { window: "current" });
    const previousCalls = applyCallFilters(calls, filters, { window: "previous" });

    const current = summarizeWindowMetrics(currentCalls);
    const previous = summarizeWindowMetrics(previousCalls);
    const sparklines = computeKpiSparklines(currentCalls, filters.timezone);

    const lastAnalyzedAt =
      calls
        .filter((c) => c.status === "completed")
        .map((c) => c.auditedAt)
        .sort()
        .pop() ?? null;

    return apiSuccessResponse(
      {
        window: {
          preset: filters.preset,
          from: filters.fromIso,
          to: filters.toIso,
          prevFrom: filters.prevFromIso,
          prevTo: filters.prevToIso,
        },
        totalWorkspaceCalls: calls.length,
        filteredCallsCount: currentCalls.length,
        orgTargetScore: ctx.workspace.qaTargetScore,
        lastAnalyzedAt,
        kpis: {
          callsAnalyzed: {
            value: current.callsAnalyzed,
            previousValue: previousCalls.length > 0 ? previous.callsAnalyzed : null,
            delta:
              previousCalls.length > 0
                ? computeMetricDelta(current.callsAnalyzed, previous.callsAnalyzed)
                : null,
            sparkline: sparklines.callsAnalyzed,
          },
          avgScore: {
            value: current.avgScore,
            previousValue: previous.avgScore,
            delta: computeMetricDelta(current.avgScore, previous.avgScore),
            sparkline: sparklines.avgScore,
          },
          complianceRate: {
            value: current.complianceRate,
            previousValue: previous.complianceRate,
            delta: computeMetricDelta(current.complianceRate, previous.complianceRate),
            sparkline: sparklines.complianceRate,
          },
          positiveSentimentPct: {
            value: current.positiveSentimentPct,
            previousValue: previous.positiveSentimentPct,
            delta: computeMetricDelta(
              current.positiveSentimentPct,
              previous.positiveSentimentPct,
            ),
            sparkline: sparklines.positiveSentimentPct,
          },
          needsReviewCount: {
            value: current.needsReviewCount,
            previousValue: previousCalls.length > 0 ? previous.needsReviewCount : null,
            delta:
              previousCalls.length > 0
                ? computeMetricDelta(current.needsReviewCount, previous.needsReviewCount)
                : null,
            sparkline: sparklines.needsReviewCount,
          },
        },
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load KPI metrics.";
    return apiErrorResponse(500, message, ctx.requestId, "KPI_LOAD_ERROR");
  }
}

