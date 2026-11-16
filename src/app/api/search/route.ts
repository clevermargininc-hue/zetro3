import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { loadScopedCalls } from "@/lib/server/dashboard-queries";

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
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const { calls, agents } = await loadScopedCalls(ctx);

    const matchedAgents = (
      q ? agents.filter((a) => a.name.toLowerCase().includes(q)) : agents
    ).slice(0, 6);

    const matchedCalls = (
      q
        ? calls.filter((c) => {
            const hay = `${c.title} ${c.fileName ?? ""} ${c.agentName} ${c.summary ?? ""}`.toLowerCase();
            return hay.includes(q);
          })
        : calls
    )
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        title: c.title,
        agentName: c.agentName,
        overallScore: c.overallScore,
        status: c.status,
        needsReview: c.needsReview,
        createdAt: c.createdAt,
      }));

    return apiSuccessResponse(
      {
        calls: matchedCalls,
        agents: matchedAgents,
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not search workspace.";
    return apiErrorResponse(500, message, ctx.requestId, "SEARCH_ERROR");
  }
}

