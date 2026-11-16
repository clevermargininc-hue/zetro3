import test from "node:test";
import assert from "node:assert/strict";
import { validateCatalogueClassification, type CompanyCatalogue } from "@/lib/company-catalogue";

const catalogue: CompanyCatalogue = {
  isConfigured: true,
  serviceAreas: [
    { id: "11111111-1111-4111-8111-111111111111", workspaceId: "workspace-a", name: "Payments", description: null, categoryType: "payments", parentId: null, isActive: true, metadata: {}, createdAt: "", updatedAt: "" },
    { id: "22222222-2222-4222-8222-222222222222", workspaceId: "workspace-a", name: "Archive", description: null, categoryType: "legacy", parentId: null, isActive: false, metadata: {}, createdAt: "", updatedAt: "" },
  ],
  products: [{ id: "33333333-3333-4333-8333-333333333333", workspaceId: "workspace-a", name: "Business account", description: null, productCategoryId: "11111111-1111-4111-8111-111111111111", sku: null, isActive: true, metadata: {}, createdAt: "", updatedAt: "" }],
  services: [
    { id: "44444444-4444-4444-8444-444444444444", workspaceId: "workspace-a", name: "Instant transfer", description: null, serviceCategoryId: "11111111-1111-4111-8111-111111111111", isActive: true, metadata: {}, createdAt: "", updatedAt: "" },
    { id: "55555555-5555-4555-8555-555555555555", workspaceId: "workspace-a", name: "Card dispute", description: null, serviceCategoryId: "11111111-1111-4111-8111-111111111111", isActive: true, metadata: {}, createdAt: "", updatedAt: "" },
  ],
  issueCategories: [{ id: "66666666-6666-4666-8666-666666666666", workspaceId: "workspace-a", name: "Transfer pending", description: null, serviceId: "44444444-4444-4444-8444-444444444444", parentId: null, isActive: true, createdAt: "" }],
};

test("classifies a multi-service company issue and derives its company area", () => {
  const result = validateCatalogueClassification(catalogue, {
    services: [{ id: "44444444-4444-4444-8444-444444444444" }, { name: "Card dispute" }],
    product: { name: "Business account" }, issue_category_id: "66666666-6666-4666-8666-666666666666", classification_confidence: .89,
  });
  assert.equal(result.status, "classified");
  assert.deepEqual(result.services.map(item => item.name), ["Instant transfer", "Card dispute"]);
  assert.deepEqual(result.serviceAreas.map(item => item.name), ["Payments"]);
  assert.equal(result.issueCategory?.name, "Transfer pending");
  assert.equal(result.requiresReview, false);
});

test("does not accept cross-company, inactive, or fabricated catalogue IDs", () => {
  const result = validateCatalogueClassification(catalogue, {
    product: { id: "99999999-9999-4999-8999-999999999999", name: "Business account" },
    service_area: { id: "22222222-2222-4222-8222-222222222222" }, classification_confidence: .95,
  });
  assert.equal(result.products.length, 0, "an invalid explicit ID must not fall back to a name");
  assert.equal(result.serviceAreas.length, 0);
  assert.equal(result.status, "unknown");
  assert.equal(result.requiresReview, true);
});

test("leaves an unfamiliar industry item unclassified instead of assigning a template default", () => {
  const result = validateCatalogueClassification(catalogue, { service: { name: "MRI scan" }, classification_confidence: .9, suggested_new_entry: { type: "service", name: "MRI scan" } });
  assert.equal(result.status, "unknown");
  assert.equal(result.services.length, 0);
  assert.deepEqual(result.suggestedEntry, { type: "service", name: "MRI scan", description: "" });
});
