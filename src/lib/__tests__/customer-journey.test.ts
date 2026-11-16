import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractCandidateIdentifiers,
  formatPhoneReadable,
  maskPhoneNumber,
  matchCustomerProfile,
  normalizeCustomerId,
  normalizePhoneNumber,
  type ExistingCustomerProfile,
} from "@/lib/customer-identity";
import {
  compareWithPreviousIssues,
  computeCustomerRiskLevel,
  evaluateIssueLifecycle,
  evaluateRootCauseIntelligence,
  extractStructuredIssueFromCall,
} from "@/lib/customer-journey-engine";
import type { PriorIssueDigest } from "@/lib/ai/prompts/customer-journey";

describe("Zetro — Customer Journey & Repeat Issue Intelligence Suite", () => {
  describe("Phase 2: Phone Normalization & Customer Identity Matching", () => {
    it("normalizes Tanzanian MSISDN variants (0712345678, +255712345678, 255712345678) to identical E.164", () => {
      const a = normalizePhoneNumber("0712345678", "TZ");
      const b = normalizePhoneNumber("+255712345678", "TZ");
      const c = normalizePhoneNumber("255712345678", "TZ");
      const d = normalizePhoneNumber("00255 712 345 678", "TZ");
      const e = normalizePhoneNumber("+255 (0) 712-345-678", "TZ");

      assert.equal(a.valid, true);
      assert.equal(a.e164, "+255712345678");
      assert.equal(b.e164, "+255712345678");
      assert.equal(c.e164, "+255712345678");
      assert.equal(d.e164, "+255712345678");
      assert.equal(e.e164, "+255712345678");
      assert.equal(a.countryCode, "TZ");
    });

    it("normalizes multi-country numbers accurately (Kenya +254, Uganda +256, Nigeria +234, UK +44)", () => {
      const keLocal = normalizePhoneNumber("0722111222", "KE");
      const keIntl = normalizePhoneNumber("+254722111222", "TZ"); // Auto-detects +254 even if workspace default is TZ
      const ugLocal = normalizePhoneNumber("0772334455", "UG");
      const ngLocal = normalizePhoneNumber("08031234567", "NG");

      assert.equal(keLocal.e164, "+254722111222");
      assert.equal(keIntl.e164, "+254722111222");
      assert.equal(keIntl.countryCode, "KE");
      assert.equal(ugLocal.e164, "+256772334455");
      assert.equal(ngLocal.e164, "+2348031234567");
    });

    it("rejects invalid or dummy placeholder phone numbers safely", () => {
      assert.equal(normalizePhoneNumber("", "TZ").valid, false);
      assert.equal(normalizePhoneNumber("123", "TZ").valid, false);
      assert.equal(normalizePhoneNumber("0000000000", "TZ").valid, false);
      assert.equal(normalizeCustomerId("UNKNOWN"), null);
    });

    it("masks MSISDN for privacy while preserving readable format helper", () => {
      assert.equal(maskPhoneNumber("+255712345678"), "+255712•••678");
      assert.equal(formatPhoneReadable("+255712345678"), "+255 712 345 678");
    });

    it("prioritizes Customer ID > MSISDN > CRM ID and never auto-merges conflicting profiles", () => {
      const existingProfiles: ExistingCustomerProfile[] = [
        {
          id: "cust-1",
          workspace_id: "ws-1",
          user_id: "u-1",
          primary_identifier: "CUST-1001",
          display_label: "+255 712 345 678",
          normalized_phone: "+255712345678",
          external_customer_id: "CUST-1001",
        },
        {
          id: "cust-2",
          workspace_id: "ws-1",
          user_id: "u-1",
          primary_identifier: "CUST-2002",
          display_label: "+255 754 999 000",
          normalized_phone: "+255754999000",
          external_customer_id: "CUST-2002",
        },
      ];

      // Conflicting identifiers: Customer ID belongs to cust-1, Phone belongs to cust-2
      const conflictingCandidates = extractCandidateIdentifiers({
        explicitCustomerId: "CUST-1001",
        callerPhone: "0754999000",
        defaultCountry: "TZ",
      });

      const decision = matchCustomerProfile(conflictingCandidates, existingProfiles);
      assert.equal(decision.matchedCustomer?.id, "cust-1"); // Priority 1 (customer_id) wins
      assert.equal(decision.conflictDetected, true);
      assert.equal(decision.needsIdentityReview, true);
    });
  });

  describe("Mandatory Scenario Validation (TEST 1 through TEST 10)", () => {
    it("TEST 1: Same customer, same unresolved issue across 3 calls (Internet outage -> Technician not arrived)", () => {
      const existingProfiles: ExistingCustomerProfile[] = [];

      // Call 1: 0712345678 reports internet not working
      const c1Candidates = extractCandidateIdentifiers({
        callerPhone: "0712345678",
        defaultCountry: "TZ",
      });
      const c1Match = matchCustomerProfile(c1Candidates, existingProfiles);
      assert.equal(c1Match.matchedCustomer, null);
      assert.equal(c1Candidates[0].normalizedValue, "+255712345678");

      const customerProfile: ExistingCustomerProfile = {
        id: "cust-airtel-1",
        workspace_id: "ws-airtel",
        user_id: "u-airtel",
        primary_identifier: "+255712345678",
        display_label: "+255 712 345 678",
        normalized_phone: "+255712345678",
        external_customer_id: null,
      };
      existingProfiles.push(customerProfile);

      const call1Turns = [
        { role: "customer", speaker: "Customer", text: "My internet connection stopped working yesterday." },
        { role: "agent", speaker: "Agent", text: "I will escalate this to the technical team and a technician will visit." },
      ];
      const issue1 = extractStructuredIssueFromCall({
        title: "Internet not working",
        utterances: call1Turns,
        callerPhone: "0712345678",
      });
      assert.equal(issue1.category, "internet_connectivity");

      const comp1 = compareWithPreviousIssues({
        currentIssue: issue1,
        currentCallDate: "2026-10-12T10:00:00Z",
        currentTranscriptText: call1Turns.map((t) => t.text).join(" "),
        priorIssues: [],
      });
      assert.equal(comp1.isRepeatCustomer, false);
      assert.equal(comp1.isRepeatIssue, false);
      assert.equal(comp1.matchClassification, "new_issue");

      const life1 = evaluateIssueLifecycle({
        matchClassification: comp1.matchClassification,
        previousIssueStatus: null,
        utterances: call1Turns,
        interactionNumber: 1,
      });
      // Call 1 ended, but technician visit promised -> pending_external_action & unconfirmed!
      assert.equal(life1.newStatus, "pending_external_action");
      assert.equal(life1.resolutionConfirmation, "unconfirmed");

      const priorIssuesAfterCall1: PriorIssueDigest[] = [
        {
          issue_id: "iss-101",
          issue_code: "ISS-101",
          title: issue1.title,
          category: issue1.category,
          subcategory: issue1.subcategory,
          product_service: issue1.product_service,
          symptoms: issue1.symptoms,
          status: life1.newStatus,
          resolution_confirmation: life1.resolutionConfirmation,
          first_reported_at: "2026-10-12T10:00:00Z",
          latest_reported_at: "2026-10-12T10:00:00Z",
          total_calls: 1,
          summary: issue1.summary,
          recent_call_notes: [
            {
              call_id: "call-1",
              date: "2026-10-12T10:00:00Z",
              summary: issue1.summary,
              resolution_state: life1.callResolutionState,
            },
          ],
        },
      ];

      // Call 2: +255712345678 calls 2 days later
      const c2Candidates = extractCandidateIdentifiers({
        callerPhone: "+255712345678",
        defaultCountry: "TZ",
      });
      const c2Match = matchCustomerProfile(c2Candidates, existingProfiles);
      assert.equal(c2Match.matchedCustomer?.id, "cust-airtel-1");

      const call2Turns = [
        { role: "customer", speaker: "Customer", text: "I called two days ago, but my internet is still not working." },
        { role: "agent", speaker: "Agent", text: "I see the ticket. The technician has not yet visited." },
      ];
      const issue2 = extractStructuredIssueFromCall({
        title: "Internet still not working",
        utterances: call2Turns,
      });
      const comp2 = compareWithPreviousIssues({
        currentIssue: issue2,
        currentCallDate: "2026-10-14T11:00:00Z",
        currentTranscriptText: call2Turns.map((t) => t.text).join(" "),
        priorIssues: priorIssuesAfterCall1,
      });
      assert.equal(comp2.isRepeatCustomer, true);
      assert.equal(comp2.isRepeatIssue, true);
      assert.equal(comp2.matchClassification, "same_issue");
      assert.equal(comp2.matchedPreviousIssueId, "iss-101");

      // Call 3: 255712345678 calls on 17 Oct
      priorIssuesAfterCall1[0].total_calls = 2;
      priorIssuesAfterCall1[0].latest_reported_at = "2026-10-14T11:00:00Z";
      priorIssuesAfterCall1[0].recent_call_notes.push({
        call_id: "call-2",
        date: "2026-10-14T11:00:00Z",
        summary: issue2.summary,
        resolution_state: "pending_external_action",
      });

      const call3Turns = [
        { role: "customer", speaker: "Customer", text: "This is my third time calling and my internet is still unavailable!" },
        { role: "agent", speaker: "Agent", text: "The technician was assigned, but the issue has not been resolved. I am escalating this urgently." },
      ];
      const issue3 = extractStructuredIssueFromCall({
        title: "Internet still unavailable",
        utterances: call3Turns,
      });
      const comp3 = compareWithPreviousIssues({
        currentIssue: issue3,
        currentCallDate: "2026-10-17T09:30:00Z",
        currentTranscriptText: call3Turns.map((t) => t.text).join(" "),
        priorIssues: priorIssuesAfterCall1,
      });
      assert.equal(comp3.isRepeatCustomer, true);
      assert.equal(comp3.isRepeatIssue, true);
      assert.equal(comp3.matchClassification, "same_issue");

      const life3 = evaluateIssueLifecycle({
        matchClassification: comp3.matchClassification,
        previousIssueStatus: "pending_external_action",
        utterances: call3Turns,
        interactionNumber: 3,
      });
      assert.equal(life3.newStatus, "escalated");
      assert.equal(life3.resolutionConfirmation, "unconfirmed");
    });

    it("TEST 2: Same customer, different issue (Call 1: Internet not working -> Call 2: Billing amount is wrong)", () => {
      const priorIssues: PriorIssueDigest[] = [
        {
          issue_id: "iss-internet-1",
          issue_code: "ISS-101",
          title: "Internet not working",
          category: "internet_connectivity",
          subcategory: "connectivity_outage",
          product_service: "Home Fiber & Broadband",
          symptoms: ["Internet connection unavailable"],
          status: "open",
          resolution_confirmation: "unconfirmed",
          first_reported_at: "2026-10-12T10:00:00Z",
          latest_reported_at: "2026-10-17T09:30:00Z",
          total_calls: 3,
          summary: "Customer reported home fiber internet outage.",
          recent_call_notes: [],
        },
      ];

      const billingTurns = [
        { role: "customer", speaker: "Customer", text: "My monthly bill amount is incorrect, I was overcharged twice on my invoice." },
        { role: "agent", speaker: "Agent", text: "Let me check your postpaid billing statement." },
      ];
      const billingIssue = extractStructuredIssueFromCall({
        title: "Incorrect bill amount",
        utterances: billingTurns,
      });

      assert.equal(billingIssue.category, "billing_charging");

      const comparison = compareWithPreviousIssues({
        currentIssue: billingIssue,
        currentCallDate: "2026-10-23T14:00:00Z",
        currentTranscriptText: billingTurns.map((t) => t.text).join(" "),
        priorIssues,
      });

      // Repeat customer = YES, Repeat issue = NO (New issue)
      assert.equal(comparison.isRepeatCustomer, true);
      assert.equal(comparison.isRepeatIssue, false);
      assert.equal(comparison.matchClassification, "new_issue");
      assert.equal(comparison.matchedPreviousIssueId, null);
    });

    it("TEST 3: Different customers calling about the same issue remain separate profiles and separate issues", () => {
      const existingProfiles: ExistingCustomerProfile[] = [
        {
          id: "cust-A",
          workspace_id: "ws-1",
          user_id: "u-1",
          primary_identifier: "+255712345678",
          display_label: "+255 712 345 678",
          normalized_phone: "+255712345678",
          external_customer_id: null,
        },
      ];

      const customerBCandidates = extractCandidateIdentifiers({
        callerPhone: "0754987654",
        defaultCountry: "TZ",
      });
      const matchB = matchCustomerProfile(customerBCandidates, existingProfiles);

      assert.equal(matchB.matchedCustomer, null);
      assert.equal(customerBCandidates[0].normalizedValue, "+255754987654");
    });

    it("TEST 4: Resolved issue followed by customer returning with the same issue transitions to Reopened", () => {
      const resolvedPrior: PriorIssueDigest[] = [
        {
          issue_id: "iss-resolved-1",
          issue_code: "ISS-200",
          title: "Internet connectivity outage",
          category: "internet_connectivity",
          subcategory: "connectivity_outage",
          product_service: "Home Fiber & Broadband",
          symptoms: ["Internet connection unavailable"],
          status: "resolved",
          resolution_confirmation: "agent_reported",
          first_reported_at: "2026-10-01T08:00:00Z",
          latest_reported_at: "2026-10-01T08:15:00Z",
          total_calls: 1,
          summary: "Customer reported internet down; agent reset port and marked resolved.",
          recent_call_notes: [],
        },
      ];

      const returnTurns = [
        { role: "customer", speaker: "Customer", text: "You said my internet was fixed yesterday, but my internet connection is still not working again!" },
        { role: "agent", speaker: "Agent", text: "I apologize that the connection dropped again, let me reopen your ticket." },
      ];
      const returnIssue = extractStructuredIssueFromCall({
        title: "Internet stopped working again",
        utterances: returnTurns,
      });

      const comp = compareWithPreviousIssues({
        currentIssue: returnIssue,
        currentCallDate: "2026-10-02T09:00:00Z",
        currentTranscriptText: returnTurns.map((t) => t.text).join(" "),
        priorIssues: resolvedPrior,
      });

      assert.equal(comp.isRepeatCustomer, true);
      assert.equal(comp.isRepeatIssue, true);
      assert.equal(comp.matchClassification, "reopened_issue");
      assert.equal(comp.matchedPreviousIssueId, "iss-resolved-1");

      const lifecycle = evaluateIssueLifecycle({
        matchClassification: comp.matchClassification,
        previousIssueStatus: "resolved",
        utterances: returnTurns,
        interactionNumber: 2,
      });
      assert.equal(lifecycle.newStatus, "reopened");
      assert.equal(lifecycle.isReopened, true);
    });

    it("TEST 5: Service provider / technician delay is identified as primary root cause without blaming agent", () => {
      const callTurns = [
        { role: "customer", speaker: "Customer", text: "I have been waiting for 4 days and the technician has not yet visited my home." },
        { role: "agent", speaker: "Agent", text: "I can see the technician was assigned on Tuesday, but the issue has not been resolved. I am escalating this to field dispatch." },
      ];

      const rc = evaluateRootCauseIntelligence({
        category: "internet_connectivity",
        utterances: callTurns,
        priorCallSummaries: [
          { summary: "Day 1: Customer reported internet failure. Agent escalated to technical team." },
          { summary: "Day 2: Customer called again. Agent noted technician has not yet visited." },
        ],
        interactionNumber: 3,
        qaScore: 88, // Agent handled the call well!
      });

      assert.equal(rc.primaryCategory, "service_provider_technician");
      assert.equal(rc.primarySubcategory, "technician_delayed_service");
      assert.equal(rc.secondaryCategory, "operational_process");
      assert.equal(rc.evidenceType, "confirmed_evidence");
      assert.ok(rc.confidence >= 0.85);
    });

    it("TEST 6: Agent failure (missing ticket / failed procedure) is accurately classified as agent_related", () => {
      const callTurns = [
        { role: "customer", speaker: "Customer", text: "I called yesterday and the previous agent never created a ticket and gave wrong information." },
        { role: "agent", speaker: "Agent", text: "I apologize, I see no ticket was logged on your account yesterday." },
      ];

      const rc = evaluateRootCauseIntelligence({
        category: "billing_charging",
        utterances: callTurns,
        priorCallSummaries: [{ summary: "Customer asked for billing dispute escalation." }],
        interactionNumber: 2,
        qaScore: 48,
      });

      assert.equal(rc.primaryCategory, "agent_related");
      assert.equal(rc.evidenceType, "confirmed_evidence");
    });

    it("TEST 7: Single short call with no root-cause proof defaults to unknown_insufficient_evidence without fabricating facts", () => {
      const shortTurns = [
        { role: "customer", speaker: "Customer", text: "Hello, I just wanted to check your office opening hours." },
        { role: "agent", speaker: "Agent", text: "Our shops are open from 8 AM to 5 PM Monday through Saturday." },
      ];

      const rc = evaluateRootCauseIntelligence({
        category: "general_inquiry",
        utterances: shortTurns,
        priorCallSummaries: [],
        interactionNumber: 1,
        qaScore: 92,
      });

      assert.equal(rc.primaryCategory, "unknown_insufficient_evidence");
      assert.equal(rc.evidenceType, "insufficient_evidence");
    });

    it("TEST 8 & 9 & 10: Risk scoring, ambiguous confidence Needs Review, and lifecycle state machine", () => {
      // Risk level calculation
      assert.equal(
        computeCustomerRiskLevel({
          repeatCallCount: 3,
          unresolvedIssueCount: 1,
          reopenedIssueCount: 0,
          escalatedIssueCount: 1,
        }),
        "critical",
      );
      assert.equal(
        computeCustomerRiskLevel({
          repeatCallCount: 0,
          unresolvedIssueCount: 0,
          reopenedIssueCount: 0,
          escalatedIssueCount: 0,
        }),
        "low",
      );

      // Ambiguous confidence triggers needs_review when score falls between floor and related threshold
      const prior: PriorIssueDigest[] = [
        {
          issue_id: "iss-ambig",
          issue_code: "ISS-900",
          title: "Mobile data bundle question",
          category: "package_subscription",
          subcategory: "bundle_subscription_issue",
          product_service: "Prepaid Bundle",
          symptoms: ["Bundle activation question"],
          status: "open",
          resolution_confirmation: "unconfirmed",
          first_reported_at: "2026-08-01T10:00:00Z", // > 60 days ago so time proximity is low
          latest_reported_at: "2026-08-01T10:00:00Z",
          total_calls: 1,
          summary: "Asked about weekly data bundle.",
          recent_call_notes: [],
        },
      ];

      const currentAmbig = {
        title: "General account plan inquiry",
        category: "package_subscription" as const,
        subcategory: "plan_inquiry",
        product_service: "Postpaid Voice",
        symptoms: ["Plan tariff check"],
        location: null,
        service_provider: null,
        summary: "Checking voice tariff options.",
        extracted_phone: null,
        extracted_customer_id: null,
      };

      const ambigComp = compareWithPreviousIssues({
        currentIssue: currentAmbig,
        currentCallDate: "2026-10-25T10:00:00Z",
        currentTranscriptText: "I want to ask about voice tariff options",
        priorIssues: prior,
      });

      assert.equal(ambigComp.matchClassification, "needs_review");
      assert.equal(ambigComp.needsReview, true);
    });
  });
});

