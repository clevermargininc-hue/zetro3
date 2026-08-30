import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const [{ data: score }, { data: utterances }] = await Promise.all([
    supabase.from("call_scores").select("*").eq("call_id", id).maybeSingle(),
    admin.from("utterances").select("*").eq("call_id", id).order("sequence"),
  ]);

  const turns = (utterances as Utterance[] | null) || [];
  const owned = call as Call & { agents?: { name: string } | null };
  if (turns.length && (owned.status === "queued" || owned.status === "transcribing" || owned.status === "failed")) {
    const next = score ? "completed" : "transcribed";
    await admin
      .from("calls")
      .update({
        status: next,
        error_message: null,
        ...(score ? { completed_at: owned.completed_at || new Date().toISOString() } : {}),
      })
      .eq("id", id);
    owned.status = next;
    owned.error_message = null;
  } else if (score && owned.status !== "completed" && owned.status !== "analyzing") {
    await admin
      .from("calls")
      .update({
        status: "completed",
        error_message: null,
        completed_at: owned.completed_at || new Date().toISOString(),
      })
      .eq("id", id);
    owned.status = "completed";
    owned.error_message = null;
  }

  return {
    call: owned,
    score: (score as CallScore | null) || null,
    utterances: turns,
  };
}
