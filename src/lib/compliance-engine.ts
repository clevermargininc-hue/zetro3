import { MIN_READABLE_CHARS, type QaDocument } from "@/lib/qa-kinds";
import { cleanScoreLine, cleanScoreQuote } from "@/lib/clean-score-text";
import type {
  ComplianceCheck,
  ComplianceResult,
  ComplianceSeverity,
  MetricEvidence,
} from "@/lib/types";

export type CompanyComplianceRule = {
  name: string;
  file_name: string;
  severity: ComplianceSeverity;
  auto_fail: boolean;
  if_applicable: boolean;
};

export type CompliancePlaybookEntry = CompanyComplianceRule & {
  meaning: string;
  pass_requires: string;
  fail_when: string;
};

const SKIP_LINE =
  /^(sheet|page|table of contents|contents|index|appendix|revision|version|confidential|internal use)\b/i;

const COMPLIANCE_KIND = /\b(must|shall|must not|shall not|never|do not|don't|prohibited|forbidden|required|mandatory|always|ensure that|is required|not permitted|not allowed)\b/i;

const COMPLIANCE_TOPIC =
  /\b(consent|disclosure|disclaimer|recording|personal data|pii|pci|otp|one[ -]?time|password|\bpin\b|id verification|kyc|gdpr|popia|data protection|confidential|script adherence|compliance|auto[ -]?fail|auto[ -]?zero|non[ -]?negotiable|do not share|do not disclose)\b/i;

const CRITICAL_MARK =
  /\b(auto[ -]?fail|auto[ -]?zero|prohibited|forbidden|never|illegal|pci|password|\bpin\b|otp|one[ -]?time|pii|personal data|recording without|without consent|must not|shall not)\b/i;

function readableDocs(docs: QaDocument[]) {
  return docs.filter((doc) => (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS);
}

function inferSeverity(line: string, autoFail: boolean): ComplianceSeverity {
  if (autoFail || CRITICAL_MARK.test(line)) return "critical";
  if (/\b(must|shall|required|mandatory)\b/i.test(line)) return "major";
  return "minor";
}

function looksLikeRule(line: string, fromComplianceFile: boolean) {
  const clean = line.replace(/^\|\s*|\s*\|$/g, "").trim();
  if (clean.length < 8 || clean.length > 500) return false;
  if (SKIP_LINE.test(clean)) return false;
  if (fromComplianceFile) {
    return (
      COMPLIANCE_KIND.test(clean) ||
      COMPLIANCE_TOPIC.test(clean) ||
      /^\d+[\).:-]\s+\S+/.test(clean) ||
      /^[-*•]\s+\S+/.test(clean) ||
      clean.includes("|")
    );
  }
  return COMPLIANCE_KIND.test(clean) && COMPLIANCE_TOPIC.test(clean);
}

function splitLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Pull enforceable rules from uploaded compliance files (and related policy lines).
 * Scorecard quality metrics stay on the scorecard — they are not compliance.
 */
export function extractCompanyComplianceRules(docs: QaDocument[], limit = 150): CompanyComplianceRule[] {
  const sources = readableDocs(docs);
  const out: CompanyComplianceRule[] = [];
  const seen = new Set<string>();

  function push(raw: string, fileName: string) {
    const name = raw
      .replace(/^\|\s*|\s*\|$/g, "")
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[\).:-]\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (name.length < 8 || name.length > 500) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const auto_fail = /\b(auto[ -]?fail|auto[ -]?zero)\b/i.test(name);
    const if_applicable = /\bif applicable\b/i.test(name);
    out.push({
      name,
      file_name: fileName,
      severity: inferSeverity(name, auto_fail),
      auto_fail,
      if_applicable,
    });
  }

  const complianceFiles = sources.filter((doc) => doc.kind === "compliance");
  const related = sources.filter((doc) => doc.kind === "document" || doc.kind === "scorecard");

  for (const doc of complianceFiles) {
    const fileName = doc.file_name || doc.title;
    for (const line of splitLines(doc.extracted_text)) {
      if (looksLikeRule(line, true)) push(line, fileName);
      if (out.length >= limit) return out;
    }
  }

  if (out.length < 15) {
    for (const doc of related) {
      const fileName = doc.file_name || doc.title;
      for (const line of splitLines(doc.extracted_text)) {
        if (looksLikeRule(line, false)) push(line, fileName);
        if (out.length >= limit) return out;
      }
    }
  }

  return out;
}

