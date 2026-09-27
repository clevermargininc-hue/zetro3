import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";

/** Heartbeat from the app, about once a minute while a tab is open. Feeds live users in /admin. */
export async function POST(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Zetro staff are left out so the numbers show customers only.
  if (isPlatformAdmin(user.email)) return new NextResponse(null, { status: 204 });

  const body = (await request.json().catch(() => ({}))) as { path?: unknown };
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : null;

  const db = createAdminClient();
  const { data: member } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Best effort: if analytics.sql has not been run yet, the app must keep working.
  await db.rpc("record_presence", {
    p_user: user.id,
    p_workspace: (member?.workspace_id as string | undefined) ?? null,
    p_path: path,
  });

  return new NextResponse(null, { status: 204 });
}
