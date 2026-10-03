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
      chars: (doc.extracted_text || "").trim().length,
    })),
    setupRequired: false,
  };
}

import { EXTRACTION_TRUNCATED_MARKER, extractDocumentText } from "@/lib/extract-document";

async function upgradeTruncatedDocuments(docs: QaDocument[], supabase: ReturnType<typeof createAdminClient>) {
  for (const doc of docs) {
    if (!doc.file_path || !doc.extracted_text?.includes(EXTRACTION_TRUNCATED_MARKER)) continue;
    try {
      const { data: fileBlob } = await supabase.storage.from("qa-documents").download(doc.file_path);
      if (!fileBlob) continue;
      const bytes = Buffer.from(await fileBlob.arrayBuffer());
      const fullText = await extractDocumentText(bytes, doc.file_name, doc.mime_type);
      if (fullText && fullText !== doc.extracted_text) {
        doc.extracted_text = fullText;
        await supabase.from("qa_documents").update({ extracted_text: fullText }).eq("id", doc.id);
      }
    } catch {
      // Ignore background upgrade errors; original text remains available
    }
  }
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

  const docs = (data || []) as QaDocument[];
  // If any legacy document was truncated at the old 60k upload cap, re-read full text from storage
  if (docs.some((d) => d.extracted_text?.includes(EXTRACTION_TRUNCATED_MARKER))) {
    await upgradeTruncatedDocuments(docs, supabase);
  }

  return docs;
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

const TABLE_HEADER_CELL =
  /^(no\.?|#|s\/?n|sr\.?|parameters?|sub[- ]?parameters?|criteria|criterion|attributes?|weight(age|ing)?|weights?|score|scores|marks?|points?|description|definition|details?|comments?|remarks?|category|categories|section|area|yes|no|n\/?a|na|%|max|maximum|achieved|result|guidelines?|examples?)$/i;

function isTableHeaderRow(line: string) {
  if (!line.includes("|")) return false;
  const cells = line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  return cells.length >= 2 && cells.every((cell) => TABLE_HEADER_CELL.test(cell));
}

/**
 * Pull scorable rule / parameter lines from the company's uploaded scorecard
 * (and related standards) so the model audits those rules instead of a generic rubric.
 */
export function extractCompanyRuleLines(docs: QaDocument[], limit = 250): string[] {
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
    const line = raw.replace(/\s+/g, " ").replace(/^\|\s*|\s*\|$/g, "").trim();
    if (line.length < 4 || line.length > 600) return;
    if (/^(sheet\s*\d+|page\s*\d+|table of contents|contents|index|appendix|revision|version|confidential|internal use)$/i.test(line)) {
      return;
    }
    if (/^(##\s*sheet:|---\s*page\s+\d+)/i.test(line)) return;
    if (/^(total|overall|grand total|sum|weight|score|parameter|criterion)$/i.test(line)) {
      return;
    }
    if (isTableHeaderRow(raw)) return;
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

      const isTableRow = /^\|.*\|$/.test(line) && line.split("|").filter((c) => c.trim()).length >= 2;
      const looksLikeRule =
        /\d+\s*%/.test(line) ||
        /\?/.test(line) ||
        /\b(auto\s*-?\s*zero|auto\s*-?\s*fail|auto\s*-?\s*100|auto\s*-?\s*pass|if applicable)\b/i.test(
          line,
        ) ||
        /^\d+[\).:-]\s+\S+/.test(line) ||
        /^[-*•]\s+\S+/.test(line) ||
        // Scorecard table row with a bare weight / points cell, e.g. "| Verified caller | 5 |"
        (doc.kind === "scorecard" &&
          isTableRow &&
          /\|\s*\d{1,3}(?:\.\d+)?\s*(?:%|pts?|points?|marks?)?\s*\|/i.test(line)) ||
        /\b(opening|closing|greeting|empathy|hold|tone|professional|resolution|knowledge|escalation|disposition|wrap\s*up|personalization|troubleshooting|listening|apology|education|upsell|ftr|first time|further assistance|product|compliance)\b/i.test(
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
    "Read every line carefully. Give a parameter score for each. Do not invent extra Zetro categories.",
    "Each line is INDEPENDENT — score and deduct only against that line. Do not move a hold miss into opening, product knowledge, further assistance, etc.",
    "Use the EXACT weight % written on each line in the company scorecard (do not invent 5/10/20/25 defaults).",
    "Respect special marks on each line: (Auto Zero) / Auto-Fail, (Auto 100) / Auto-Pass, If applicable — apply only to that line.",
    "The same recording + these same rules must produce consistent scores (±5) across accounts and re-audits.",
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
  ].join("\n");
}

/**
 * Company files for the prompt. Every file is sent in full — oversized files arrive here
 * already replaced by a section-by-section rule digest (see standards-reader), never cut.
 */
export function formatQaContext(docs: QaDocument[]) {
  const order = ["scorecard", "compliance", "document"] as const;
  return order.map((kind) => {
    const items = docs.filter(
      (doc) => doc.kind === kind && (doc.extracted_text || "").trim().length >= MIN_READABLE_CHARS,
    );
    if (!items.length) return "";
    const heading =
      kind === "scorecard"
        ? "SCORECARD — READ EVERY RULE CAREFULLY, EVERY SHEET AND EVERY TABLE ROW TO THE END. This file is the only scoring rubric. Score every criterion / weight / Auto-Zero / Auto-100 / If-applicable line in it. Be consistent every time."
        : kind === "compliance"
          ? "COMPLIANCE — READ EVERY RULE CAREFULLY, TO THE END OF EACH FILE. Flag every breach of these company rules."
          : "PROCESS DOCUMENTS — READ THESE RULES CAREFULLY, TO THE END OF EACH FILE. Required scripts, steps, product names, and key terms.";
    return `## ${heading}\n\n${items
      .map((doc) => {
        const body = (doc.extracted_text || "").trim();
        return `### FILE: ${doc.file_name}\nTitle: ${doc.title}\nKind: ${QA_KIND_LABELS[doc.kind]}\n\n${body}\n\n### END OF FILE: ${doc.file_name}`;
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
