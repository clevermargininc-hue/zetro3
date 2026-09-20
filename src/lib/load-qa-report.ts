import type { SupabaseClient } from "@supabase/supabase-js";
import { getTeamScope } from "@/lib/workspaces";
import { buildQaBriefing } from "@/lib/qa-briefing";
import {
  buildQaReport,
  previousPeriodDate,
  type CallRecord,
  type QaReport,
  type ReportPeriod,
} from "@/lib/reports";

export async function loadQaReport(
  supabase: SupabaseClient,
  userId: string,
  period: ReportPeriod,
  date: string,
  agentId: string | null,
): Promise<QaReport> {
  const teamScope = await getTeamScope(userId);
  const callsQuery = supabase
    .from("calls")
    .select(
      "id, title, file_name, agent_id, created_at, completed_at, duration_seconds, status, agents(name), call_scores(*)",
    )
    .in("user_id", teamScope)
    .eq("status", "completed");

  const agentsQuery = supabase.from("agents").select("id, name").in("user_id", teamScope);

  const [{ data: calls, error: callError }, { data: agents, error: agentError }] = await Promise.all([
    callsQuery,
    agentsQuery,
  ]);

  if (callError) throw new Error(callError.message);
  if (agentError) throw new Error(agentError.message);

  const agentRows = (agents || []) as { id: string; name: string }[];
  const agentLabel = agentId
    ? agentRows.find((row) => row.id === agentId)?.name || "Selected agent"
    : "All agents";

  if (agentId && !agentRows.some((row) => row.id === agentId)) {
    throw new Error("Agent not found.");
  }

  const records = (calls || []) as CallRecord[];
  const opts = { period, date, agentId, agentLabel };
  const report = buildQaReport(records, opts);
  const previous = buildQaReport(records, {
    ...opts,
    date: previousPeriodDate(period, date),
  });
  return {
    ...report,
    briefing: buildQaBriefing(report, previous),
  };
}
