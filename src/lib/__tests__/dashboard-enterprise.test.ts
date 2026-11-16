import test from "node:test";
import assert from "node:assert/strict";
import { parseDashboardFilters } from "@/lib/server/dashboard-filters";
import {
  computeMetricDelta,
  summarizeWindowMetrics,
  type NormalizedCallRecord,
} from "@/lib/server/dashboard-queries";
import {
  capabilitiesForRole,
  hasCapability,
  normalizeOperationalRole,
} from "@/lib/rbac/roles";
import { sanitizeDisplayText, sanitizeInlineSnippet } from "@/lib/security/sanitize";
import { formatDateTimeInTz, formatTzsLocale } from "@/lib/i18n/dashboard";
import { KpiSummaryResponseSchema } from "@/features/dashboard/api/schemas";
import { FlaggedCallsResponseSchema } from "@/features/calls/api/schemas";
import { SessionResponseSchema } from "@/features/session/api/schemas";

function buildTestCall(overrides: Partial<NormalizedCallRecord> = {}): NormalizedCallRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Inbound support call",
    fileName: "call-01.wav",
    hasAudio: true,
    durationSeconds: 185,
    language: "sw",
    status: "completed",
    channel: "voice",
    agentId: "22222222-2222-4222-8222-222222222222",
    agentName: "Amina Juma",
    teamId: null,
    teamName: null,
    queueId: null,
    queueName: null,
    reviewStatus: "pending",
    reviewedAt: null,
    createdAt: "2026-11-10T09:00:00.000Z",
    auditedAt: "2026-11-10T09:05:00.000Z",
    score: null,
    overallScore: 84,
    verdict: "good",
    sentiment: "positive",
    compliancePct: 100,
    complianceFailedCount: 0,
    compliancePassedCount: 4,
    criticalFailureCount: 0,
    needsReview: false,
    summary: "Resolved account inquiry promptly.",
    ...overrides,
  };
}

test("parseDashboardFilters defaults safely, clamps bounds, and rejects invalid sort keys", () => {
  const fixedNow = Date.parse("2026-11-15T12:00:00.000Z");
  const parsed = parseDashboardFilters(
    new URL(
      "https://zetro.local/api/dashboard/kpis?preset=7d&page=0&pageSize=999&sortBy=drop_table&flagged=1&needsReview=true",
    ),
    "Africa/Dar_es_Salaam",
    fixedNow,
  );

  assert.equal(parsed.preset, "7d");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 100);
  assert.equal(parsed.sortBy, "created_at");
  assert.equal(parsed.sortDir, "desc");
  assert.equal(parsed.flagged, true);
  assert.equal(parsed.needsReview, true);
  assert.ok(parsed.prevToMs <= parsed.fromMs);
});

test("computeMetricDelta strictly returns null when comparison period has no data", () => {
  assert.equal(computeMetricDelta(82.4, null), null);
  assert.equal(computeMetricDelta(null, 80), null);
  assert.equal(computeMetricDelta(null, null), null);
  assert.equal(computeMetricDelta(86.4, 81.2), 5.2);
  assert.equal(computeMetricDelta(74.0, 78.5), -4.5);
});

test("summarizeWindowMetrics computes accurate averages and yields null percentages when denominator is zero", () => {
  const empty = summarizeWindowMetrics([]);
  assert.equal(empty.callsAnalyzed, 0);
  assert.equal(empty.avgScore, null);
  assert.equal(empty.complianceRate, null);
  assert.equal(empty.positiveSentimentPct, null);
  assert.equal(empty.needsReviewCount, 0);

  const populated = summarizeWindowMetrics([
    buildTestCall({ overallScore: 90, compliancePassedCount: 4, complianceFailedCount: 0, sentiment: "positive", needsReview: false }),
    buildTestCall({
      id: "11111111-1111-4111-8111-111111111112",
      overallScore: 60,
      compliancePassedCount: 2,
      complianceFailedCount: 2,
      sentiment: "negative",
      needsReview: true,
    }),
  ]);

  assert.equal(populated.callsAnalyzed, 2);
  assert.equal(populated.avgScore, 75);
  assert.equal(populated.complianceRate, 75);
  assert.equal(populated.positiveSentimentPct, 50);
  assert.equal(populated.needsReviewCount, 1);
});

