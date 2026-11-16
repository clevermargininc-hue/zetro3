import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { firstContactResolvedCount, lifecycleReviewFields, issueReviewFlags, companyCategory } from "@/lib/customer-intelligence-metrics";

describe("Customer experience metric and review regressions", () => {
  it("preserves verification and pending reviews when adding a note or assigning a team", () => {
    assert.deepEqual(issueReviewFlags("investigation_note", true), {});
    assert.deepEqual(issueReviewFlags("assign_team"), {});
  });
  it("keeps catalogue review pending after a journey correction", () => {
    assert.deepEqual(issueReviewFlags("confirm_match", true), {human_verified:true, needs_review:true});
    assert.deepEqual(issueReviewFlags("confirm_match", false), {human_verified:true, needs_review:false});
  });
  it("reports configured company categories and groups missing categories as Unclassified", () => {
    assert.deepEqual(companyCategory({catalogue_issue_category_id:"lab",catalogue_issue_category_name:"Lab results delayed"}), {id:"lab",label:"Lab results delayed"});
    assert.deepEqual(companyCategory({}), {id:"unclassified",label:"Unclassified"});
  });
  it("does not treat an unresolved first contact as a resolution", () => {
    assert.equal(firstContactResolvedCount([{status:"open",total_calls:1,reopened_count:0}]),0);
  });
  it("counts resolved and closed first contacts, excluding repeats and reopened histories", () => {
    assert.equal(firstContactResolvedCount([
      {status:"resolved",total_calls:1,reopened_count:0},
      {status:"closed",total_calls:1,reopened_count:0},
      {status:"resolved",total_calls:2,reopened_count:0},
      {status:"closed",total_calls:1,reopened_count:1},
      {status:"in_progress",total_calls:1,reopened_count:0},
    ]),2);
  });
  it("handles an empty history without fabricated resolutions", () => {
    assert.equal(firstContactResolvedCount([]),0);
  });
  it("reopening clears resolution metadata and records the reopen", () => {
    assert.deepEqual(lifecycleReviewFields("reopened",2,"resolved","2026-10-31T12:00:00Z"),{resolved_at:null,reopened_count:3,resolution_confirmation:"unconfirmed"});
  });
  it("repeated edits to an already reopened issue do not inflate the count", () => {
    assert.deepEqual(lifecycleReviewFields("reopened",2,"reopened","now"),{resolved_at:null,resolution_confirmation:"unconfirmed"});
  });
});
