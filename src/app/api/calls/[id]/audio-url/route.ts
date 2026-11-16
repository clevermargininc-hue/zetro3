import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 900; // 15 minutes

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "calls:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await context.params;
  const { data: call, error } = await ctx.admin
    .from("calls")
    .select("id, user_id, audio_path, duration_seconds")
    .eq("id", id)
    .in("user_id", ctx.teamScope)
    .maybeSingle();

  if (error) {
    return apiErrorResponse(500, error.message, ctx.requestId, "DB_ERROR");
  }
  if (!call) {
    return apiErrorResponse(404, "Call not found.", ctx.requestId, "NOT_FOUND");
  }
  if (!call.audio_path) {
    return apiSuccessResponse(
      {
        signedUrl: null,
        expiresAt: null,
        durationSeconds: call.duration_seconds ?? null,
        reason: "NO_AUDIO",
      },
      ctx.requestId,
    );
  }

  const { data: signed, error: signErr } = await ctx.admin.storage
    .from("call-audio")
    .createSignedUrl(call.audio_path as string, SIGNED_TTL_SECONDS);

  if (signErr || !signed?.signedUrl) {
    return apiErrorResponse(
      502,
      signErr?.message || "Could not create signed audio URL.",
      ctx.requestId,
      "AUDIO_SIGN_ERROR",
    );
  }

  return apiSuccessResponse(
    {
      signedUrl: signed.signedUrl,
      expiresAt: new Date(Date.now() + SIGNED_TTL_SECONDS * 1000).toISOString(),
      durationSeconds: (call.duration_seconds as number | null) ?? null,
      reason: null,
    },
    ctx.requestId,
  );
}

