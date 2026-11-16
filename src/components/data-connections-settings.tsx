"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Briefcase, Check, Package, PhoneCall } from "lucide-react";
import { BrandIcon, IntegrationBrandIcon } from "@/components/brand-icon";
import type { BrandKey } from "@/lib/brand-icons";

type SyncRun = {
  started_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  records_processed?: number | null;
  error_summary?: string | null;
};

type Integration = {
  id: string;
  name: string;
  provider: string;
  integration_type: string;
  connection_status: string;
  last_sync_at?: string | null;
  webhookPath?: string;
  configuration?: { entityType?: string; sourceSystemId?: string; providerProfile?: string };
  integration_sync_runs?: SyncRun[];
};

type PhoneProvider =
  | "generic"
  | "amazon_connect"
  | "twilio"
  | "genesys"
  | "avaya"
  | "webex"
  | "asterisk"
  | "3cx";

const PHONE_PROVIDERS: Array<{
  id: PhoneProvider;
  brand: BrandKey;
  name: string;
  detail: string;
  auth: "none" | "token" | "apiKey" | "basic";
}> = [
  { id: "amazon_connect", brand: "amazon_connect", name: "Amazon Connect", detail: "Contact records and S3 recording links through your API gateway.", auth: "token" },
  { id: "twilio", brand: "twilio", name: "Twilio Voice", detail: "Voice recordings API using Account SID and API secret.", auth: "basic" },
  { id: "genesys", brand: "genesys", name: "Genesys Cloud", detail: "Conversation and recording export through an OAuth API gateway.", auth: "token" },
  { id: "webex", brand: "webex", name: "Cisco Webex CC", detail: "Contact-center recording export through a secured API.", auth: "token" },
  { id: "avaya", brand: "avaya", name: "Avaya", detail: "Call-detail and recording API exposed by your Avaya environment.", auth: "token" },
  { id: "asterisk", brand: "asterisk", name: "Asterisk / FreePBX", detail: "AMI/ARI or CDR recording feed from your SIP PBX server.", auth: "token" },
  { id: "3cx", brand: "3cx", name: "3CX Phone System", detail: "Recording export API and call metadata webhook from 3CX.", auth: "token" },
  { id: "generic", brand: "generic", name: "Generic REST API", detail: "Any HTTPS API that returns call records and recording URLs.", auth: "token" },
];

const ECOSYSTEM_BRANDS: BrandKey[] = [
  "amazon_connect",
  "twilio",
  "genesys",
  "webex",
  "avaya",
  "asterisk",
  "3cx",
  "zendesk",
  "salesforce",
  "hubspot",
  "freshdesk",
  "whatsapp",
  "webhook",
];

