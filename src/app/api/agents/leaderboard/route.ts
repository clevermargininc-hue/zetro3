import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { parseDashboardFilters } from "@/lib/server/dashboard-filters";
import {
  applyCallFilters,
  computeMetricDelta,
  loadScopedCalls,
  summarizeWindowMetrics,
  type NormalizedCallRecord,
} from "@/lib/server/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "agents:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const url = new URL(request.url);
    const filters = parseDashboardFilters(url, ctx.workspace.timezone);
    const limitParam = Number.parseInt(url.searchParams.get("limit") || "12", 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 12;

    const { calls } = await loadScopedCalls(ctx);
    const currentCalls = applyCallFilters(calls, filters, { window: "current" }).filter(
      (c) => c.status === "completed" && c.overallScore != null,
    );
    const previousCalls = applyCallFilters(calls, filters, { window: "previous" }).filter(
      (c) => c.status === "completed" && c.overallScore != null,
    );

    // Count open/in-progress coaching tasks per agent from real DB rows when table exists
    const coachingCountByAgent = new Map<string, number>();
    const coachingRes = await ctx.admin
      .from("coaching_tasks")
      .select("agent_id, status")
      .eq("workspace_id", ctx.workspace.id)
      .in("status", ["open", "in_progress"]);
    if (!coachingRes.error && coachingRes.data) {
      for (const row of coachingRes.data) {
        if (typeof row.agent_id === "string") {
          coachingCountByAgent.set(
            row.agent_id,
            (coachingCountByAgent.get(row.agent_id) ?? 0) + 1,
          );
        }
      }
    }

    const groupCalls = (items: NormalizedCallRecord[]) => {
      const grouped = new Map<
        string,
        { agentId: string | null; agentName: string; teamName: string | null; items: NormalizedCallRecord[] }
      >();
      for (const item of items) {
        const key = item.agentId || `name:${item.agentName.toLowerCase()}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.items.push(item);
          if (!existing.teamName && item.teamName) existing.teamName = item.teamName;
        } else {
          grouped.set(key, {
            agentId: item.agentId,
            agentName: item.agentName,
            teamName: item.teamName,
            items: [item],
          });
        }
      }
      return grouped;
    };

    const currentGroups = groupCalls(currentCalls);
    const previousGroups = groupCalls(previousCalls);

    const rows = [...currentGroups.entries()]
      .map(([key, group]) => {
        const curSummary = summarizeWindowMetrics(group.items);
        const prevGroup = previousGroups.get(key);
        const prevSummary = prevGroup ? summarizeWindowMetrics(prevGroup.items) : null;
        return {
          key,
          agentId: group.agentId,
          agentName: group.agentName,
          teamName: group.teamName,
          callCount: curSummary.callsAnalyzed,
          avgScore: curSummary.avgScore ?? 0,
          previousAvgScore: prevSummary?.avgScore ?? null,
          scoreDelta: computeMetricDelta(curSummary.avgScore, prevSummary?.avgScore ?? null),
          complianceRate: curSummary.complianceRate,
          needsReviewCount: curSummary.needsReviewCount,
          openCoachingCount: group.agentId ? coachingCountByAgent.get(group.agentId) ?? 0 : 0,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore || b.callCount - a.callCount)
      .slice(0, limit);

    return apiSuccessResponse(
      {
        totalAgents: currentGroups.size,
        agents: rows,
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load agent leaderboard.";
    return apiErrorResponse(500, message, ctx.requestId, "LEADERBOARD_LOAD_ERROR");
  }
}

