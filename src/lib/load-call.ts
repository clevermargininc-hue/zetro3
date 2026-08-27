import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore } from "@/lib/types";

export async function loadOwnedCall(id: string) {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data: call } = await supabase
    .from("calls")
    .select("*, agents(name)")
    .eq("id", id)
    .in("user_id", teamScope)
    .maybeSingle();

  if (!call) notFound();

  const { data: score } = await supabase
    .from("call_scores")
    .select("*")
    .eq("call_id", id)
    .maybeSingle();

  return {
    call: call as Call & { agents?: { name: string } | null },
    score: (score as CallScore | null) || null,
  };
}
