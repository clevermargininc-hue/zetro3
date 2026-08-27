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
      `Documents scoring is blocked until Zetro can read a ${missing.map((kind) => QA_KIND_LABELS[kind]).join(", ")}. Open Standards to upload them. Automatic auditing does not need these files.`,
    );
  }
  return readable;
}

export function formatQaContext(docs: QaDocument[]) {
  return QA_KINDS.map((kind) => {
    const items = docs.filter((doc) => doc.kind === kind);
    if (!items.length) return "";
    const heading =
      kind === "scorecard"
        ? "SCORECARD — use this as the only scoring rubric"
        : kind === "compliance"
          ? "COMPLIANCE — flag every breach of these rules"
          : "PROCESS DOCUMENTS — required scripts, steps, and product facts";
    return `## ${heading}\n\n${items
      .map((doc) => `### ${doc.title} (${doc.file_name})\n${(doc.extracted_text || "").slice(0, 4000)}`)
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
