/**
 * Zetro Universal Integration Hub — Generic REST Connector
 * Polls arbitrary REST APIs with token/key auth and normalizes responses.
 * Follows CTO Specification Section 7.1, 7.3 & 17.
 */

import {
  type ConnectionHealth,
  type ConnectionResult,
  type ConnectorBatch,
  type CanonicalRecord,
  type ZetroConnector,
} from "@/lib/integrations/core/connector-interface";
import { normalizeTicketToInteraction, type RawTicketRecord } from "@/lib/integrations/core/normalization";
import { assertSafeExternalEndpoint } from "@/lib/integrations/security";

type CatalogueEntityType = "product" | "service";
type FieldMapping = { id?: string; name?: string; description?: string; active?: string; sku?: string; serviceArea?: string; recordingUrl?: string; callerPhone?: string; customerId?: string; agentName?: string; startedAt?: string; durationSeconds?: string; direction?: string };

export interface GenericRestConfig {
  endpointUrl?: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  pageParam?: string;
  pageSizeParam?: string;
  pageSize?: number;
  countryHint?: string;
  sourceSystemId?: string;
  entityType?: "ticket" | "call" | CatalogueEntityType;
  recordsPath?: string;
  providerProfile?: string;
  fieldMapping?: FieldMapping;
}

export class GenericRestConnector implements ZetroConnector {
  public readonly provider = "generic_rest";
  public readonly integrationType = "generic_rest";

  private config: GenericRestConfig;
  private credentials: Record<string, string>;

  constructor(config: Record<string, unknown> = {}, credentials: Record<string, string> = {}) {
    this.config = {
      endpointUrl: (config.endpointUrl as string) || "",
      method: (config.method as "GET" | "POST") || "GET",
      headers: (config.headers as Record<string, string>) || {},
      pageParam: (config.pageParam as string) || "page",
      pageSizeParam: (config.pageSizeParam as string) || "limit",
      pageSize: (config.pageSize as number) || 50,
      countryHint: (config.countryHint as string) || "TZ",
      sourceSystemId: (config.sourceSystemId as string) || "generic_api",
      entityType: (config.entityType as GenericRestConfig["entityType"]) || "ticket",
      recordsPath: (config.recordsPath as string) || "",
      providerProfile: (config.providerProfile as string) || "generic",
      fieldMapping: (config.fieldMapping as FieldMapping) || {},
    };
    this.credentials = credentials;
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
    };

    if (this.credentials.apiKey) {
      headers["X-API-Key"] = this.credentials.apiKey;
    } else if (this.credentials.token) {
      headers["Authorization"] = `Bearer ${this.credentials.token}`;
    } else if (this.credentials.username && this.credentials.password) {
      const basic = Buffer.from(
        `${this.credentials.username}:${this.credentials.password}`,
      ).toString("base64");
      headers["Authorization"] = `Basic ${basic}`;
    }

