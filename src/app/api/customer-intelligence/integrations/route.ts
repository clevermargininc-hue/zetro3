import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectorRegistry } from "@/lib/integrations/core/connector-registry";
import { getMembership } from "@/lib/workspaces";
import { assertSafeExternalEndpoint, encryptIntegrationCredentials } from "@/lib/integrations/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const membership = await getMembership(user.id);
  const workspaceId = membership?.workspaceId ?? null;

  let query = supabase
    .from("integrations")
    .select("*, integration_sync_runs(started_at, completed_at, status, records_processed, error_summary)")
    .order("created_at", { ascending: false });
  query = workspaceId ? query.eq("workspace_id", workspaceId) : query.eq("user_id", user.id).is("workspace_id", null);
  const { data: integrations, error } = await query;

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return NextResponse.json({ integrations: [], availableProviders: connectorRegistry.listProviders(), workspaceId, migrationRequired: true, canManage: !membership || membership.role === "admin" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const availableProviders = connectorRegistry.listProviders();

  const sortedIntegrations = (integrations || []).map((item) => {
    const runs = Array.isArray(item.integration_sync_runs)
      ? [...item.integration_sync_runs].sort((a: { started_at?: string | null }, b: { started_at?: string | null }) => {
          const tA = a.started_at ? new Date(a.started_at).getTime() : 0;
          const tB = b.started_at ? new Date(b.started_at).getTime() : 0;
          return (Number.isFinite(tB) ? tB : 0) - (Number.isFinite(tA) ? tA : 0);
        })
      : [];
    return {
      ...item,
      integration_sync_runs: runs.slice(0, 5),
      webhookPath: `/api/customer-intelligence/integrations/webhook/${item.id}`,
    };
  });

  return NextResponse.json({
    integrations: sortedIntegrations,
    availableProviders,
    workspaceId,
    canManage: !membership || membership.role === "admin",
  });
}

export async function POST(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, provider, integrationType, configuration, credentials } = body;

    if (!name || !provider) {
      return NextResponse.json(
        { error: "Name and provider are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const membership = await getMembership(user.id);
    const workspaceId = membership?.workspaceId ?? null;
    if (membership && membership.role !== "admin") {
      return NextResponse.json({ error: "Only workspace administrators can add data connections." }, { status: 403 });
    }
    if (provider !== "generic_rest") {
      return NextResponse.json({ error: "This setup screen currently supports Generic REST connections." }, { status: 400 });
    }
    await assertSafeExternalEndpoint(String(configuration?.endpointUrl || ""));

    // Test connection using connector
    try {
      const connector = connectorRegistry.createConnector(
        provider,
        configuration || {},
        credentials || {},
      );
      const testResult = await connector.validateConnection();
      if (!testResult.success) {
        return NextResponse.json(
          {
            error: `Connection test failed: ${testResult.message || "Invalid configuration"}`,
            testResult,
          },
          { status: 400 },
        );
      }
    } catch (testErr) {
      return NextResponse.json(
        {
          error: `Connector validation failed: ${testErr instanceof Error ? testErr.message : String(testErr)}`,
        },
        { status: 400 },
      );
    }

    // Insert integration row
    const { data: newIntegration, error: insErr } = await supabase
      .from("integrations")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        name,
        provider,
        integration_type: integrationType || "generic_rest",
        connection_status: "active",
        configuration: configuration || {},
      })
      .select("*")
      .single();

    if (insErr || !newIntegration) {
      return NextResponse.json(
        { error: insErr?.message || "Failed to save integration" },
        { status: 500 },
      );
    }

    // Securely record credential reference if provided
    if (credentials && Object.keys(credentials).length > 0) {
      const secretRef = encryptIntegrationCredentials(credentials);
      const { error: credentialError } = await supabase.from("integration_credentials").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        integration_id: newIntegration.id,
        credential_type: credentials.apiKey ? "api_key" : credentials.token ? "bearer_token" : "basic_auth",
        encrypted_secret_reference: secretRef,
      });
      if (credentialError) {
        await supabase.from("integrations").delete().eq("id", newIntegration.id);
        return NextResponse.json({ error: "The connection was tested, but its credentials could not be stored securely." }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      integration: newIntegration,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create integration" },
      { status: 500 },
    );
  }
}