export function DataConnectionsSettings({
  embedded = false,
  onOpenCatalogue,
  onConnectionsChanged,
}: {
  embedded?: boolean;
  onOpenCatalogue?: () => void;
  onConnectionsChanged?: () => void;
} = {}) {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error?: boolean; text: string } | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [kind, setKind] = useState<"call" | "product" | "service">("call");
  const [phoneProvider, setPhoneProvider] = useState<PhoneProvider>("generic");
  const [authType, setAuthType] = useState("token");

  const providerProfile = PHONE_PROVIDERS.find((item) => item.id === phoneProvider) || PHONE_PROVIDERS[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/customer-intelligence/integrations", { cache: "no-store" });
      const json = await response.json();
      setItems(json.integrations || []);
      setMigrationRequired(Boolean(json.migrationRequired));
      setCanManage(Boolean(json.canManage));
      if (!response.ok) {
        setMessage({ error: true, text: json.error || "Could not load integrations." });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = event.currentTarget;
    const value = new FormData(form);
    const auth = String(value.get("authType"));
    const secret = String(value.get("secret") || "");
    const credentials =
      auth === "apiKey"
        ? { apiKey: secret }
        : auth === "token"
          ? { token: secret }
          : auth === "basic"
            ? { username: String(value.get("username") || ""), password: String(value.get("password") || "") }
            : {};

    const twilio = kind === "call" && phoneProvider === "twilio";
    const mapping = {
      id: String(value.get("idPath") || (twilio ? "sid" : "id")),
      name: String(value.get("namePath") || "name"),
      description: String(value.get("descriptionPath") || "description"),
      active: String(value.get("activePath") || "active"),
      sku: String(value.get("skuPath") || "sku"),
      serviceArea: String(value.get("serviceAreaPath") || "category"),
      recordingUrl: String(value.get("recordingUrlPath") || (twilio ? "uri" : "recording_url")),
      callerPhone: String(value.get("callerPhonePath") || "caller_phone"),
      customerId: String(value.get("customerIdPath") || (twilio ? "call_sid" : "customer.id")),
      agentName: String(value.get("agentNamePath") || "agent.name"),
      startedAt: String(value.get("startedAtPath") || (twilio ? "date_created" : "started_at")),
      durationSeconds: String(value.get("durationPath") || (twilio ? "duration" : "duration_seconds")),
      direction: String(value.get("directionPath") || "direction"),
    };

    const response = await fetch("/api/customer-intelligence/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(value.get("name")),
        provider: "generic_rest",
        integrationType: kind === "call" ? "telephony_rest" : "catalogue_rest",
        configuration: {
          endpointUrl: String(value.get("endpointUrl")),
          method: "GET",
          entityType: kind,
          recordsPath: String(value.get("recordsPath") || ""),
          sourceSystemId: String(value.get("sourceSystemId") || (kind === "call" ? phoneProvider : "company_api")),
          providerProfile: kind === "call" ? phoneProvider : undefined,
          fieldMapping: mapping,
        },
        credentials,
      }),
    });

    const json = await response.json();
    setMessage(
      response.ok
        ? {
            text:
              kind === "call"
                ? `${providerProfile.name} API connected. Run Sync now to import recordings into Calls & Customer Intelligence.`
                : "Catalogue API connected. Run Sync now to populate your Company Catalogue.",
          }
        : { error: true, text: json.error || "Could not save connection." },
    );
    if (response.ok) {
      form.reset();
      setShowForm(false);
      await load();
      onConnectionsChanged?.();
    }
    setSaving(false);
  }

  async function sync(item: Integration) {
    setBusyId(item.id);
    setMessage({ text: `Synchronizing ${item.name}…` });
    const response = await fetch(`/api/customer-intelligence/integrations/${item.id}/sync`, {
      method: "POST",
    });
    const json = await response.json();
    if (response.ok) {
      const entityType = item.configuration?.entityType;
      setMessage({
        text: `Sync complete (${item.name}): ${json.result.recordsProcessed} processed, ${json.result.recordsFailed} failed.${
          entityType === "product" || entityType === "service"
            ? " Company Catalogue updated."
            : " Recordings and customer interactions imported."
        }`,
      });
    } else {
      setMessage({ error: true, text: json.error || "Sync failed." });
    }
    await load();
    onConnectionsChanged?.();
    setBusyId(null);
  }

  async function testConnection(id: string) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/customer-intelligence/integrations/${id}`, { method: "POST" });
    const json = await res.json();
    setMessage({ error: !res.ok, text: json.message || json.error || "Connection tested." });
    await load();
    onConnectionsChanged?.();
    setBusyId(null);
  }

  async function togglePause(item: Integration) {
    setBusyId(item.id);
    const nextStatus = item.connection_status === "paused" ? "active" : "paused";
    const res = await fetch(`/api/customer-intelligence/integrations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionStatus: nextStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ error: true, text: json.error || "Could not update connection." });
    } else {
      setMessage({ text: `${item.name} is now ${nextStatus}.` });
    }
    await load();
    onConnectionsChanged?.();
    setBusyId(null);
  }

  async function removeIntegration(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/customer-intelligence/integrations/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ error: true, text: json.error || "Could not remove connection." });
    } else {
      setMessage({ text: "Connection removed. Previously synced catalogue items and calls are preserved." });
    }
    setConfirmDeleteId(null);
    await load();
    onConnectionsChanged?.();
    setBusyId(null);
  }

  return (
    <section className="space-y-6">
      <div className="surface overflow-hidden">
        {!embedded ? (
          <div className="bg-[#0A1A3F] px-6 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Integration hub</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Systems &amp; sync</h2>
          </div>
        ) : null}

        <div className="p-6">
          {migrationRequired ? (
            <div className="alert-info mb-5">Apply the integration migration before saving connections.</div>
          ) : null}
          {message ? (
            <div className={message.error ? "alert-error mb-5" : "alert-ok mb-5"} role="status">
              {message.text}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0A1A3F]">Connected systems</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5A6882]">
                Pull call recordings into Calls &amp; Customer Intelligence, or keep your Products,
                Services, and Service Areas synced from a read-only REST API.
              </p>
            </div>
            {canManage && !migrationRequired ? (
              <button
                type="button"
                className="btn btn-blue shrink-0"
                onClick={() => setShowForm((v) => !v)}
              >
                {showForm ? "Close setup" : "+ Connect system"}
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Connections" value={loading ? "—" : String(items.length)} />
            <Metric
              label="Healthy"
              value={loading ? "—" : String(items.filter((i) => i.connection_status === "active").length)}
            />
            <Metric label="Access model" value="Read only + Encrypted" />
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const latestRun = item.integration_sync_runs?.[0];
              const isBusy = busyId === item.id;
              const statusTone =
                item.connection_status === "active"
                  ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                  : item.connection_status === "failing"
                    ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                    : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]";

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#E3E9F5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 flex items-start gap-3">
                    <IntegrationBrandIcon
                      provider={item.provider}
                      providerProfile={item.configuration?.providerProfile}
                      sourceSystemId={item.configuration?.sourceSystemId}
                      name={item.name}
                      integrationType={item.integration_type}
                      size={24}
                      variant="badge"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-semibold text-[#0A1A3F]">{item.name}</strong>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
                          {item.connection_status}
                        </span>
                        <span className="rounded-full border border-[#E3E9F5] bg-[#F8FAFF] px-2 py-0.5 text-[11px] font-medium text-[#5A6882]">
                          {item.configuration?.entityType === "call"
                            ? "Telephony recordings"
                            : item.configuration?.entityType === "product"
                              ? "Product catalogue"
                              : item.configuration?.entityType === "service"
                                ? "Service catalogue"
                                : "Ticket interactions"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5A6882]">
                        {item.last_sync_at
                          ? `Last synced ${new Date(item.last_sync_at).toLocaleString()}`
                          : "Ready for first sync"}
                        {latestRun?.status
                          ? ` · Latest run: ${latestRun.status} (${latestRun.records_processed ?? 0} processed)`
                          : ""}
                      </p>
                      {item.webhookPath ? (
                        <p className="mt-1 truncate font-mono text-[11px] text-[#5A6882]">
                          Webhook: {item.webhookPath}
                        </p>
                      ) : null}
                      {latestRun?.error_summary ? (
                        <p className="mt-1.5 text-xs text-[#B91C1C]">{latestRun.error_summary}</p>
                      ) : null}
                    </div>
                  </div>

                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void testConnection(item.id)}
                        className="rounded-lg border border-[#E3E9F5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0A1A3F] hover:bg-[#F8FAFF] disabled:opacity-50"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || item.connection_status === "paused"}
                        onClick={() => void sync(item)}
                        className="btn btn-blue px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {isBusy ? "Running…" : "Sync now"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void togglePause(item)}
                        className="rounded-lg border border-[#E3E9F5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5A6882] hover:text-[#0A1A3F] disabled:opacity-50"
                      >
                        {item.connection_status === "paused" ? "Resume" : "Pause"}
                      </button>
                      {confirmDeleteId === item.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void removeIntegration(item.id)}
                            className="rounded-lg bg-[#DC2626] px-2.5 py-1.5 text-xs font-semibold text-white"
                          >
                            Confirm delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs text-[#5A6882]"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="rounded-lg border border-[#FECACA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {!loading && !items.length && !migrationRequired ? (
              <p className="rounded-xl border border-dashed border-[#E3E9F5] bg-[#F8FAFF] p-6 text-center text-sm text-[#5A6882]">
                No external API is connected yet. Connect a telephony recording API or product/service
                feed to sync automatically.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {canManage && !migrationRequired && showForm ? (
        <form onSubmit={save} className="surface space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2459E8]">HTTPS REST API</p>
            <h3 className="mt-1 font-display text-lg font-bold text-[#0A1A3F]">Connect an external system</h3>
            <p className="mt-1 text-sm text-[#5A6882]">
              Zetro validates the endpoint before saving and encrypts credentials with AES-256-GCM.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Choice
              active={kind === "call"}
              icon={<PhoneCall className="h-4 w-4 text-[#2459E8]" />}
              title="Telephony calls"
              text="Import recordings into Calls for transcription, QA audit, and Customer Intelligence."
              onClick={() => setKind("call")}
            />
            <Choice
              active={kind === "product"}
              icon={<Package className="h-4 w-4 text-[#0D9488]" />}
              title="Products"
              text="Sync products and automatically map their Service Areas into your Company Catalogue."
              onClick={() => setKind("product")}
            />
            <Choice
              active={kind === "service"}
              icon={<Briefcase className="h-4 w-4 text-[#4F46E5]" />}
              title="Services"
              text="Sync services and link Service Areas so call classification stays current."
              onClick={() => setKind("service")}
            />
          </div>

          {kind === "call" ? (
            <div>
              <p className="mb-3 text-sm font-semibold text-[#0A1A3F]">Choose your phone system</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PHONE_PROVIDERS.map((item) => (
                  <ProviderChoice
                    key={item.id}
                    brand={item.brand}
                    active={phoneProvider === item.id}
                    name={item.name}
                    detail={item.detail}
                    onClick={() => {
                      setPhoneProvider(item.id);
                      setAuthType(item.auth);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#BFDBFE] bg-[#EEF3FF] p-4 text-xs leading-5 text-[#0A1A3F]">
            <strong>Read-only:</strong> Zetro reads records from your HTTPS endpoint without modifying
            external systems. Catalogue syncs upsert updates on every run so external edits stay aligned.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="name"
              label="Connection name"
              placeholder={kind === "call" ? `${providerProfile.name} production` : "Production catalogue"}
            />
            <Field
              name="endpointUrl"
              label="HTTPS records endpoint"
              type="url"
              placeholder={
                kind === "call" && phoneProvider === "twilio"
                  ? "https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings.json"
                  : kind === "call"
                    ? "https://phone.example.com/api/calls"
                    : "https://api.example.com/products"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              key={`records-${phoneProvider}`}
              name="recordsPath"
              label="Records array path"
              defaultValue={phoneProvider === "twilio" ? "recordings" : undefined}
              placeholder={phoneProvider === "twilio" ? "recordings" : "data.items"}
              required={false}
            />
            <Field
              name="sourceSystemId"
              label="Source key"
              placeholder={kind === "call" ? phoneProvider : "erp_catalogue"}
            />
            <Select
              name="authType"
              label="Authentication"
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
              options={[
                ["none", "No authentication"],
                ["token", "Bearer token"],
                ["apiKey", "X-API-Key"],
                ["basic", "Basic authentication"],
              ]}
            />
          </div>

          {authType === "basic" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="username"
                label={phoneProvider === "twilio" ? "Account SID / API Key SID" : "API username"}
                placeholder="Stored encrypted"
              />
              <Field
                name="password"
                label={phoneProvider === "twilio" ? "Auth token / API Key secret" : "API password"}
                type="password"
                placeholder="Stored encrypted"
              />
            </div>
          ) : (
            <Field
              name="secret"
              label="API secret"
              type="password"
              placeholder="Stored encrypted"
              required={authType !== "none"}
            />
          )}

          <div>
            <button
              type="button"
              className="text-xs font-semibold text-[#2459E8]"
              onClick={() => setAdvanced((v) => !v)}
            >
              {advanced ? "Hide field mapping" : "Advanced: map JSON fields"}
            </button>
            {advanced ? (
              <div className="mt-4 grid gap-4 rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-4 sm:grid-cols-3">
                {kind === "call" ? (
                  <>
                    <Field name="idPath" label="Unique call ID" placeholder="id" required={false} />
                    <Field name="recordingUrlPath" label="Recording URL" placeholder="recording_url" required={false} />
                    <Field name="callerPhonePath" label="Caller phone" placeholder="caller_phone" required={false} />
                    <Field name="customerIdPath" label="Customer ID" placeholder="customer.id" required={false} />
                    <Field name="agentNamePath" label="Agent name" placeholder="agent.name" required={false} />
                    <Field name="startedAtPath" label="Call timestamp" placeholder="started_at" required={false} />
                    <Field name="durationPath" label="Duration seconds" placeholder="duration_seconds" required={false} />
                    <Field name="directionPath" label="Direction" placeholder="direction" required={false} />
                  </>
                ) : (
                  <>
                    <Field name="idPath" label="ID field" placeholder="id" required={false} />
                    <Field name="namePath" label="Name field" placeholder="name" required={false} />
                    <Field name="descriptionPath" label="Description" placeholder="description" required={false} />
                    <Field name="activePath" label="Active field" placeholder="active" required={false} />
                    <Field name="skuPath" label="SKU field" placeholder="sku" required={false} />
                    <Field name="serviceAreaPath" label="Service area / category" placeholder="category.name" required={false} />
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3">
            <button className="btn btn-blue" disabled={saving}>
              {saving ? "Testing endpoint…" : "Test and save"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#E3E9F5] bg-white px-4 py-2 text-xs font-semibold text-[#0A1A3F]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="surface p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-[#0A1A3F]">Connected workflow &amp; supported systems</h3>
            <p className="mt-0.5 text-xs text-[#5A6882]">Native telephony connectors, CRM/helpdesk adapters, WhatsApp, and REST/Webhook feeds.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ECOSYSTEM_BRANDS.map((brand) => (
              <BrandIcon key={brand} brand={brand} size={18} variant="badge" />
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <FlowStep
            number="1"
            title="Sync calls or catalogue"
            text="Pull call recordings + caller IDs, or upsert your active products, services, and service areas."
          />
          <FlowStep
            number="2"
            title="Store & queue securely"
            text="Audio moves into private workspace storage without duplicates; catalogue links stay current."
          />
          <FlowStep
            number="3"
            title="Enrich Customer Intelligence"
            text="Imported recordings enter QA scoring and issue tracking mapped directly to your catalogue."
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold">
          {onOpenCatalogue ? (
            <button type="button" onClick={onOpenCatalogue} className="text-[#2459E8] hover:underline">
              Open Company Catalogue →
            </button>
          ) : null}
          <Link href="/customers" className="text-[#2459E8] hover:underline">
            Open Customer Intelligence →
          </Link>
          <Link href="/calls" className="text-[#2459E8] hover:underline">
            Open Calls library →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Choice({
  active,
  icon,
  title,
  text,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active ? "border-[#2459E8] bg-[#EEF3FF]" : "border-[#E3E9F5] bg-white hover:border-[#C7D6F5]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-white border border-[#E3E9F5] shadow-2xs">
          {icon}
        </span>
        <strong className="text-sm text-[#0A1A3F]">{title}</strong>
      </span>
      <span className="mt-2 block text-xs leading-5 text-[#5A6882]">{text}</span>
    </button>
  );
}

function ProviderChoice({
  active,
  brand,
  name,
  detail,
  onClick,
}: {
  active: boolean;
  brand: BrandKey;
  name: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-xl border p-4 text-left transition ${
        active ? "border-[#2459E8] bg-[#EEF3FF] ring-1 ring-[#2459E8]/15" : "border-[#E3E9F5] bg-white hover:border-[#C7D6F5]"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 min-w-0">
          <BrandIcon brand={brand} size={22} variant="badge" />
          <strong className="truncate text-sm text-[#0A1A3F]">{name}</strong>
        </span>
        {active ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#2459E8] text-white">
            <Check className="h-3 w-3" />
          </span>
        ) : null}
      </span>
      <span className="mt-2.5 block text-xs leading-5 text-[#5A6882]">{detail}</span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6882]">{label}</p>
      <p className="mt-2 font-display text-xl font-bold text-[#0A1A3F] tabular-nums">{value}</p>
    </div>
  );
}

function Field({
  label,
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm font-medium text-[#0A1A3F]">
      {label}
      <input {...props} required={required} className="field mt-1.5 w-full" />
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[][] }) {
  return (
    <label className="block text-sm font-medium text-[#0A1A3F]">
      {label}
      <select {...props} className="field mt-1.5 w-full">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[#E3E9F5] bg-[#F8FAFF] p-4">
      <span className="grid size-6 place-items-center rounded-full bg-[#0A1A3F] text-[10px] font-bold text-white">
        {number}
      </span>
      <p className="mt-3 text-sm font-semibold text-[#0A1A3F]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#5A6882]">{text}</p>
    </div>
  );
}
