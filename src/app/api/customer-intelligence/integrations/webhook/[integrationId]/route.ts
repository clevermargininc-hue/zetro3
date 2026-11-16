import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectorRegistry } from "@/lib/integrations/core/connector-registry";
import { runIntegrationSync } from "@/lib/integrations/core/sync-engine";
import { decryptIntegrationCredentials } from "@/lib/integrations/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function constantTimeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Webhook Ingestion Endpoint for CRM, ticketing, or telephony gateway events.
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await props.params;
  const supabase = createAdminClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*, integration_credentials(*)")
    .eq("id", integrationId)
    .maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Invalid integration endpoint" }, { status: 404 });
  }

  if (integration.connection_status === "disabled" || integration.connection_status === "paused") {
    return NextResponse.json({ error: "Integration endpoint is currently inactive" }, { status: 403 });
  }

  const credRow = (
    integration.integration_credentials as Array<{
      encrypted_secret_reference?: string;
    }>
  )?.[0];
  let credentials: Record<string, string> = {};
  if (credRow?.encrypted_secret_reference) {
    try {
      credentials = decryptIntegrationCredentials(credRow.encrypted_secret_reference);
    } catch {
      return NextResponse.json(
        { error: "Stored credentials cannot be verified. Reconnect this integration." },
        { status: 409 },
      );
    }
  }

  const expectedSecret =
    credentials.webhookSecret || credentials.apiKey || credentials.token || "";
  if (expectedSecret) {
    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const provided =
      request.headers.get("x-webhook-secret")?.trim() ||
      request.headers.get("x-api-key")?.trim() ||
      bearerToken;
    if (!provided || !constantTimeMatch(provided, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const ticketObj =
    payload.ticket && typeof payload.ticket === "object"
      ? (payload.ticket as Record<string, unknown>)
      : null;
  const externalEventId =
    payload.id ||
    payload.event_id ||
    ticketObj?.id ||
    `webhook-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const cfg = (integration.configuration as Record<string, unknown>) || {};
  const configuredEntityType =
    typeof cfg.entityType === "string" ? cfg.entityType : ticketObj ? "ticket" : "call";
  const recordEntityType = (
    ["ticket", "call", "product", "service"].includes(configuredEntityType)
      ? configuredEntityType
      : "ticket"
  ) as "ticket" | "call" | "product" | "service";

  try {
    const connector = connectorRegistry.createConnector(
      integration.provider === "generic_rest" ? "generic_rest" : integration.provider,
      cfg,
      credentials,
    );

    const singleBatchConnector = {
      ...connector,
      fetchRecords: async () => ({
        records: [
          {
            externalId: String(externalEventId),
            entityType: recordEntityType,
            raw: payload.ticket || payload,
            timestamp: (payload.created_at as string) || new Date().toISOString(),
          },
        ],
        hasMore: false,
      }),
    };

    const result = await runIntegrationSync(
      integration.id,
      integration.user_id,
      integration.workspace_id,
      singleBatchConnector,
      { recordingCredentials: credentials },
    );

    return NextResponse.json({
      received: true,
      eventId: externalEventId,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to process incoming webhook event",
      },
      { status: 500 },
    );
  }
}