test("RBAC role normalization and capabilities strictly isolate executive read-only access", () => {
  assert.equal(normalizeOperationalRole("admin", "member"), "admin");
  assert.equal(normalizeOperationalRole("member", "executive"), "executive");

  const adminCaps = capabilitiesForRole("admin");
  const execCaps = capabilitiesForRole("executive");
  const leadCaps = capabilitiesForRole("team_lead");

  assert.equal(hasCapability(adminCaps, "settings:org_manage"), true);
  assert.equal(hasCapability(execCaps, "overview:view"), true);
  assert.equal(hasCapability(execCaps, "calls:bulk_action"), false);
  assert.equal(hasCapability(execCaps, "coaching:assign"), false);
  assert.equal(hasCapability(execCaps, "settings:org_manage"), false);
  assert.equal(hasCapability(leadCaps, "coaching:assign"), true);
  assert.equal(hasCapability(leadCaps, "settings:org_manage"), false);
});

test("sanitizeDisplayText removes ANSI escapes, control bytes, and bidi overrides", () => {
  const dirty = "\u001B[31mCaller:\u001B[0m Hello\u202E world\u0007";
  assert.equal(sanitizeDisplayText(dirty), "Caller: Hello world");
  assert.equal(sanitizeDisplayText("   ", "Fallback"), "Fallback");
  assert.equal(sanitizeInlineSnippet("one   two\n\tthree four", 12), "one two thr…");
});

test("East Africa locale helpers format TZS currency and EAT timezone dates", () => {
  const tzs = formatTzsLocale(1250000, "en");
  assert.ok(tzs.includes("1,250,000"));
  assert.ok(/TZS|TSh/i.test(tzs));

  const formatted = formatDateTimeInTz("2026-11-10T10:15:00.000Z", "Africa/Dar_es_Salaam", "en");
  // 10:15 UTC is 13:15 EAT (1:15 PM)
  assert.ok(/13:15|1:15/i.test(formatted));
});

test("Zod schemas validate strict API payloads and reject malformed data", () => {
  const validKpis = KpiSummaryResponseSchema.parse({
    window: {
      preset: "30d",
      from: "2026-10-16T00:00:00.000Z",
      to: "2026-11-15T23:59:59.000Z",
      prevFrom: "2026-09-16T00:00:00.000Z",
      prevTo: "2026-10-16T00:00:00.000Z",
    },
    totalWorkspaceCalls: 12,
    filteredCallsCount: 10,
    orgTargetScore: 85,
    lastAnalyzedAt: "2026-11-15T10:00:00.000Z",
    kpis: {
      callsAnalyzed: { value: 10, previousValue: null, delta: null, sparkline: [] },
      avgScore: { value: 82.5, previousValue: 80, delta: 2.5, sparkline: [{ date: "2026-11-14", value: 82.5 }] },
      complianceRate: { value: 94, previousValue: 92, delta: 2, sparkline: [] },
      positiveSentimentPct: { value: 70, previousValue: null, delta: null, sparkline: [] },
      needsReviewCount: { value: 2, previousValue: 3, delta: -1, sparkline: [] },
    },
  });
  assert.equal(validKpis.orgTargetScore, 85);

  assert.throws(() =>
    FlaggedCallsResponseSchema.parse({
      items: [{ id: "not-a-uuid" }],
      total: "bad",
    }),
  );

  assert.throws(() =>
    SessionResponseSchema.parse({
      user: { id: "bad-id" },
    }),
  );
});

