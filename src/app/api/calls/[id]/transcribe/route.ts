import { NextResponse, after } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import { transcribeCall } from "@/lib/process-call";
import { describePrepareError } from "@/lib/ai-client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { user, supabase } = await getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again, then retry prepare." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { force?: unknown };
    const force = body.force === true;

    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("id, user_id, status")
      .eq("id", id)
      .single();

    if (callError) {
      return NextResponse.json(
        { error: callError.message || "Could not load this call." },
        { status: 400 },
      );
    }

    const teamScope = await getTeamScope(user.id);
    if (!call || !teamScope.includes(call.user_id)) {
      return NextResponse.json({ error: "Call not found." }, { status: 404 });
    }

    const admin = createAdminClient();
    const { count } = await admin
      .from("utterances")
      .select("id", { count: "exact", head: true })
      .eq("call_id", id);
    const turns = count ?? 0;

    if (!force && turns > 0) {
      const status =
        call.status === "analyzing" || call.status === "completed" || call.status === "transcribed"
          ? call.status
          : "transcribed";
      if (status !== call.status) {
        await admin
          .from("calls")
          .update({ status, error_message: null })
          .eq("id", id);
      }
      return NextResponse.json({ ok: true, status, reused: true });
    }

    const work = transcribeCall(id, { force }).catch((error) => {
      console.error("Transcription failed", error);
    });
    after(async () => {
      await work;
    });

    return NextResponse.json({
      ok: true,
      status: force || call.status === "transcribing" || turns === 0 ? "transcribing" : "started",
    });
  } catch (error) {
    console.error("Prepare route failed", error);
    return NextResponse.json(
      { error: describePrepareError(error) },
      { status: 500 },
    );
  }
}
