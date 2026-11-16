import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership, getTeamScope } from "@/lib/workspaces";
import {
  sortAndSummarizeIntegrations,
  summarizeIssueCatalogueLinks,
  type CompanyConnectionSummary,
  type RawIntegrationRow,
  type RawIssueLinkRow,
  type RawRelationshipRow,
} from "@/lib/company-intelligence-utils";

export * from "@/lib/company-intelligence-utils";

function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /does not exist|schema cache|could not find/i.test(error.message || "")
  );
}

/**
 * Fetch real cross-module connection telemetry shared by Settings -> Company Data and Customer Intelligence.
 */
export async function getCompanyDataConnectionStats(
  userId: string,
  teamScopeOverride?: string[],
  workspaceIdOverride?: string | null,
): Promise<CompanyConnectionSummary> {
  const admin = createAdminClient();
  const [teamScope, membership] = await Promise.all([
    teamScopeOverride ? Promise.resolve(teamScopeOverride) : getTeamScope(userId),
    workspaceIdOverride !== undefined
      ? Promise.resolve({ workspaceId: workspaceIdOverride })
      : getMembership(userId).catch(() => null),
  ]);

  const workspaceId = membership?.workspaceId ?? null;

  let intQuery = admin
    .from("integrations")
    .select(
      "id, name, provider, integration_type, connection_status, last_sync_at, configuration, integration_sync_runs(started_at, completed_at, status, records_processed, error_summary)",
    )
    .order("created_at", { ascending: false });
  intQuery = workspaceId
    ? intQuery.eq("workspace_id", workspaceId)
    : intQuery.eq("user_id", userId).is("workspace_id", null);

  const [issuesRes, relRes, callsRes, issueCallsRes, intRes] = await Promise.all([
    admin
      .from("customer_issues")
      .select(
        "id, product_id, service_id, service_area_id, catalogue_issue_category_id, needs_review, catalogue_requires_review",
      )
      .in("user_id", teamScope),
    admin
      .from("issue_service_relationships")
      .select("issue_id, product_id, service_id, service_area_id, is_current")
      .in("user_id", teamScope),
    admin
      .from("calls")
      .select("id")
      .in("user_id", teamScope)
      .in("status", ["transcribed", "completed"]),
    admin.from("issue_calls").select("call_id").in("user_id", teamScope),
    intQuery,
  ]);

  const issues: RawIssueLinkRow[] = issuesRes.error && isMissingSchemaError(issuesRes.error)
    ? []
    : (issuesRes.data || []) as RawIssueLinkRow[];
  const relationships: RawRelationshipRow[] = relRes.error && isMissingSchemaError(relRes.error)
    ? []
    : (relRes.data || []) as RawRelationshipRow[];
  const callsRows = callsRes.error && isMissingSchemaError(callsRes.error) ? [] : callsRes.data || [];
  const analyzedCallIds = new Set(
    (issueCallsRes.error && isMissingSchemaError(issueCallsRes.error) ? [] : issueCallsRes.data || []).map(
      (r: { call_id: string }) => r.call_id,
    ),
  );
  const unanalyzedCallsCount = callsRows.filter((c: { id: string }) => !analyzedCallIds.has(c.id)).length;

  const rawIntegrations: RawIntegrationRow[] =
    intRes.error && isMissingSchemaError(intRes.error) ? [] : (intRes.data || []) as RawIntegrationRow[];
  const integrations = sortAndSummarizeIntegrations(rawIntegrations);

  const coverage = summarizeIssueCatalogueLinks(issues, relationships);

  const syncDates = integrations
    .map((item) => item.lastSyncAt)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    ...coverage,
    unanalyzedCallsCount,
    integrationsCount: integrations.length,
    activeIntegrationsCount: integrations.filter((item) => item.connectionStatus === "active").length,
    lastSyncAt: syncDates[0] || null,
    integrations,
  };
}
