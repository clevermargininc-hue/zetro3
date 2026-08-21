import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents });
}
