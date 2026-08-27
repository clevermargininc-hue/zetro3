import { NextResponse, after } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getTeamScope } from "@/lib/workspaces";
import { transcribeCall } from "@/lib/process-call";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { auto_score?: unknown };
  const autoScore =
    body.auto_score === false || body.auto_score === "none"
      ? false
      : body.auto_score === "documents" || body.auto_score === "automatic"
        ? body.auto_score
        : undefined;

  const { data: call } = await supabase
    .from("calls")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  const teamScope = await getTeamScope(user.id);
  if (!call || !teamScope.includes(call.user_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (call.status === "transcribing") {
    return NextResponse.json({ ok: true, status: "transcribing" });
  }

  const work = transcribeCall(
    id,
    autoScore === undefined ? undefined : { autoScore },
  ).catch((error) => {
    console.error("Transcription failed", error);
  });
  after(async () => {
    await work;
  });

  return NextResponse.json({
    ok: true,
    status: "started",
  });
}
