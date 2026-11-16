/**
 * Zetro Universal Integration Hub — Core Connector Interface
 * Defines standard contracts for generic and prebuilt system connectors.
 * Follows CTO Specification Section 7.3.
 */

export interface ConnectionResult {
  success: boolean;
  message?: string;
  authenticatedAs?: string;
  supportedCapabilities?: string[];
  errorCode?: string;
}

export interface ConnectionHealth {
  healthy: boolean;
  latencyMs?: number;
  lastCheckedAt: string;
  statusMessage?: string;
}

export interface ExternalRecordItem {
  externalId: string;
  entityType: "interaction" | "call" | "customer" | "ticket" | "entity" | "event" | "product" | "service";
  raw: unknown;
  timestamp: string;
}

export interface ConnectorBatch {
  records: ExternalRecordItem[];
  nextCursor?: string;
  hasMore: boolean;
  totalEstimated?: number;
}

export type ProvenanceType =
  | "SYSTEM_FACT"
  | "CUSTOMER_STATEMENT"
  | "EMPLOYEE_STATEMENT"
  | "AI_INFERENCE"
  | "HUMAN_DECISION";

export interface CanonicalCustomerPayload {
  externalId: string;
  displayName?: string;
  customerType?: "individual" | "business" | "unknown";
  phone?: string | null;
  email?: string | null;
  accountNumber?: string | null;
  crmId?: string | null;
  profileAttributes?: Record<string, unknown>;
}

export interface CanonicalInteractionPayload {
  externalId: string;
  interactionType:
    | "call"
    | "email"
    | "chat"
    | "whatsapp"
    | "support_ticket"
    | "branch_visit"
    | "service_request"
    | "complaint"
    | "other";
  channel: string;
  direction: "inbound" | "outbound" | "internal";
  sourceSystemId: string;
  externalReference?: string;
  agentExternalId?: string;
  agentName?: string;
  teamId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  language?: string;
  summary?: string;
  customer: CanonicalCustomerPayload;
  rawPayload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  initialIssue?: {
    categoryCode?: string;
    title?: string;
    description?: string;
    symptoms?: string[];
    priority?: "low" | "medium" | "high" | "critical";
  };
  evidenceExcerpts?: Array<{
    excerpt: string;
    provenance: ProvenanceType;
    evidenceType: string;
    confidence?: number;
  }>;
}

export interface CanonicalOperationalEntityPayload {
  externalReference: string;
  entityType:
    | "agent"
    | "employee"
    | "team"
    | "department"
    | "contractor"
    | "supplier"
    | "service_provider"
    | "technician"
    | "product"
    | "service"
    | "asset"
    | "technical_system"
    | "location";
  displayName: string;
  department?: string;
  providerId?: string;
  contactInfo?: Record<string, unknown>;
  activeStatus?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CanonicalCatalogueItemPayload {
  externalReference: string;
  kind: "product" | "service";
  name: string;
  description?: string;
  sku?: string;
  serviceAreaName?: string;
  active: boolean;
  sourceSystemId: string;
  metadata?: Record<string, unknown>;
}

export type CanonicalRecord =
  | {
      entityType: "interaction";
      payload: CanonicalInteractionPayload;
    }
  | {
      entityType: "customer";
      payload: CanonicalCustomerPayload;
    }
  | {
      entityType: "operational_entity";
      payload: CanonicalOperationalEntityPayload;
    }
  | {
      entityType: "catalogue_item";
      payload: CanonicalCatalogueItemPayload;
    };

export interface ZetroConnector {
  readonly provider: string;
  readonly integrationType: string;

  validateConnection(): Promise<ConnectionResult>;

  fetchRecords(cursor?: string): Promise<ConnectorBatch>;

  normalizeRecord(record: unknown): Promise<CanonicalRecord>;

  subscribeToEvents?(): Promise<void>;

  healthCheck(): Promise<ConnectionHealth>;

  disconnect(): Promise<void>;
}

