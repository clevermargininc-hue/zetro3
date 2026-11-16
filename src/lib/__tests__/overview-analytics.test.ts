import test from "node:test";
import assert from "node:assert/strict";
import {
  computeOverviewMetrics,
  dayKeyInTz,
  extractCustomerSentimentSummary,
  extractTopOverviewGaps,
  serializeOverviewCalls,
  shiftWindowDays,
  type OverviewCallInput,
} from "@/lib/overview-analytics";
import type { CallScore } from "@/lib/types";

function makeScore(overrides: Partial<CallScore> = {}): CallScore {
  return {
    id: "score-1",
    call_id: "call-1",
    overall_score: 82,
    greeting: 85,
    empathy: 80,
    professionalism: 86,
    resolution: 80,
    communication: 84,
    language_handling: 85,
    verdict: "good",
    summary: "Agent verified account and resolved issue cleanly.",
    strengths: ["Warm greeting", "Verified identity"],
    improvements: ["Summarize next steps before closing"],
    compliance_findings: [],
    standards_used: [],
    customer_sentiment: "satisfied",
    metric_evidence: {
      parameters: [
        { name: "Greeting", score: 85 },
        { name: "Empathy", score: 80 },
        { name: "Resolution", score: 80 },
      ],
      compliance_checks: [
        {
          rule: "Verify customer ID before disclosure",
          file_name: "KYC Policy.pdf",
          result: "pass",
          severity: "critical",
          note: "Verified DOB and ID",
          quote: "Naomba namba yako ya kitambulisho",
          start_s: 12,
        },
      ],
      customer_voice: {
        stance: "satisfied",
        satisfaction_themes: ["Fast resolution"],
        frustration_themes: [],
        note: "Customer thanked agent.",
        quote: "Asante sana kwa msaada.",
      },
    },
    created_at: "2026-11-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeCall(overrides: Partial<OverviewCallInput> = {}): OverviewCallInput {
  return {
    id: "call-1",
    title: "Support inquiry",
    file_name: "20261115_101.mp3",
    status: "completed",
    duration_seconds: 180,
    language_mode: "sw",
    created_at: "2026-11-15T09:50:00.000Z",
    audited_at: "2026-11-15T10:00:00.000Z",
    agent_id: "agent-1",
    agents: { name: "Amina Juma" },
    call_scores: makeScore(),
    ...overrides,
  };
}

test("dayKeyInTz and shiftWindowDays align to Africa/Dar_es_Salaam midnight boundaries", () => {
  // 2026-11-16T21:30:00Z is 2026-11-17 00:30 EAT (UTC+3)
  assert.equal(dayKeyInTz("2026-11-16T21:30:00.000Z", "Africa/Dar_es_Salaam"), "2026-11-17");

  const fixedNow = new Date("2026-11-16T10:00:00.000Z"); // 2026-11-16 13:00 EAT
  const win = shiftWindowDays(7, fixedNow, "Africa/Dar_es_Salaam");

  assert.equal(win.currentKeyList.length, 7);
  assert.equal(win.previousKeyList.length, 7);
  assert.equal(win.currentKeyList[0], "2026-11-10");
  assert.equal(win.currentKeyList[6], "2026-11-16");
  assert.equal(win.previousKeyList[0], "2026-11-03");
  assert.equal(win.previousKeyList[6], "2026-11-09");

  for (const key of win.currentKeyList) {
    assert.equal(win.previousKeys.has(key), false);
  }
});

test("computeOverviewMetrics omits deltas for all timeframe and empty prior baseline", () => {
  const fixedNow = new Date("2026-11-16T10:00:00.000Z");
  const calls = [
    makeCall({ id: "c1", audited_at: "2026-11-15T10:00:00.000Z" }),
    makeCall({ id: "c2", audited_at: "2026-11-14T10:00:00.000Z", language_mode: "en" }),
  ];

  const allRes = computeOverviewMetrics({ allCalls: calls, days: "all", now: fixedNow });
  assert.equal(allRes.current.auditedCount, 2);
  assert.equal(allRes.previous, null);
  assert.equal(allRes.deltas.score, null);
  assert.equal(allRes.deltas.audited, null);
  assert.equal(allRes.deltas.compliance, null);

  const sevenNoPrior = computeOverviewMetrics({ allCalls: calls, days: 7, now: fixedNow });
  assert.equal(sevenNoPrior.current.auditedCount, 2);
  assert.equal(sevenNoPrior.previous, null);
  assert.equal(sevenNoPrior.deltas.score, null);
  assert.equal(sevenNoPrior.deltas.compliance, null);
});

test("computeOverviewMetrics computes accurate period deltas when prior period exists", () => {
  const fixedNow = new Date("2026-11-16T10:00:00.000Z");

  // Current 7d: avg score 90, compliance 100%, AHT 200s, 2 calls
  const cur1 = makeCall({
    id: "cur-1",
    audited_at: "2026-11-15T10:00:00.000Z",
    duration_seconds: 180,
    language_mode: "sw",
    call_scores: makeScore({ overall_score: 90 }),
  });
  const cur2 = makeCall({
    id: "cur-2",
    audited_at: "2026-11-13T10:00:00.000Z",
    duration_seconds: 220,
    language_mode: "mixed",
    call_scores: makeScore({ overall_score: 90 }),
  });

  // Prior 7d (2026-11-03..2026-11-09): avg score 70, compliance 50% (1 pass, 1 fail), AHT 150s, 1 call
  const prev1 = makeCall({
    id: "prev-1",
    audited_at: "2026-11-06T10:00:00.000Z",
    duration_seconds: 150,
    language_mode: "en",
    call_scores: makeScore({
      overall_score: 70,
      metric_evidence: {
        compliance_checks: [
          {
            rule: "Verify customer ID before disclosure",
            file_name: "KYC Policy.pdf",
            result: "pass",
            severity: "critical",
            note: "Ok",
            quote: "DOB verified",
            start_s: 10,
          },
          {
            rule: "Read closing compliance disclaimer",
            file_name: "QA Policy.pdf",
            result: "fail",
            severity: "major",
            note: "Missed closing statement",
            quote: "",
            start_s: null,
          },
        ],
      },
    }),
  });

  const res = computeOverviewMetrics({
    allCalls: [cur1, cur2, prev1],
    days: 7,
    now: fixedNow,
  });

  assert.equal(res.current.avgScore, 90);
  assert.equal(res.current.passRate, 100);
  assert.equal(res.current.complianceFollowedPct, 100);
  assert.equal(res.current.ahtSeconds, 200);
  assert.equal(res.current.languageMix.length, 2);

  assert.equal(res.deltas.score?.text, "+20 pts vs prior 7d");
  assert.equal(res.deltas.score?.tone, "positive");
  assert.equal(res.deltas.audited?.text, "+1 vs prior 7d");
  assert.equal(res.deltas.audited?.tone, "positive");
  assert.equal(res.deltas.compliance?.text, "+50% vs prior 7d");
  assert.equal(res.deltas.compliance?.tone, "positive");
  assert.equal(res.deltas.aht?.text, "+50s vs prior 7d");
  assert.equal(res.deltas.aht?.tone, "neutral");
});

test("extractTopOverviewGaps ranks critical compliance misses before low rubric scores and ignores n/a", () => {
  const calls: OverviewCallInput[] = [
    makeCall({
      id: "gap-call-1",
      call_scores: makeScore({
        overall_score: 52,
        metric_evidence: {
          parameters: [
            { name: "Greeting", score: 90 },
            { name: "Empathy", score: 58 },
          ],
          compliance_checks: [
            {
              rule: "Mandatory fraud disclosure",
              file_name: "Policy.pdf",
              result: "fail",
              severity: "critical",
              note: "Skipped fraud disclosure",
              quote: "",
              start_s: null,
            },
            {
              rule: "Optional cross-sell script",
              file_name: "Sales.pdf",
              result: "n/a",
              severity: "minor",
              note: "Not applicable",
              quote: "",
              start_s: null,
            },
          ],
        },
      }),
    }),
    makeCall({
      id: "gap-call-2",
      call_scores: makeScore({
        overall_score: 76,
        metric_evidence: {
          parameters: [
            { name: "Greeting", score: 92 },
            { name: "Empathy", score: 66 },
          ],
          compliance_checks: [
            {
              rule: "Mandatory fraud disclosure",
              file_name: "Policy.pdf",
              result: "pass",
              severity: "critical",
              note: "Disclosed clearly",
              quote: "Remember...",
              start_s: 30,
            },
          ],
        },
      }),
    }),
  ];

  const gaps = extractTopOverviewGaps(calls, 6);
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].kind, "compliance");
  assert.equal(gaps[0].label, "Mandatory fraud disclosure");
  assert.equal(gaps[0].critical, true);
  assert.equal(gaps[0].failCount, 1);
  assert.equal(gaps[0].totalEvaluated, 2);
  assert.equal(gaps[0].sampleCallId, "gap-call-1");

  assert.equal(gaps[1].kind, "rubric");
  assert.equal(gaps[1].label, "Empathy");
  assert.equal(gaps[1].avgScore, 62);
  assert.equal(gaps[1].failCount, 2);
});

