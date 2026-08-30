import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";

export const runtime = "nodejs";

function safeFilename(name: string, fallback: string) {
  const cleaned = name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 120);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = new URL(request.url).searchParams.get("kind") || "audio";
  if (kind !== "audio") {
    return NextResponse.json({ error: "Only the recording can be downloaded." }, { status: 404 });
  }

  const admin = createAdminClient();
  const teamScope = await getTeamScope(user.id);
  const { data: call } = await admin
    .from("calls")
    .select("id, user_id, title, file_name, audio_path")
    .eq("id", id)
    .maybeSingle();

  if (!call || !teamScope.includes(call.user_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stem = safeFilename(
    (call.title || call.file_name || "call").replace(/\.[^.]+$/, ""),
    "call",
  );

  if (!call.audio_path) {
    return NextResponse.json({ error: "This call has no recording." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await admin.storage
    .from("call-audio")
    .download(call.audio_path);
  if (downloadError || !file) {
    return NextResponse.json(
      { error: downloadError?.message || "Could not download the recording." },
      { status: 500 },
    );
  }

  const original = call.file_name || call.audio_path.split("/").pop() || "recording";
  const ext = original.includes(".") ? original.slice(original.lastIndexOf(".")) : ".mp3";
  const bytes = new Uint8Array(await file.arrayBuffer());

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.type || "audio/mpeg",
      "Content-Disposition": `attachment; filename="${safeFilename(stem + ext, "recording.mp3")}"`,
      "Cache-Control": "no-store",
    },
  });
}
