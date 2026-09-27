import { NextResponse } from "next/server";
import { getLiveUsers } from "@/lib/admin-analytics";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getRequestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    return NextResponse.json(await getLiveUsers(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load live users" },
      { status: 500 },
    );
  }
}
