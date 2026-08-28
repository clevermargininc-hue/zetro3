import type { QaDocument } from "@/lib/qa-kinds";
import { ALL_DOCUMENT_KINDS, SCRIPT_KINDS, type ScriptKind } from "@/lib/qa-kinds";

const STOPWORDS = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "am",
    "i",
    "you",
    "we",
    "they",
    "he",
    "she",
    "it",
    "this",
    "that",
    "your",
    "our",
    "my",
    "me",
    "us",
    "please",
    "thank",
    "thanks",
    "hello",
    "hi",
    "yes",
    "no",
    "na",
    "ya",
    "wa",
    "kwa",
    "ni",
    "si",
    "la",
    "kutoka",
    "asante",
    "karibu",
    "habari",
  ].map((w) => w.toLowerCase()),
);

export function scriptsOf(docs: QaDocument[], kind: ScriptKind) {
  return docs.filter((doc) => doc.kind === kind && (doc.extracted_text || "").trim());
}

function scriptHeading(kind: ScriptKind) {
  if (kind === "opening") {
    return "OPENING SCRIPT — expected agent greeting / identity / first steps (organization-wide)";
  }
  if (kind === "closing") {
    return "CLOSING SCRIPT — expected agent wrap-up / confirmation / goodbye (organization-wide)";
  }
  return "HOLDING PROCEDURE — expected hold / wait / check-back protocol (optional; organization-specific). Score hold moments against this file only. If the customer was never placed on hold, do not penalize.";
}

export function formatCallScripts(docs: QaDocument[]) {
  return SCRIPT_KINDS.map((kind) => {
    const items = scriptsOf(docs, kind);
    if (!items.length) return "";
    return `## ${scriptHeading(kind)}\n\n${items
      .map((doc) => `### ${doc.title} (${doc.file_name})\n${doc.extracted_text.trim()}`)
      .join("\n\n")}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

/** Distinctive words/phrases from company documents (not from the call). */
export function extractKeytermsFromDocuments(docs: QaDocument[], limit = 48): string[] {
  const texts = ALL_DOCUMENT_KINDS.flatMap((kind) =>
    docs
      .filter((doc) => doc.kind === kind && (doc.extracted_text || "").trim())
      .map((doc) => doc.extracted_text || ""),
  );
  const seen = new Set<string>();
  const out: string[] = [];

  function push(term: string) {
    const cleaned = term.replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 80) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  }

  for (const text of texts) {
    for (const match of text.matchAll(/"([^"]{3,80})"|'([^']{3,80})'/g)) {
      push(match[1] || match[2] || "");
    }

    const words = text
      .replace(/[^\p{L}\p{N}\s\-']/gu, " ")
      .split(/\s+/)
      .filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const lower = word.toLowerCase();
      if (word.length >= 4 && !STOPWORDS.has(lower)) {
        if (/^[A-Z]/.test(word) || word.length >= 6) push(word);
      }
      if (i < words.length - 1) {
        const next = words[i + 1];
        if (
          word.length >= 3 &&
          next.length >= 3 &&
          !STOPWORDS.has(lower) &&
          !STOPWORDS.has(next.toLowerCase())
        ) {
          push(`${word} ${next}`);
        }
      }
    }
  }

  return out.slice(0, limit);
}

export function extractKeytermsFromScripts(docs: QaDocument[], limit = 48) {
  return extractKeytermsFromDocuments(docs, limit);
}

export function lexiconFromDocuments(docs: QaDocument[]) {
  return extractKeytermsFromDocuments(docs, 120)
    .flatMap((term) => term.split(/\s+/))
    .map((w) => w.toLowerCase().replace(/[^\p{L}]/gu, ""))
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export function lexiconFromScripts(docs: QaDocument[]) {
  return lexiconFromDocuments(docs);
}
