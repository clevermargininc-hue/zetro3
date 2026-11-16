import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectorRegistry } from "@/lib/integrations/core/connector-registry";
import { decryptIntegrationCredentials } from "@/lib/integrations/security";
import { getMembership } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadScopedIntegration(userId: string, id: string, write = false) {
  const supabase = createAdminClient();
  const membership = await getMembership(userId);
  if (write && membership && membership.role !== "admin") {
    return { error: NextResponse.json({ error: "Only workspace administrators can manage integrations." }, { status: 403 }) };
  }

  let query = supabase
    .from("integrations")
    .select("*, integration_credentials(*)")
    .eq("id", id);
  query = membership?.workspaceId
    ? query.eq("workspace_id", membership.workspaceId)
    : query.eq("user_id", userId).is("workspace_id", null);

  const { data: integration, error } = await query.maybeSingle();
  if (error || !integration) {
    return { error: NextResponse.json({ error: "Integration not found in this workspace." }, { status: 404 }) };
  }
  return { supabase, integration };
}

/**
 * Re-test an existing integration endpoint and update its connection_status.
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await props.params;
  const loaded = await loadScopedIntegration(user.id, id, true);
  if ("error" in loaded) return loaded.error;
  const { supabase, integration } = loaded;

  let credentials: Record<string, string> = {};
  const credRow = (
    integration.integration_credentials as Array<{ encrypted_secret_reference?: string }>
  )?.[0];
  if (credRow?.encrypted_secret_reference) {
    try {
      credentials = decryptIntegrationCredentials(credRow.encrypted_secret_reference);
    } catch {
      return NextResponse.json(
        { error: "Stored credentials could not be decrypted. Reconnect this integration." },
        { status: 409 },
      );
    }
  }

  try {
    const connector = connectorRegistry.createConnector(
      integration.provider,
      (integration.configuration as Record<string, unknown>) || {},
      credentials,
    );
    const result = await connector.validateConnection();
    const nextStatus = result.success ? "active" : "failing";

    await supabase
      .from("integrations")
      .update({ connection_status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", integration.id);

    return NextResponse.json({
      success: result.success,
      connectionStatus: nextStatus,
      message: result.message || (result.success ? "Connection verified." : "Connection test failed."),
    }, { status: result.success ? 200 : 400 });
  } catch (err) {
    await supabase
      .from("integrations")
      .update({ connection_status: "failing", updated_at: new Date().toISOString() })
      .eq("id", integration.id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connection test failed." },
      { status: 500 },
    );
  }
}

/**
 * Pause/resume or rename an existing integration.
 */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await props.params;
  const loaded = await loadScopedIntegration(user.id, id, true);
  if ("error" in loaded) return loaded.error;
  const { supabase, integration } = loaded;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim().slice(0, 120);
  }
  if (
    typeof body.connectionStatus === "string" &&
    ["active", "paused"].includes(body.connectionStatus)
  ) {
    updates.connection_status = body.connectionStatus;
  }

  const { data, error } = await supabase
    .from("integrations")
    .update(updates)
    .eq("id", integration.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Could not update integration." }, { status: 500 });
  }

  return NextResponse.json({ success: true, integration: data });
}

/**
 * Disconnect/delete an integration cleanly while keeping already synced catalogue/call records.
 */
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await props.params;
  const loaded = await loadScopedIntegration(user.id, id, true);
  if ("error" in loaded) return loaded.error;
  const { supabase, integration } = loaded;

  const { error } = await supabase.from("integrations").delete().eq("id", integration.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