test("extractCustomerSentimentSummary and serializeOverviewCalls return clean real summaries", () => {
  const calls: OverviewCallInput[] = [
    makeCall({
      id: "old-call",
      created_at: "2026-11-10T08:00:00.000Z",
      call_scores: makeScore({
        overall_score: 48,
        metric_evidence: {
          customer_voice: {
            stance: "frustrated",
            frustration_themes: ["Long hold queue", "Repeated verification"],
            satisfaction_themes: [],
            note: "Customer annoyed by wait time",
            quote: "Nimesubiri dakika kumi.",
          },
        },
      }),
    }),
    makeCall({
      id: "new-call",
      created_at: "2026-11-16T08:00:00.000Z",
      status: "processing",
      call_scores: null,
    }),
  ];

  const sentiment = extractCustomerSentimentSummary(calls);
  assert.equal(sentiment.totalWithVoice, 1);
  assert.equal(sentiment.counts.frustrated, 1);
  assert.equal(sentiment.frustrationThemes[0].theme, "Long hold queue");

  const serialized = serializeOverviewCalls(calls);
  assert.equal(serialized.length, 2);
  assert.equal(serialized[0].id, "new-call");
  assert.equal(serialized[0].overallScore, null);
  assert.equal(serialized[1].id, "old-call");
  assert.equal(serialized[1].customerStance, "frustrated");
  assert.equal(serialized[1].customerQuote, "Nimesubiri dakika kumi.");
});

test("computeOverviewMetrics and serializeOverviewCalls prefer completed_at and detected_language", () => {
  const fixedNow = new Date("2026-11-16T10:00:00.000Z");
  const uploadedEarlierCompletedNow = makeCall({
    id: "delayed-audit",
    created_at: "2026-11-01T08:00:00.000Z",
    completed_at: "2026-11-15T12:00:00.000Z",
    audited_at: null,
    language_mode: "auto",
    detected_language: "mixed",
    call_scores: makeScore({ overall_score: 88 }),
  });

  const metrics = computeOverviewMetrics({
    allCalls: [uploadedEarlierCompletedNow],
    days: 7,
    now: fixedNow,
  });

  assert.equal(metrics.current.auditedCount, 1);
  assert.equal(metrics.current.avgScore, 88);
  assert.equal(metrics.current.languageMix[0].label, "English + Kiswahili");

  const [item] = serializeOverviewCalls([uploadedEarlierCompletedNow]);
  assert.equal(item.languageLabel, "English + Kiswahili");
  assert.equal(item.auditedAt, "2026-11-15T12:00:00.000Z");
});
