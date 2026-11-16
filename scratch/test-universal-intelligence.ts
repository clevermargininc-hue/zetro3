/**
 * End-to-End Verification Test for ZETRO Universal Customer Intelligence
 * Tests:
 * 1. Country-aware Phone Normalization (+255712345678, 0712345678, 255712345678)
 * 2. Connector Registry & Zendesk Tickets Connector
 * 3. Normalization Pipeline (Raw Ticket -> Canonical Interaction -> Evidence Excerpts)
 * 4. Field Mapping Engine (Transformations, enum mapping, json path)
 * 5. Industry Configuration Engine (Layer B templates)
 */

import { normalizePhoneNumber } from "../src/lib/customer-identity";
import { connectorRegistry } from "../src/lib/integrations/core/connector-registry";
import {
  transformExternalRecord,
  type FieldMappingRule,
} from "../src/lib/integrations/core/field-mapping";
import { getIndustryProfile, buildIndustryAiPromptAddendum } from "../src/lib/industry-configuration";

async function runTests() {
  console.log("=================================================");
  console.log("ZETRO CUSTOMER INTELLIGENCE ARCHITECTURE TESTS");
  console.log("=================================================\n");

  // TEST 1: Phone Normalization (TZ country-aware)
  console.log("[TEST 1] Tanzanian Phone Number Normalization:");
  const testNumbers = ["0712345678", "+255712345678", "255712345678", "0784992114"];
  const expectedE164 = ["+255712345678", "+255712345678", "+255712345678", "+255784992114"];

  testNumbers.forEach((raw, i) => {
    const res = normalizePhoneNumber(raw, "TZ");
    const ok = res.valid && res.e164 === expectedE164[i];
    console.log(`  ${ok ? "PASS" : "FAIL"}: '${raw}' -> '${res.e164}' (Expected: '${expectedE164[i]}')`);
    if (!ok) throw new Error(`Phone normalization failed for ${raw}`);
  });

  // TEST 2: Connector Registry & Zendesk Connector
  console.log("\n[TEST 2] Connector Registry Verification:");
  const providers = connectorRegistry.listProviders();
  console.log(`  Registered providers count: ${providers.length}`);
  providers.forEach((p) => {
    console.log(`  - Provider: ${p.provider} (${p.name}), Category: ${p.category}`);
  });
  if (providers.length < 3) throw new Error("Expected at least 3 registered providers");

  console.log("\n[TEST 3] Zendesk Connector Instantiation & Record Fetching:");
  const zendesk = connectorRegistry.createConnector("zendesk_tickets", {
    subdomain: "sandbox",
    countryHint: "TZ",
  });

  const connResult = await zendesk.validateConnection();
  console.log(`  Connection test: ${connResult.success ? "PASS" : "FAIL"} (${connResult.message})`);
  if (!connResult.success) throw new Error("Connection validation failed");

  const batch = await zendesk.fetchRecords();
  console.log(`  Batch fetch: Retrieved ${batch.records.length} tickets from sandbox`);
  if (batch.records.length === 0) throw new Error("Expected sandbox records");

  // TEST 4: Normalization Pipeline
  console.log("\n[TEST 4] Canonical Normalization Pipeline:");
  const firstRecord = batch.records[0];
  const canonical = await zendesk.normalizeRecord(firstRecord.raw);
  console.log(`  Entity type: ${canonical.entityType}`);
  if (canonical.entityType !== "interaction") throw new Error("Expected interaction entity");

  const payload = canonical.payload;
  console.log(`  Interaction externalId: ${payload.externalId}`);
  console.log(`  Channel: ${payload.channel}`);
  console.log(`  Customer display: ${payload.customer.displayName}`);
  console.log(`  Customer normalized phone: ${payload.customer.phone}`);
  console.log(`  Evidence excerpts count: ${payload.evidenceExcerpts?.length}`);

  payload.evidenceExcerpts?.forEach((ev, idx) => {
    console.log(`    [Evidence ${idx + 1}] Provenance: [${ev.provenance}], Type: ${ev.evidenceType}`);
    console.log(`      Excerpt: "${ev.excerpt}"`);
  });

  // TEST 5: Field Mapping Engine
  console.log("\n[TEST 5] Declarative Field Mapping Engine:");
  const externalData = {
    ticket: {
      number: 89123,
      user_phone: "0755123456",
      state: "RESOLVED",
      created_epoch: "2026-10-31T12:00:00Z",
    },
  };

  const rules: FieldMappingRule[] = [
    {
      externalField: "ticket.number",
      canonicalField: "externalReference",
      transformationRule: "direct_copy",
      isRequired: true,
    },
    {
      externalField: "ticket.user_phone",
      canonicalField: "customerPhone",
      transformationRule: "phone_normalize",
      isRequired: true,
    },
    {
      externalField: "ticket.state",
      canonicalField: "status",
      transformationRule: "enum_map",
      enumMap: {
        resolved: "closed",
        open: "in_progress",
      },
    },
  ];

  const transformed = transformExternalRecord(externalData, rules, "TZ");
  console.log(`  Transformed canonical fields:`, transformed.canonical);
  console.log(`  Errors:`, transformed.errors);
  if (transformed.canonical.customerPhone !== "+255755123456") {
    throw new Error(`Phone mapping failed: ${transformed.canonical.customerPhone}`);
  }
  if (transformed.canonical.status !== "closed") {
    throw new Error(`Enum mapping failed: ${transformed.canonical.status}`);
  }

  // TEST 6: Industry Configuration Engine
  console.log("\n[TEST 6] Industry Configuration Engine:");
  const industries = ["telecom", "banking", "insurance", "logistics", "retail_ecommerce", "utilities"];
  industries.forEach((ind) => {
    const profile = getIndustryProfile(ind);
    console.log(`  - Industry: ${profile.name} (Categories: ${profile.sampleCategories.length}, KPIs: ${profile.defaultKpis.join(", ")})`);
  });

  const telecomPrompt = buildIndustryAiPromptAddendum("telecom");
  console.log(`  Prompt addendum generated (${telecomPrompt.length} chars)`);

  console.log("\n=================================================");
  console.log("ALL 6 ARCHITECTURE & INTEGRATION TESTS PASSED!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

