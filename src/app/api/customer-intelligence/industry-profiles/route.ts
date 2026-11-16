import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { INDUSTRY_PROFILES } from "@/lib/industry-configuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = Object.values(INDUSTRY_PROFILES);
  return NextResponse.json({
    profiles,
    total: profiles.length,
  });
}

