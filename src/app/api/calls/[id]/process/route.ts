import { NextResponse, after } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import { transcribeCall } from "@/lib/process-call";

export const runtime = "nodejs";
export const maxDuration = 800;

const PREPARED = new Set(["transcribed", "analyzing", "completed"]);

/** Legacy alias: prepare transcript only. Never starts a documents audit. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { force?: unknown };
  const force = body.force === true;

  const { data: call } = await supabase
    .from("calls")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  const teamScope = await getTeamScope(user.id);
  if (!call || !teamScope.includes(call.user_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!force) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("utterances")
      .select("id", { count: "exact", head: true })
      .eq("call_id", id);
    if ((count ?? 0) > 0) {
      after(async () => {
        await transcribeCall(id).catch((error) => {
          console.error("Call processing failed", error);
        });
      });
      const status = PREPARED.has(call.status) ? call.status : "transcribed";
      return NextResponse.json({ ok: true, status, reused: true });
    }
    if (PREPARED.has(call.status)) {
      return NextResponse.json({ ok: true, status: call.status, reused: true });
    }
  }

  const work = transcribeCall(id, { force }).catch((error) => {
    console.error("Call processing failed", error);
  });
  after(async () => {
    await work;
  });

  return NextResponse.json({ ok: true, status: "started" });
}
