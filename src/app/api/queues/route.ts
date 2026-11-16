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
    const { queues } = await loadTeamAndQueueLookups(ctx);
    return apiSuccessResponse({ queues }, ctx.requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load queues.";
    return apiErrorResponse(500, message, ctx.requestId, "QUEUES_LOAD_ERROR");
  }
}

