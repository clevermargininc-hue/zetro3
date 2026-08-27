import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore, Utterance } from "@/lib/types";

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

  const [{ data: utterances }, { data: score }] = await Promise.all([
    supabase.from("utterances").select("*").eq("call_id", id).order("sequence"),
    supabase.from("call_scores").select("*").eq("call_id", id).maybeSingle(),
  ]);

  return {
    call: call as Call & { agents?: { name: string } | null },
    utterances: (utterances || []) as Utterance[],
    score: (score as CallScore | null) || null,
  };
}
