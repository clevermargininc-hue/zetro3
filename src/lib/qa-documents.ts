import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import {
  MIN_READABLE_CHARS,
  QA_KIND_LABELS,
  QA_KINDS,
  ALL_DOCUMENT_KINDS,
  type QaDocument,
  type QaReadiness,
  type StandardRef,
} from "@/lib/qa-kinds";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = (error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    (message.includes("qa_documents") && message.includes("does not exist"))
  );
}

function emptyCounts(): Record<(typeof ALL_DOCUMENT_KINDS)[number], number> {
  return {
    document: 0,
    scorecard: 0,
    compliance: 0,
    opening: 0,
    closing: 0,
    holding: 0,
  };
}

export function summarizeDocuments(docs: QaDocument[]): QaReadiness {
  const readable = docs.filter((doc) => (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS);
  const counts = emptyCounts();
  for (const kind of ALL_DOCUMENT_KINDS) {
    counts[kind] = readable.filter((d) => d.kind === kind).length;
  }
  const missing = QA_KINDS.filter((kind) => counts[kind] === 0);
  return {
    ready: missing.length === 0,
    missing,
    counts,
    documents: docs.map((doc) => ({
      id: doc.id,
      kind: doc.kind,
      title: doc.title,
      file_name: doc.file_name,
      created_at: doc.created_at,
      has_text: (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS,
    })),
    setupRequired: false,
  };
}

export async function loadQaDocuments(userId: string): Promise<QaDocument[]> {
  const supabase = createAdminClient();
  const teamScope = await getTeamScope(userId);
  const { data, error } = await supabase
    .from("qa_documents")
    .select("*")
    .in("user_id", teamScope)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) {
      const setup = new Error(
        "Run supabase/qa-standards.sql in the Supabase SQL Editor, then upload a process document, scorecard, and compliance file.",
      );
      (setup as Error & { setupRequired?: boolean }).setupRequired = true;
      throw setup;
    }
    throw new Error(error.message);
  }

  return (data || []) as QaDocument[];
}

export function requireReadableStandards(docs: QaDocument[]) {
  const readable = docs.filter((doc) => (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS);
  const missing = QA_KINDS.filter((kind) => !readable.some((doc) => doc.kind === kind));
  if (missing.length) {
    throw new Error(
      `Documents scoring is blocked until Zetro can read a ${missing.map((kind) => QA_KIND_LABELS[kind]).join(", ")}. Open Standards to upload them.`,
    );
  }
  return readable;
}

export function formatCompanyFileIndex(docs: QaDocument[]) {
  const lines = docs
    .filter((doc) => (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS)
    .map((doc) => `- ${QA_KIND_LABELS[doc.kind] || doc.kind}: ${doc.title} (${doc.file_name})`);
  if (!lines.length) return "";
  return `FILE INDEX — scores, criteria, key terms, and product names may come only from these uploaded files:\n${lines.join("\n")}`;
}

/**
 * Pull scorable rule / parameter lines from the company's uploaded scorecard
 * (and related standards) so the model audits those rules instead of a generic rubric.
 */
export function extractCompanyRuleLines(docs: QaDocument[], limit = 60): string[] {
  const preferred = docs.filter(
    (doc) =>
      (doc.kind === "scorecard" || doc.kind === "compliance" || doc.kind === "document") &&
      (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS,
  );
  const scorecards = preferred.filter((doc) => doc.kind === "scorecard");
  const sources = scorecards.length ? scorecards : preferred;

  const out: string[] = [];
  const seen = new Set<string>();

  function push(raw: string, fileName: string) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 4 || line.length > 220) return;
    if (/^(sheet|page|total|overall|grand total|sum|weight|score|parameter|criterion)\b/i.test(line)) {
      return;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(`${line} [${fileName}]`);
  }

  for (const doc of sources) {
    const text = (doc.extracted_text || "").replace(/\r/g, "\n");
    const fileName = doc.file_name || doc.title;

    for (const block of text.split(/\n+/)) {
      const line = block.replace(/\s+/g, " ").trim();
      if (!line) continue;

      const looksLikeRule =
        /\d+\s*%/.test(line) ||
        /\?/.test(line) ||
        /\b(auto\s*-?\s*zero|auto\s*-?\s*fail|if applicable)\b/i.test(line) ||
        /^\d+[\).:-]\s+\S+/.test(line) ||
        /^[-*•]\s+\S+/.test(line) ||
        /\b(opening|closing|greeting|empathy|hold|tone|professional|resolution|knowledge|escalation|disposition|wrap\s*up|personalization|troubleshooting|listening|apology|education|upsell|ftr|first time)\b/i.test(
          line,
        );

      if (looksLikeRule) push(line.replace(/^[-*•]\s+/, "").replace(/^\d+[\).:-]\s+/, ""), fileName);
      if (out.length >= limit) return out;
    }

    // Spreadsheet-style cells often land as short phrases without newlines between weights.
    if (doc.kind === "scorecard") {
      for (const match of text.matchAll(
        /([A-Za-z][A-Za-z0-9/()'’&., +\-]{8,120}?\??)\s*[-–:]?\s*(\d{1,2}(?:\.\d+)?)\s*%/g,
      )) {
        push(`${match[1].trim()} — ${match[2]}%`, fileName);
        if (out.length >= limit) return out;
      }
    }
  }

  return out;
}

export function formatCompanyRuleChecklist(docs: QaDocument[]) {
  const rules = extractCompanyRuleLines(docs);
  if (!rules.length) return "";
  return [
    "COMPANY RULE CHECKLIST — AUDIT ONLY THESE RULES FROM THE USER'S UPLOADED FILES.",
    "Read every line. Give a parameter score for each. Do not invent extra Zetro categories.",
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
  ].join("\n");
}

export function formatQaContext(docs: QaDocument[]) {
  const limits: Record<(typeof QA_KINDS)[number], number> = {
    // Scorecard must stay nearly complete — it drives the company parameter list.
    scorecard: 32000,
    compliance: 18000,
    document: 16000,
  };
  const order = ["scorecard", "compliance", "document"] as const;
  return order.map((kind) => {
    const items = docs.filter((doc) => doc.kind === kind);
    if (!items.length) return "";
    const heading =
      kind === "scorecard"
        ? "SCORECARD — READ EVERY RULE. This file is the only scoring rubric. Score every criterion / weight / Auto-Zero line in it."
        : kind === "compliance"
          ? "COMPLIANCE — READ EVERY RULE. Flag every breach of these company rules."
          : "PROCESS DOCUMENTS — READ THESE RULES. Required scripts, steps, product names, and key terms.";
    return `## ${heading}\n\n${items
      .map((doc) => {
        const body = (doc.extracted_text || "").trim();
        const max = limits[kind];
        const text =
          body.length > max
            ? `${body.slice(0, max)}\n[…remainder of ${doc.file_name} truncated; use the COMPANY RULE CHECKLIST above for the scored lines…]`
            : body;
        return `### FILE: ${doc.file_name}\nTitle: ${doc.title}\nKind: ${QA_KIND_LABELS[doc.kind]}\n\n${text}`;
      })
      .join("\n\n")}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

export function standardsUsed(docs: QaDocument[]): StandardRef[] {
  return docs.map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    file_name: doc.file_name,
  }));
}
