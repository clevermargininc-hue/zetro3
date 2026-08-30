import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { callAuditExcel, callAuditFilename, callAuditPdf } from "@/lib/call-audit-file";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore, Utterance } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format");
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ error: "Format must be xlsx or pdf." }, { status: 400 });
  }

  const teamScope = await getTeamScope(user.id);
  const { data: call } = await supabase
    .from("calls")
    .select("*, agents(name)")
    .eq("id", id)
    .in("user_id", teamScope)
    .maybeSingle();

  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: score } = await supabase
    .from("call_scores")
    .select("*")
    .eq("call_id", id)
    .maybeSingle();

  if (!score) {
    return NextResponse.json(
      { error: "Audit this call before downloading." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { data: utterances } = await admin
    .from("utterances")
    .select("*")
    .eq("call_id", id)
    .order("sequence");

  const pack = {
    call: call as Call & { agents?: { name: string } | null },
    score: score as CallScore,
    utterances: (utterances as Utterance[] | null) || [],
  };
  const body = format === "xlsx" ? callAuditExcel(pack) : callAuditPdf(pack);
  const filename = callAuditFilename(pack, format);
  const type =
    format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf";

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
