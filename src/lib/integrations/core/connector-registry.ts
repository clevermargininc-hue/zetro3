/**
 * Zetro Universal Integration Hub — Connector Registry
 * Manages available integration providers, metadata, and connector factories.
 * Follows CTO Specification Section 7.3 & 7.4.
 */

import { type ZetroConnector } from "./connector-interface";
import { GenericRestConnector } from "../connectors/generic-rest-connector";
import { ZendeskTicketsConnector } from "../connectors/zendesk-tickets-connector";

export interface ConnectorMetadata {
  provider: string;
  name: string;
  category: "crm" | "ticketing" | "erp" | "billing" | "telecom" | "generic";
  description: string;
  authMethods: Array<"api_key" | "bearer_token" | "oauth2" | "basic_auth" | "webhook_secret">;
  supportsRealtimeWebhooks: boolean;
  supportsBatchSync: boolean;
  defaultConfigSchema: Record<string, unknown>;
}

export type ConnectorFactory = (
  config: Record<string, unknown>,
  credentials?: Record<string, string>,
) => ZetroConnector;

class ConnectorRegistry {
  private metadataMap = new Map<string, ConnectorMetadata>();
  private factoryMap = new Map<string, ConnectorFactory>();

  public register(metadata: ConnectorMetadata, factory: ConnectorFactory): void {
    this.metadataMap.set(metadata.provider, metadata);
    this.factoryMap.set(metadata.provider, factory);
  }

  public getMetadata(provider: string): ConnectorMetadata | undefined {
    return this.metadataMap.get(provider);
  }

  public listProviders(): ConnectorMetadata[] {
    return Array.from(this.metadataMap.values());
  }

  public createConnector(
    provider: string,
    config: Record<string, unknown>,
    credentials?: Record<string, string>,
  ): ZetroConnector {
    const factory = this.factoryMap.get(provider);
    if (!factory) {
      throw new Error(`Integration provider '${provider}' is not registered in Zetro Connector Hub.`);
    }
    return factory(config, credentials);
  }
}

export const connectorRegistry = new ConnectorRegistry();

// Seed initial supported providers in registry
connectorRegistry.register(
  {
    provider: "generic_rest",
    name: "Generic REST API",
    category: "generic",
    description: "Connect to any external REST API endpoint via configurable JSON mapping and polling.",
    authMethods: ["api_key", "bearer_token", "basic_auth"],
    supportsRealtimeWebhooks: false,
    supportsBatchSync: true,
    defaultConfigSchema: {
      endpointUrl: "https://api.example.com/v1/records",
      method: "GET",
      pageParam: "page",
      pageSizeParam: "limit",
      pageSize: 50,
      headers: {},
    },
  },
  (config, creds) => new GenericRestConnector(config, creds),
);

connectorRegistry.register(
  {
    provider: "webhook",
    name: "Inbound Webhook",
    category: "generic",
    description: "Receive push events and tickets in real-time from external enterprise systems.",
    authMethods: ["webhook_secret"],
    supportsRealtimeWebhooks: true,
    supportsBatchSync: false,
    defaultConfigSchema: {
      signatureHeader: "x-zetro-signature",
      format: "json",
    },
  },
  (config, creds) => new GenericRestConnector(config, creds),
);

connectorRegistry.register(
  {
    provider: "zendesk_tickets",
    name: "Zendesk Support",
    category: "ticketing",
    description: "Ingest tickets, customer comments, resolution events, and agent dispatches from Zendesk.",
    authMethods: ["bearer_token", "basic_auth"],
    supportsRealtimeWebhooks: true,
    supportsBatchSync: true,
    defaultConfigSchema: {
      subdomain: "mycompany",
      statusFilter: "all",
      includeComments: true,
    },
  },
  (config, creds) => new ZendeskTicketsConnector(config, creds),
);
