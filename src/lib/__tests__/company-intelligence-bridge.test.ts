import test from "node:test";
import assert from "node:assert/strict";
import {
  sortAndSummarizeIntegrations,
  summarizeIssueCatalogueLinks,
} from "@/lib/company-intelligence-bridge";
import {
  aggregateIssueProductsAndServices,
  buildCustomerIntelligenceQueryParams,
} from "@/lib/company-intelligence-utils";

test("summarizeIssueCatalogueLinks counts real coverage and distinct linked issues per entity", () => {
  const res = summarizeIssueCatalogueLinks(
    [
      {
        id: "iss-1",
        product_id: "prod-a",
        service_id: null,
        service_area_id: "area-1",
        catalogue_issue_category_id: "cat-1",
        needs_review: false,
      },
      {
        id: "iss-2",
        product_id: null,
        service_id: null,
        service_area_id: null,
        catalogue_issue_category_id: null,
        needs_review: true,
      },
      {
        id: "iss-3",
        product_id: null,
        service_id: null,
        service_area_id: null,
        catalogue_issue_category_id: null,
        catalogue_requires_review: true,
      },
    ],
    [
      // Rel links iss-1 to an additional service and repeats prod-a (should remain distinct count 1)
      {
        issue_id: "iss-1",
        product_id: "prod-a",
        service_id: "svc-1",
        service_area_id: "area-1",
        is_current: true,
      },
      // Historical non-current rel should not count as active classification
      {
        issue_id: "iss-2",
        product_id: "prod-old",
        is_current: false,
      },
    ],
  );

  assert.equal(res.totalIssues, 3);
  assert.equal(res.classifiedIssuesCount, 1);
  assert.equal(res.unclassifiedIssuesCount, 2);
  assert.equal(res.needsReviewIssuesCount, 2);
  assert.equal(res.issueCountsByEntity.products["prod-a"], 1);
  assert.equal(res.issueCountsByEntity.products["prod-old"], undefined);
  assert.equal(res.issueCountsByEntity.services["svc-1"], 1);
  assert.equal(res.issueCountsByEntity.serviceAreas["area-1"], 1);
  assert.equal(res.issueCountsByEntity.issueCategories["cat-1"], 1);
});

test("sortAndSummarizeIntegrations extracts latest sync run regardless of nested order", () => {
  const items = sortAndSummarizeIntegrations([
    {
      id: "int-1",
      name: "ERP Products",
      provider: "generic_rest",
      integration_type: "catalogue_rest",
      connection_status: "active",
      last_sync_at: "2026-11-16T10:00:00.000Z",
      configuration: { entityType: "product" },
      integration_sync_runs: [
        {
          started_at: "2026-11-15T08:00:00.000Z",
          status: "failed",
          records_processed: 0,
          error_summary: "Timeout",
        },
        {
          started_at: "2026-11-16T10:00:00.000Z",
          status: "completed",
          records_processed: 14,
          error_summary: null,
        },
      ],
    },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].entityType, "product");
  assert.equal(items[0].latestRunStatus, "completed");
  assert.equal(items[0].latestRunProcessed, 14);
  assert.equal(items[0].latestRunError, null);
});

test("aggregateIssueProductsAndServices deduplicates per-issue links and computes open/recurring counts", () => {
  const { topProducts, topServices } = aggregateIssueProductsAndServices([
    {
      product_id: "prod-1",
      product_name: "Visa Debit Card",
      catalogue_products: [{ id: "prod-1", name: "Visa Debit Card" }],
      service_id: "svc-1",
      service_name: "ATM Reversal",
      status: "open",
      total_calls: 3,
    },
    {
      catalogue_products: [{ id: "prod-1", name: "Visa Debit Card" }],
      catalogue_services: [{ id: "svc-2", name: "Mobile PIN Reset" }],
      status: "resolved",
      total_calls: 1,
    },
  ]);

  assert.equal(topProducts.length, 1);
  assert.deepEqual(topProducts[0], {
    id: "prod-1",
    name: "Visa Debit Card",
    totalIssues: 2,
    unresolvedIssues: 1,
    recurringIssues: 1,
  });

  assert.equal(topServices.length, 2);
  assert.equal(topServices[0].id, "svc-1");
  assert.equal(topServices[0].unresolvedIssues, 1);
  assert.equal(topServices[0].recurringIssues, 1);
  assert.equal(topServices[1].id, "svc-2");
  assert.equal(topServices[1].unresolvedIssues, 0);
});

test("buildCustomerIntelligenceQueryParams serializes active filters cleanly", () => {
  const qs = buildCustomerIntelligenceQueryParams({
    search: "  Jane  ",
    serviceArea: "area-1",
    product: "",
    unresolvedOnly: true,
    needsReviewOnly: false,
  });

  assert.equal(qs, "search=Jane&serviceArea=area-1&unresolvedOnly=true");
});
