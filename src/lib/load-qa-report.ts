import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/fetch-all";
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
  const [callsPage, agentsPage] = await Promise.all([
    fetchAllRows<CallRecord>((from, to) =>
      supabase
        .from("calls")
        .select(
          "id, title, file_name, agent_id, created_at, completed_at, duration_seconds, status, agents(name), call_scores(*)",
        )
        .in("user_id", teamScope)
        .eq("status", "completed")
        .order("id")
        .range(from, to),
    ),
    fetchAllRows<{ id: string; name: string }>((from, to) =>
      supabase.from("agents").select("id, name").in("user_id", teamScope).order("id").range(from, to),
    ),
  ]);

  if (callsPage.error) throw new Error(callsPage.error.message);
  if (agentsPage.error) throw new Error(agentsPage.error.message);
  const calls = callsPage.data;
  const agents = agentsPage.data;

  const agentRows = (agents || []) as { id: string; name: string }[];
  const agentLabel = agentId
    ? agentRows.find((row) => row.id === agentId)?.name || "Selected agent"
    : "All agents";

  if (agentId && !agentRows.some((row) => row.id === agentId)) {
    throw new Error("Agent not found.");
  }

  const records = calls;
  const opts = { period, date, agentId, agentLabel };
  const report = buildQaReport(records, opts);
  const previous =
    period === "all"
      ? null
      : buildQaReport(records, {
          ...opts,
          date: previousPeriodDate(period, date),
        });
  return {
    ...report,
    briefing: buildQaBriefing(report, previous),
  };
}
