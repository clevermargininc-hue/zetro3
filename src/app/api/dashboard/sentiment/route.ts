import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { parseDashboardFilters } from "@/lib/server/dashboard-filters";
import { applyCallFilters, loadScopedCalls } from "@/lib/server/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "overview:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const url = new URL(request.url);
    const filters = parseDashboardFilters(url, ctx.workspace.timezone);
    const groupBy = url.searchParams.get("groupBy") === "queue" ? "queue" : "channel";
    const { calls } = await loadScopedCalls(ctx);

    const filtered = applyCallFilters(calls, filters, { window: "current" }).filter(
      (c) => c.status === "completed" && c.score != null,
    );

    const counts = {
      positive: 0,
      neutral: 0,
      negative: 0,
      unknown: 0,
    };

    const groups = new Map<
      string,
      {
        groupKey: string;
        label: string;
        positive: number;
        neutral: number;
        negative: number;
        unknown: number;
        total: number;
      }
    >();

    for (const call of filtered) {
      counts[call.sentiment] += 1;

      const groupKey =
        groupBy === "queue" ? call.queueId || "unassigned_queue" : call.channel;
      const groupLabel =
        groupBy === "queue"
          ? call.queueName || "Unassigned queue"
          : call.channel.charAt(0).toUpperCase() + call.channel.slice(1);

      const entry = groups.get(groupKey) ?? {
        groupKey,
        label: groupLabel,
        positive: 0,
        neutral: 0,
        negative: 0,
        unknown: 0,
        total: 0,
      };
      entry[call.sentiment] += 1;
      entry.total += 1;
      groups.set(groupKey, entry);
    }

    return apiSuccessResponse(
      {
        groupBy,
        totalScored: filtered.length,
        counts,
        breakdown: [...groups.values()].sort((a, b) => b.total - a.total),
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load sentiment metrics.";
    return apiErrorResponse(500, message, ctx.requestId, "SENTIMENT_LOAD_ERROR");
  }
}