export function formatComplianceChecklist(rules: CompanyComplianceRule[]) {
  if (!rules.length) return "";
  return [
    "COMPANY COMPLIANCE CHECKLIST — CHECK ONLY THESE RULES FROM THE UPLOADED COMPLIANCE FILES.",
    "Output one compliance_checks row for every line. Do not invent extra laws. Do not treat scorecard quality misses as compliance.",
    "result must be pass, fail, or n/a (n/a only when the rule is If applicable and the situation did not arise).",
    ...rules.map((rule, index) => {
      const marks = [
        `file ${rule.file_name}`,
        rule.severity,
        rule.auto_fail ? "auto-fail" : "",
        rule.if_applicable ? "if applicable" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `${index + 1}. ${rule.name} [${marks}]`;
    }),
  ].join("\n");
}

export function formatCompliancePlaybookBlock(entries: CompliancePlaybookEntry[]) {
  if (!entries.length) return "";
  const lines = entries.map((row, index) => {
    const special = row.auto_fail
      ? "SPECIAL: company auto-fail — a genuine fail of this rule is a serious breach (cap overall at 49 unless scorecard Auto-Zero already forces 0)."
      : row.if_applicable
        ? "SPECIAL: If applicable — if the situation did not arise, mark n/a. Do not invent a fail."
        : `Severity: ${row.severity}.`;
    return [
      `${index + 1}. ${row.name} [${row.file_name}]`,
      `   Meaning: ${row.meaning || "as written in the company compliance file"}`,
      `   Pass requires: ${row.pass_requires || "the agent followed this company rule"}`,
      `   Fail when: ${row.fail_when || "the agent broke this company rule"}`,
      `   ${special}`,
    ].join("\n");
  });
  return [
    "COMPANY COMPLIANCE PLAYBOOK (read this before listing findings — built from uploaded compliance files):",
    "Check EVERY rule below against the call. Quote the moment. Do not invent rules that are not in these files.",
    ...lines,
  ].join("\n");
}

export function normalizeComplianceResult(value: unknown): ComplianceResult | null {
  const v = String(value || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (!v) return null;
  if (v === "fail" || v === "breach" || v === "miss" || v === "failed") return "fail";
  if (v === "na" || v === "n/a" || v === "notapplicable" || v === "ifapplicable") return "n/a";
  if (v === "pass" || v === "passed" || v === "ok" || v === "yes" || v === "followed") return "pass";
  return null;
}

export function normalizeComplianceSeverity(value: unknown): ComplianceSeverity {
  const v = String(value || "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "minor") return "minor";
  return "major";
}

function matchKey(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function resolveFileName(named: string, files: Array<{ file_name?: string; title?: string }>) {
  const allowed = files.map((doc) => doc.file_name || doc.title || "").filter(Boolean);
  const needle = named.trim().toLowerCase();
  if (!needle) return allowed[0] || "";
  return (
    allowed.find((name) => name.toLowerCase() === needle) ||
    allowed.find((name) => name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase())) ||
    allowed[0] ||
    ""
  );
}

export function normalizeComplianceChecks(
  raw: unknown,
  files: Array<{ file_name?: string; title?: string }>,
  utterances: Array<{ text?: string; start?: number }> = [],
): ComplianceCheck[] {
  const rows = Array.isArray(raw) ? raw : [];
  const out: ComplianceCheck[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const rule = cleanScoreLine(String(item.rule || item.name || item.criterion || "")).slice(0, 180);
    if (rule.length < 4) continue;
    const key = matchKey(rule);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const result = normalizeComplianceResult(item.result);
    if (!result) continue;
    const index = Number(item.utterance_index);
    const fromUtterance =
      Number.isFinite(index) && index >= 0 && index < utterances.length ? utterances[index] : null;
    const startRaw = Number(item.start_s);
    const start_s = fromUtterance?.start != null
      ? Math.floor(Number(fromUtterance.start) / 1000)
      : Number.isFinite(startRaw)
        ? Math.max(0, Math.round(startRaw))
        : null;
    out.push({
      rule,
      file_name: resolveFileName(cleanScoreLine(String(item.file_name || "")), files),
      result,
      severity: normalizeComplianceSeverity(item.severity),
      note: cleanScoreLine(String(item.note || "")).slice(0, 280),
      quote: cleanScoreQuote(String(item.quote || ""), String(fromUtterance?.text || "")).slice(0, 180),
      start_s,
    });
  }
  return out;
}

export function mergeComplianceChecks(
  modelChecks: ComplianceCheck[],
  playbook: CompliancePlaybookEntry[],
  files: Array<{ file_name?: string; title?: string }>,
): ComplianceCheck[] {
  if (!playbook.length) return modelChecks;
  const byKey = new Map(modelChecks.map((row) => [matchKey(row.rule), row]));
  return playbook.map((rule) => {
    const key = matchKey(rule.name);
    const hit = byKey.get(key);
    if (hit) {
      return {
        ...hit,
        rule: rule.name,
        file_name: hit.file_name || rule.file_name || resolveFileName("", files),
        severity: hit.severity || rule.severity,
      };
    }
    return {
      rule: rule.name,
      file_name: rule.file_name || resolveFileName("", files),
      result: rule.if_applicable ? "n/a" : "fail",
      severity: rule.severity,
      note: rule.if_applicable
        ? "If applicable — situation did not arise on this call."
        : "No clear evidence this company rule was followed on this call.",
      quote: "",
      start_s: null,
    } satisfies ComplianceCheck;
  });
}

export function findingsFromChecks(checks: ComplianceCheck[]): string[] {
  return checks
    .filter((row) => row.result === "fail")
    .map((row) => {
      const file = row.file_name ? ` [${row.file_name}]` : "";
      const evidence = row.quote ? ` Evidence: “${row.quote}”` : "";
      return `${row.rule}: ${row.note || "Breach of the company compliance file."}${file}${evidence}`;
    });
}

export function hasCriticalComplianceFail(checks: ComplianceCheck[], playbook: CompliancePlaybookEntry[] = []) {
  return checks.some((row) => {
    if (row.result !== "fail") return false;
    if (row.severity === "critical") return true;
    const guide = playbook.find((item) => matchKey(item.name) === matchKey(row.rule));
    return Boolean(guide?.auto_fail);
  });
}

export function complianceChecksFromScore(score: {
  compliance_findings?: unknown;
  metric_evidence?: MetricEvidence | null;
}): ComplianceCheck[] {
  const stored = score.metric_evidence?.compliance_checks;
  if (Array.isArray(stored) && stored.length) {
    return stored.filter((row) => row && typeof row === "object" && row.rule);
  }
  const findings = Array.isArray(score.compliance_findings)
    ? score.compliance_findings.map((item) => String(item).trim())
    : [];
  return findings
    .filter((item) => {
      const n = item.toLowerCase();
      return item && n !== "none identified" && n !== "none" && n !== "n/a";
    })
    .map((finding) => ({
      rule: finding.slice(0, 180),
      file_name: "",
      result: "fail" as const,
      severity: "major" as const,
      note: finding,
      quote: "",
      start_s: null,
    }));
}

export function failedComplianceFromScore(score: {
  compliance_findings?: unknown;
  metric_evidence?: MetricEvidence | null;
}): ComplianceCheck[] {
  return complianceChecksFromScore(score).filter((row) => row.result === "fail");
}

export function isCallComplianceClean(score: {
  compliance_findings?: unknown;
  metric_evidence?: MetricEvidence | null;
}) {
  return failedComplianceFromScore(score).length === 0;
}

export function summarizeComplianceChecks(checks: ComplianceCheck[]) {
  const passed = checks.filter((row) => row.result === "pass").length;
  const failed = checks.filter((row) => row.result === "fail").length;
  const n_a = checks.filter((row) => row.result === "n/a").length;
  const applicable = passed + failed;
  const followed_pct = applicable ? Math.round((passed / applicable) * 100) : null;
  const not_followed_pct = followed_pct == null ? null : 100 - followed_pct;
  return {
    rules: checks.length,
    passed,
    failed,
    n_a,
    applicable,
    followed_pct,
    not_followed_pct,
  };
}

export function complianceFollowRateFromScore(score: {
  compliance_findings?: unknown;
  metric_evidence?: MetricEvidence | null;
}) {
  const stored = score.metric_evidence?.compliance_checks;
  if (Array.isArray(stored) && stored.length) {
    return summarizeComplianceChecks(stored.filter((row) => row && typeof row === "object" && row.rule));
  }
  const failed = failedComplianceFromScore(score).length;
  if (failed > 0) {
    return {
      rules: failed,
      passed: 0,
      failed,
      n_a: 0,
      applicable: failed,
      followed_pct: 0,
      not_followed_pct: 100,
    };
  }
  return {
    rules: 0,
    passed: 0,
    failed: 0,
    n_a: 0,
    applicable: 0,
    followed_pct: null,
    not_followed_pct: null,
  };
}

export function rollupComplianceRate(rows: Array<{ passed: number; failed: number }>) {
  const passed = rows.reduce((sum, row) => sum + row.passed, 0);
  const failed = rows.reduce((sum, row) => sum + row.failed, 0);
  const applicable = passed + failed;
  if (!applicable) {
    return { followed_pct: null as number | null, not_followed_pct: null as number | null, applicable: 0, passed: 0, failed: 0 };
  }
  const followed_pct = Math.round((passed / applicable) * 100);
  return { followed_pct, not_followed_pct: 100 - followed_pct, applicable, passed, failed };
}
