/**
 * Zetro Universal Integration Hub — Canonical Normalization Pipeline
 * Converts raw source system records into standard Zetro canonical models.
 * Follows CTO Specification Section 8 & Section 21 (Evidence and Explainability).
 */

import {
  type CanonicalCustomerPayload,
  type CanonicalInteractionPayload,
  type CanonicalOperationalEntityPayload,
  type CanonicalRecord,
  type ProvenanceType,
} from "./connector-interface";
import { normalizePhoneNumber } from "@/lib/customer-identity";

export interface RawTicketRecord {
  id: string | number;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  solved_at?: string;
  channel?: string;
  recipient?: string;
  requester?: {
    id?: string | number;
    name?: string;
    email?: string;
    phone?: string;
    external_id?: string;
    organization?: string;
  };
  assignee?: {
    id?: string | number;
    name?: string;
    email?: string;
    department?: string;
  };
  custom_fields?: Record<string, unknown>;
  comments?: Array<{
    id: string | number;
    author_id: string | number;
    author_name?: string;
    body: string;
    is_public?: boolean;
    created_at?: string;
  }>;
}

/**
 * Normalizes a standard support ticket record (e.g. Zendesk, Freshdesk, CRM case)
 * into a CanonicalInteractionPayload.
 */
export function normalizeTicketToInteraction(
  rawTicket: RawTicketRecord,
  sourceSystemId: string = "external_ticketing",
  countryHint: string = "TZ",
): CanonicalRecord {
  const ticketIdStr = String(rawTicket.id);
  const startedAt = rawTicket.created_at
    ? new Date(rawTicket.created_at).toISOString()
    : new Date().toISOString();
  const endedAt = rawTicket.solved_at ? new Date(rawTicket.solved_at).toISOString() : undefined;

  // Normalize customer identity
  const req = rawTicket.requester || {};
  const rawPhone = req.phone || "";
  const normPhone = rawPhone ? normalizePhoneNumber(rawPhone, countryHint) : null;

  const customer: CanonicalCustomerPayload = {
    externalId: String(req.external_id || req.id || req.email || ticketIdStr),
    displayName: req.name || req.email || (normPhone?.e164 ? normPhone.e164 : `Customer #${ticketIdStr}`),
    customerType: req.organization ? "business" : "individual",
    phone: normPhone?.valid && normPhone.e164 ? normPhone.e164 : rawPhone || null,
    email: req.email || null,
    accountNumber: (rawTicket.custom_fields?.account_number as string) || null,
    crmId: (rawTicket.custom_fields?.crm_id as string) || null,
    profileAttributes: {
      organization: req.organization || null,
      source_system: sourceSystemId,
    },
  };

  // Compile evidence excerpts from ticket body and comments
  const evidenceExcerpts: Array<{
    excerpt: string;
    provenance: ProvenanceType;
    evidenceType: string;
    confidence: number;
  }> = [];

  if (rawTicket.description) {
    evidenceExcerpts.push({
      excerpt: rawTicket.description.slice(0, 500),
      provenance: "CUSTOMER_STATEMENT",
      evidenceType: "ticket_event",
      confidence: 1.0,
    });
  }

  if (rawTicket.status) {
    evidenceExcerpts.push({
      excerpt: `System ticket status: ${rawTicket.status} (priority: ${rawTicket.priority || "normal"})`,
      provenance: "SYSTEM_FACT",
      evidenceType: "system_event",
      confidence: 1.0,
    });
  }

  if (Array.isArray(rawTicket.comments)) {
    for (const comment of rawTicket.comments.slice(0, 5)) {
      if (!comment.body) continue;
      const isCustomer =
        String(comment.author_id) === String(req.id) ||
        (comment.author_name && comment.author_name.toLowerCase().includes("customer"));
      evidenceExcerpts.push({
        excerpt: `${comment.author_name || "Author"}: ${comment.body.slice(0, 300)}`,
        provenance: isCustomer ? "CUSTOMER_STATEMENT" : "EMPLOYEE_STATEMENT",
        evidenceType: "ticket_event",
        confidence: 0.95,
      });
    }
  }

  const payload: CanonicalInteractionPayload = {
    externalId: ticketIdStr,
    interactionType: "support_ticket",
    channel: rawTicket.channel || "web_portal",
    direction: "inbound",
    sourceSystemId,
    externalReference: ticketIdStr,
    agentExternalId: rawTicket.assignee?.id ? String(rawTicket.assignee.id) : undefined,
    agentName: rawTicket.assignee?.name || undefined,
    teamId: rawTicket.assignee?.department || undefined,
    startedAt,
    endedAt,
    language: "sw",
    summary: rawTicket.subject || rawTicket.description?.slice(0, 150) || `Ticket #${ticketIdStr}`,
    customer,
    rawPayload: rawTicket as unknown as Record<string, unknown>,
    metadata: {
      status: rawTicket.status,
      priority: rawTicket.priority,
      custom_fields: rawTicket.custom_fields || {},
    },
    initialIssue: {
      categoryCode: (rawTicket.custom_fields?.category as string) || "customer_service",
      title: rawTicket.subject || `Issue in ticket #${ticketIdStr}`,
      description: rawTicket.description,
      priority: (rawTicket.priority as "low" | "medium" | "high" | "critical") || "medium",
    },
    evidenceExcerpts,
  };

  return {
    entityType: "interaction",
    payload,
  };
}

/**
 * Normalizes an operational agent/technician/partner entity.
 */
export function normalizeOperationalEntity(
  rawEntity: {
    id: string | number;
    name: string;
    type?: string;
    department?: string;
    provider?: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  },
): CanonicalOperationalEntityPayload {
  const typeMap: Record<string, CanonicalOperationalEntityPayload["entityType"]> = {
    agent: "agent",
    employee: "employee",
    technician: "technician",
    service_provider: "service_provider",
    contractor: "contractor",
    supplier: "supplier",
    team: "team",
    system: "technical_system",
  };

  const entityType = (rawEntity.type && typeMap[rawEntity.type.toLowerCase()]) || "employee";

  return {
    externalReference: String(rawEntity.id),
    entityType,
    displayName: rawEntity.name,
    department: rawEntity.department,
    providerId: rawEntity.provider,
    contactInfo: {
      email: rawEntity.email,
      phone: rawEntity.phone,
    },
    activeStatus: true,
    metadata: rawEntity.metadata || {},
  };
}

