import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getAutoAudit, setAutoAudit } from "@/lib/workspace-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ auto_audit: await getAutoAudit(user.id) });
}

export async function PATCH(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { auto_audit?: unknown };
  if (typeof body.auto_audit !== "boolean") {
    return NextResponse.json({ error: "auto_audit must be true or false." }, { status: 400 });
  }
  try {
    await setAutoAudit(user.id, body.auto_audit);
    return NextResponse.json({ auto_audit: body.auto_audit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save setting" },
      { status: 500 },
    );
  }
}
