import test from "node:test";
import assert from "node:assert/strict";
import { BRAND_CATALOGUE_META, resolveBrandKey } from "@/lib/brand-icons";
import { sortAndSummarizeIntegrations } from "@/lib/company-intelligence-utils";

test("resolveBrandKey accurately identifies Amazon Connect and telephony/CRM providers", () => {
  assert.equal(
    resolveBrandKey({ provider: "generic_rest", providerProfile: "amazon_connect", name: "My Contact Center" }),
    "amazon_connect",
  );
  assert.equal(
    resolveBrandKey({ provider: "generic_rest", name: "Amazon Connect Dar" }),
    "amazon_connect",
  );
  assert.equal(
    resolveBrandKey({ provider: "generic_rest", sourceSystemId: "twilio", name: "Voice API" }),
    "twilio",
  );
  assert.equal(resolveBrandKey({ provider: "zendesk_tickets" }), "zendesk");
  assert.equal(resolveBrandKey({ name: "Genesys Cloud TZ" }), "genesys");
  assert.equal(resolveBrandKey({ name: "Cisco Webex Contact Center" }), "webex");
  assert.equal(resolveBrandKey({ name: "Avaya Aura" }), "avaya");
  assert.equal(resolveBrandKey({ channel: "whatsapp" }), "whatsapp");
  assert.equal(resolveBrandKey({ provider: "webhook" }), "webhook");
  assert.equal(resolveBrandKey({ provider: "generic_rest", name: "Custom ERP Feed" }), "generic");
});

test("BRAND_CATALOGUE_META defines colors and labels for every resolved brand", () => {
  assert.equal(BRAND_CATALOGUE_META.amazon_connect.label, "Amazon Connect");
  assert.equal(BRAND_CATALOGUE_META.amazon_connect.badgeBg, "#232F3E");
  assert.equal(BRAND_CATALOGUE_META.amazon_connect.accentColor, "#FF9900");
  assert.equal(BRAND_CATALOGUE_META.whatsapp.accentColor, "#25D366");
});

test("sortAndSummarizeIntegrations preserves providerProfile and sourceSystemId for BrandIcon resolution", () => {
  const summary = sortAndSummarizeIntegrations([
    {
      id: "int-ac",
      name: "East Africa Voice",
      provider: "generic_rest",
      integration_type: "telephony_rest",
      connection_status: "active",
      configuration: {
        entityType: "call",
        providerProfile: "amazon_connect",
        sourceSystemId: "amazon_connect",
      },
      integration_sync_runs: [],
    },
  ]);

  assert.equal(summary[0].providerProfile, "amazon_connect");
  assert.equal(summary[0].sourceSystemId, "amazon_connect");
  assert.equal(
    resolveBrandKey({
      provider: summary[0].provider,
      providerProfile: summary[0].providerProfile,
      sourceSystemId: summary[0].sourceSystemId,
      name: summary[0].name,
      integrationType: summary[0].integrationType,
    }),
    "amazon_connect",
  );
});

