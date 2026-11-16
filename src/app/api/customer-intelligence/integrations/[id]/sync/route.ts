import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectorRegistry } from "@/lib/integrations/core/connector-registry";
import { runIntegrationSync } from "@/lib/integrations/core/sync-engine";
import { decryptIntegrationCredentials } from "@/lib/integrations/security";
import { getMembership } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  const supabase = createAdminClient();
  const membership = await getMembership(user.id);
  if (membership && membership.role !== "admin") {
    return NextResponse.json({ error: "Only workspace administrators can run synchronization." }, { status: 403 });
  }

  let integrationQuery = supabase
    .from("integrations")
    .select("*, integration_credentials(*)")
    .eq("id", id);
  integrationQuery = membership?.workspaceId
    ? integrationQuery.eq("workspace_id", membership.workspaceId)
    : integrationQuery.eq("user_id", user.id).is("workspace_id", null);
  const { data: integration, error } = await integrationQuery.maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  // Decrypt or parse stored credentials reference if present
  let credentials: Record<string, string> = {};
  const credRow = (
    integration.integration_credentials as Array<{
      encrypted_secret_reference?: string;
    }>
  )?.[0];
  if (credRow?.encrypted_secret_reference) {
    try {
      credentials = decryptIntegrationCredentials(credRow.encrypted_secret_reference);
    } catch {
      return NextResponse.json({ error: "Stored credentials are invalid. Reconnect this integration." }, { status: 409 });
    }
  }

  try {
    const connector = connectorRegistry.createConnector(
      integration.provider,
      integration.configuration || {},
      credentials,
    );

    const result = await runIntegrationSync(
      integration.id,
      user.id,
      integration.workspace_id,
      connector,
      { recordingCredentials: credentials },
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Integration sync failed to execute",
      },
      { status: 500 },
    );
  }
}
