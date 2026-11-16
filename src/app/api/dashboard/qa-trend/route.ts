import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { dateBucketKey, parseDashboardFilters } from "@/lib/server/dashboard-filters";
import {
  applyCallFilters,
  computeFailureReasons,
  loadScopedCalls,
  summarizeWindowMetrics,
  type NormalizedCallRecord,
} from "@/lib/server/dashboard-queries";
import { formatShortDateInTz } from "@/lib/i18n/dashboard";

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
    const filtered = applyCallFilters(calls, filters, { window: "current" });

    const byDay = new Map<string, NormalizedCallRecord[]>();
    for (const call of filtered) {
      if (call.status !== "completed" || call.overallScore == null) continue;
      const key = dateBucketKey(call.createdAt, filters.timezone);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(call);
      else byDay.set(key, [call]);
    }

    const series = [...byDay.keys()]
      .sort()
      .map((dateKey) => {
        const summary = summarizeWindowMetrics(byDay.get(dateKey) || []);
        return {
          date: dateKey,
          label: formatShortDateInTz(
            `${dateKey}T12:00:00.000Z`,
            filters.timezone,
            ctx.preferences.locale,
          ),
          avgScore: summary.avgScore,
          complianceRate: summary.complianceRate,
          callCount: summary.callsAnalyzed,
        };
      });

    const failureReasons = computeFailureReasons(filtered, 6);

    return apiSuccessResponse(
      {
        range: filters.preset,
        targetScore: ctx.workspace.qaTargetScore,
        scoredCallCount: filtered.filter((c) => c.status === "completed" && c.overallScore != null)
          .length,
        series,
        failureReasons,
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load QA trends.";
    return apiErrorResponse(500, message, ctx.requestId, "TREND_LOAD_ERROR");
  }
}

