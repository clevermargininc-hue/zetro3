import { NextResponse, type NextRequest } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

/** Where a user lands right after signing in or confirming their email. */
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return to("/login");
  if (isPlatformAdmin(user.email)) return to("/admin");

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return to(data ? "/dashboard" : "/onboarding");
}
