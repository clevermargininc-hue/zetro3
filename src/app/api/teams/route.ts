import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { loadTeamAndQueueLookups } from "@/lib/server/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "overview:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { teams } = await loadTeamAndQueueLookups(ctx);
    return apiSuccessResponse({ teams }, ctx.requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load teams.";
    return apiErrorResponse(500, message, ctx.requestId, "TEAMS_LOAD_ERROR");
  }
}

