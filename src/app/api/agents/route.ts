import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getTeamScope } from "@/lib/workspaces";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamScope = await getTeamScope(user.id);
  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name")
    .in("user_id", teamScope)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents });
}
