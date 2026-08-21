import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const IN_PROGRESS = new Set(["transcribing", "analyzing"]);

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: call, error } = await supabase
    .from("calls")
    .select("id, user_id, audio_path, status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!call || call.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (IN_PROGRESS.has(call.status)) {
    return NextResponse.json(
      { error: "Wait until transcription or scoring finishes, then delete." },
      { status: 409 },
    );
  }

  if (call.audio_path) {
    const { error: storageError } = await supabase.storage
      .from("call-audio")
      .remove([call.audio_path]);
    if (storageError) {
      console.error("Could not remove call audio", storageError);
    }
  }

  const { error: deleteError } = await supabase.from("calls").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
