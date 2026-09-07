import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import type { Call, CallScore, Utterance } from "@/lib/types";

export async function loadOwnedCall(id: string) {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data: call, error } = await supabase
    .from("calls")
    .select("*, agents(name)")
    .eq("id", id)
    .single();

  if (!call || !teamScope.includes(call.user_id)) {
    console.error("loadOwnedCall 404:", { id, user_id: user.id, teamScope, error });
    notFound();
  }

  const admin = createAdminClient();
  const [{ data: score }, countRes] = await Promise.all([
    supabase.from("call_scores").select("*").eq("call_id", id).maybeSingle(),
    admin.from("utterances").select("id", { count: "exact", head: true }).eq("call_id", id),
  ]);

  const turnCount = countRes.count ?? 0;
  const owned = call as Call & { agents?: { name: string } | null };

  if (owned.status === "analyzing" && !score) {
    await admin
      .from("calls")
      .update({ status: "transcribed" })
      .eq("id", id);
    owned.status = "transcribed";
  } else if (
    turnCount > 0 &&
    (owned.status === "queued" || owned.status === "transcribing" || owned.status === "failed")
  ) {
    await admin
      .from("calls")
      .update({
        status: "transcribed",
        error_message: null,
      })
      .eq("id", id);
    owned.status = "transcribed";
    owned.error_message = null;
  }

  return {
    call: owned,
    score: (score as CallScore | null) || null,
    utterances: [] as Utterance[],
    hasTranscript: turnCount > 0,
  };
}
