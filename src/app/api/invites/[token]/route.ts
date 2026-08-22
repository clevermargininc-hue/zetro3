import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { acceptInvite, getInviteByToken } from "@/lib/invites";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { token } = await context.params;
  try {
    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: "This invitation is invalid or has already been used." }, { status: 404 });
    }
    const email = (user.email || "").toLowerCase();
    return NextResponse.json({
      workspaceName: invite.workspaceName,
      email: invite.email,
      match: email === invite.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load invite." },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { token } = await context.params;
  try {
    await acceptInvite(token, user.id, user.email);
    const response = NextResponse.json({ ok: true, next: "/upload" });
    setWorkspaceCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not accept invite." },
      { status: 400 },
    );
  }
}