    return headers;
  }

  public async validateConnection(): Promise<ConnectionResult> {
    if (!this.config.endpointUrl) {
      return { success: false, message: "Missing endpoint URL in configuration." };
    }

    try {
      const endpoint = await assertSafeExternalEndpoint(this.config.endpointUrl);
      const res = await fetch(endpoint, {
        method: this.config.method,
        headers: this.buildHeaders(),
      });

      if (!res.ok) {
        return {
          success: false,
          errorCode: String(res.status),
          message: `Endpoint responded with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      return {
        success: true,
        message: "Successfully connected to generic API endpoint.",
        supportedCapabilities: ["batch_read", "cursor_pagination"],
      };
    } catch (err) {
      return {
        success: false,
        message: `Network connection failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async fetchRecords(cursor?: string): Promise<ConnectorBatch> {
    const page = cursor ? Number.parseInt(cursor, 10) : 1;
    const url = await assertSafeExternalEndpoint(this.config.endpointUrl || "");
    url.searchParams.set(this.config.pageParam || "page", String(page));
    url.searchParams.set(this.config.pageSizeParam || "limit", String(this.config.pageSize || 50));

    try {
      const res = await fetch(url.toString(), {
        method: this.config.method,
        headers: this.buildHeaders(),
      });

      if (!res.ok) {
        throw new Error(`External API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const selected = this.config.recordsPath ? getPath(data, this.config.recordsPath) : data;
      const selectedObject = selected && typeof selected === "object" ? selected as Record<string, unknown> : {};
      const rawRecords: unknown[] = Array.isArray(selected)
        ? selected
        : Array.isArray(selectedObject.items) ? selectedObject.items
        : Array.isArray(selectedObject.records) ? selectedObject.records
        : Array.isArray(selectedObject.data) ? selectedObject.data
        : [selected];

      const records = rawRecords.map((item, idx) => {
        const castItem = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const extId = String(getPath(castItem, this.config.fieldMapping?.id || "id") || castItem.externalId || `ext-${page}-${idx}`);
        return {
          externalId: extId,
          entityType: this.config.entityType || "ticket",
          raw: item,
          timestamp: (castItem.created_at as string) || new Date().toISOString(),
        };
      });

      const hasMore = records.length >= (this.config.pageSize || 50);

      return {
        records,
        nextCursor: hasMore ? String(page + 1) : undefined,
        hasMore,
        totalEstimated: records.length,
      };
    } catch (err) {
      throw new Error(`Failed to fetch records: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public async normalizeRecord(record: unknown): Promise<CanonicalRecord> {
    const cast = (record && typeof record === "object" ? record : {}) as Record<string, unknown>;
    if (this.config.entityType === "product" || this.config.entityType === "service") {
      const mapping = this.config.fieldMapping || {};
      const externalReference = String(getPath(cast, mapping.id || "id") || "").trim();
      const name = String(getPath(cast, mapping.name || "name") || "").trim();
      if (!externalReference || !name) throw new Error("Catalogue records require mapped ID and name values.");
      const activeValue = getPath(cast, mapping.active || "active");
      return { entityType: "catalogue_item", payload: {
        externalReference,
        kind: this.config.entityType,
        name,
        description: stringValue(getPath(cast, mapping.description || "description")),
        sku: stringValue(getPath(cast, mapping.sku || "sku")),
        serviceAreaName: stringValue(getPath(cast, mapping.serviceArea || "category")),
        active: activeValue === undefined ? true : ![false, 0, "0", "false", "inactive"].includes(activeValue as never),
        sourceSystemId: this.config.sourceSystemId || "generic_rest",
        metadata: { source: "integration" },
      }};
    }
    if (this.config.entityType === "call") {
      const mapping = this.config.fieldMapping || {};
      const externalId = String(getPath(cast, mapping.id || "id") || "").trim();
      let recordingUrl = String(getPath(cast, mapping.recordingUrl || "recording_url") || "").trim();
      if (this.config.providerProfile === "twilio" && recordingUrl.startsWith("/")) {
        recordingUrl = `https://api.twilio.com${recordingUrl.replace(/\.json(?:\?.*)?$/, ".mp3")}`;
      }
      if (!externalId || !recordingUrl) throw new Error("Telephony records require mapped ID and recording URL values.");
      const startedAt = String(getPath(cast, mapping.startedAt || "started_at") || new Date().toISOString());
      const rawDirection = String(getPath(cast, mapping.direction || "direction") || "inbound").toLowerCase();
      const direction = rawDirection === "outbound" || rawDirection === "internal" ? rawDirection : "inbound";
      return { entityType: "interaction", payload: {
        externalId,
        externalReference: externalId,
        interactionType: "call",
        channel: "voice",
        direction,
        sourceSystemId: this.config.sourceSystemId || "telephony_api",
        agentName: stringValue(getPath(cast, mapping.agentName || "agent.name")),
        startedAt,
        durationSeconds: numberValue(getPath(cast, mapping.durationSeconds || "duration_seconds")),
        customer: {
          externalId: String(getPath(cast, mapping.customerId || "customer.id") || getPath(cast, mapping.callerPhone || "caller_phone") || externalId),
          phone: stringValue(getPath(cast, mapping.callerPhone || "caller_phone")) || null,
        },
        rawPayload: cast,
        metadata: { source: "telephony_api", recordingUrl },
      }};
    }
    return normalizeTicketToInteraction(
      cast as unknown as RawTicketRecord,
      this.config.sourceSystemId || "generic_rest",
      this.config.countryHint || "TZ",
    );
  }

  public async healthCheck(): Promise<ConnectionHealth> {
    const start = Date.now();
    try {
      const res = await this.validateConnection();
      return {
        healthy: res.success,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        statusMessage: res.message,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        statusMessage: err instanceof Error ? err.message : "Health check failed",
      };
    }
  }

  public async disconnect(): Promise<void> {
    // Stateless HTTP client; cleanup completed
    return Promise.resolve();
  }
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
