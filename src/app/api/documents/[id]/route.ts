import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership, getTeamScope } from "@/lib/workspaces";

export const runtime = "nodejs";

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
  const { data: row, error } = await supabase
    .from("qa_documents")
    .select("id, user_id, file_path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const teamScope = await getTeamScope(user.id);
  if (!row || !teamScope.includes(row.user_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = row.user_id === user.id;
  if (!isOwner) {
    const membership = await getMembership(user.id).catch(() => null);
    if (membership?.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can delete files uploaded by teammates." },
        { status: 403 },
      );
    }
  }

  await supabase.storage.from("qa-documents").remove([row.file_path]);
  const { error: deleteError } = await supabase.from("qa_documents").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
