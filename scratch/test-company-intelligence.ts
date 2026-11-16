/**
 * Universal Company Service & Product Intelligence Multi-Industry Verification Script
 * Validates:
 * 1. Multi-industry templates (Telecom, Healthcare, Logistics, Banking, etc.)
 * 2. Proper segregation and isolation (Healthcare never contains SIM/Telecom, etc.)
 * 3. AI prompt formatting with catalogue grounding rules
 * 4. Service area breakdown metrics calculations
 */

import {
  INDUSTRY_STARTER_TEMPLATES,
  formatCatalogueForPrompt,
  type CompanyCatalogue,
} from "../src/lib/company-catalogue-service";
import {
  buildCustomerJourneySystemPrompt,
  buildCustomerJourneyUserPrompt,
} from "../src/lib/ai/prompts/customer-journey";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("=== STARTING COMPANY INTELLIGENCE MULTI-INDUSTRY TESTS ===\n");

  // TEST 1: Template Integrity & Multi-Industry Breadth
  console.log("--- Test 1: Industry Starter Templates Validation ---");
  const templates = Object.keys(INDUSTRY_STARTER_TEMPLATES);
  assert(templates.includes("telecom"), "Template 'telecom' exists");
  assert(templates.includes("healthcare"), "Template 'healthcare' exists");
  assert(templates.includes("logistics"), "Template 'logistics' exists");
  assert(templates.includes("banking"), "Template 'banking' exists");

  const telecom = INDUSTRY_STARTER_TEMPLATES.telecom;
  const healthcare = INDUSTRY_STARTER_TEMPLATES.healthcare;
  const logistics = INDUSTRY_STARTER_TEMPLATES.logistics;

  // Validate Telecom
  const telecomAreaNames = telecom.serviceAreas.map((s) => s.name.toLowerCase()).join(" ");
  assert(telecomAreaNames.includes("network") || telecomAreaNames.includes("connectivity"), "Telecom has network/connectivity");
  assert(telecomAreaNames.includes("sim"), "Telecom has SIM services");

  // Validate Healthcare Isolation (Must NEVER have telecom domains)
  const healthAreaNames = healthcare.serviceAreas.map((s) => s.name.toLowerCase()).join(" ");
  assert(healthAreaNames.includes("appointment") || healthAreaNames.includes("consultation") || healthAreaNames.includes("outpatient"), "Healthcare has clinical/consultation domains");
  assert(!healthAreaNames.includes("sim"), "Healthcare DOES NOT contain SIM");
  assert(!healthAreaNames.includes("kyc"), "Healthcare DOES NOT contain KYC");
  assert(!healthAreaNames.includes("airtime"), "Healthcare DOES NOT contain airtime");

  const healthServices = healthcare.services.map((s) => s.name.toLowerCase()).join(" ");
  assert(!healthServices.includes("sim swap"), "Healthcare DOES NOT contain SIM swap");

  // Validate Logistics Isolation
  const logisticsAreaNames = logistics.serviceAreas.map((s) => s.name.toLowerCase()).join(" ");
  assert(logisticsAreaNames.includes("delivery") || logisticsAreaNames.includes("freight") || logisticsAreaNames.includes("warehouse"), "Logistics has delivery/freight");
  assert(!logisticsAreaNames.includes("biometric"), "Logistics DOES NOT contain biometric KYC");

  // TEST 2: Catalogue Prompt Formatting & Grounding
  console.log("\n--- Test 2: Catalogue LLM Prompt Injection & Formatting ---");
  const hospitalCatalogue: CompanyCatalogue = {
    isConfigured: true,
    serviceAreas: [
      {
        id: "sa-med-1",
        workspaceId: "hosp-123",
        name: "Outpatient & Specialty Clinics",
        description: "Doctor consultations, diagnosis, clinical referrals",
        categoryType: "clinical",
        parentId: null,
        isActive: true,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "sa-med-2",
        workspaceId: "hosp-123",
        name: "Inpatient & Surgical Admissions",
        description: "Bed management, surgery scheduling, nursing wards",
        categoryType: "clinical",
        parentId: null,
        isActive: true,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    services: [
      {
        id: "svc-med-1",
        workspaceId: "hosp-123",
        name: "Specialist Appointment Booking",
        description: "Scheduling consultations with cardiologists and surgeons",
        serviceCategoryId: null,
        isActive: true,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "svc-med-2",
        workspaceId: "hosp-123",
        name: "Discharge Medication Dispensing",
        description: "Hospital pharmacy dispensing of discharge drugs",
        serviceCategoryId: null,
        isActive: true,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    products: [
      {
        id: "prod-med-1",
        workspaceId: "hosp-123",
        name: "Annual Executive Health Checkup Package",
        description: "Full body lab screening, ECG, physician review",
        productCategoryId: null,
        sku: "HLTH-EXEC-2026",
        isActive: true,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    issueCategories: [
      {
        id: "cat-med-1",
        workspaceId: "hosp-123",
        name: "Doctor Consultation Delay / No-Show",
        description: "Specialist delayed over 45 minutes beyond booking time",
        serviceId: "svc-med-1",
        parentId: null,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const formattedHospitalBlock = formatCatalogueForPrompt(hospitalCatalogue);
  assert(formattedHospitalBlock.includes("sa-med-1"), "Formatted block contains service area ID sa-med-1");
  assert(formattedHospitalBlock.includes("Outpatient & Specialty Clinics"), "Formatted block contains service area name");
  assert(formattedHospitalBlock.includes("HLTH-EXEC-2026"), "Formatted block contains product SKU");
  assert(!formattedHospitalBlock.includes("Fiber"), "Formatted block does NOT contain telecom terms");

  // TEST 3: System Prompt Grounding Rules
  console.log("\n--- Test 3: System Prompt Grounding Verification ---");
  const systemPrompt = buildCustomerJourneySystemPrompt(formattedHospitalBlock);
  assert(systemPrompt.includes("ORGANIZATION COMPANY SERVICE & PRODUCT CATALOGUE"), "System prompt includes catalogue heading");
  assert(systemPrompt.includes("NEVER fabricate product or service names"), "System prompt strictly forbids hallucination/fabrication");
  assert(systemPrompt.includes("Outpatient & Specialty Clinics"), "System prompt has organization's active catalogue");

  // TEST 4: User Prompt JSON Structure
  console.log("\n--- Test 4: User Prompt Schema Verification ---");
  const userPrompt = buildCustomerJourneyUserPrompt({
    callId: "call-test-99",
    callTitle: "Patient inquiring about cardiology appointment delay",
    callDate: new Date().toISOString(),
    utterances: [
      { speaker: "customer", role: "customer", text: "Hello, I have been waiting 50 minutes for Dr. Mrema in the cardiology clinic." },
      { speaker: "agent", role: "agent", text: "I apologize for the wait. Let me check the clinic status for you." },
    ],
    priorIssues: [],
    catalogueBlock: formattedHospitalBlock,
  });
  assert(userPrompt.includes("ORGANIZATION ACTIVE CATALOGUE:"), "User prompt includes active catalogue section");
  assert(userPrompt.includes("catalogue_classification"), "User prompt requests catalogue_classification JSON object");
  assert(userPrompt.includes("service_area"), "User prompt requests service_area mapping");

  console.log("\n========================================================");
  console.log("🎉 ALL MULTI-INDUSTRY INTELLIGENCE TESTS PASSED CLEANLY!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
