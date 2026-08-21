import { NextResponse, after } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
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

  const { data: call } = await supabase
    .from("calls")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!call || call.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const work = transcribeCall(id).catch((error) => {
    console.error("Call processing failed", error);
  });
  after(async () => {
    await work;
  });

  return NextResponse.json({ ok: true, status: "started" });
}
