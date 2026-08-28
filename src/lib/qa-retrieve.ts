import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import { chunkText, cosineSimilarity, embedQuery, embedTexts } from "@/lib/embeddings";
import { ALL_DOCUMENT_KINDS, QA_KINDS, SCRIPT_KINDS, type QaDocument, type QaKind } from "@/lib/qa-kinds";
import { formatQaContext } from "@/lib/qa-documents";
import { formatCallScripts } from "@/lib/call-scripts";

type StoredChunk = {
  document_id: string;
  kind: QaKind;
  content: string;
  embedding: number[] | string;
};

function asVector(value: number[] | string) {
  if (Array.isArray(value)) return value.map(Number);
  try {
    const parsed = JSON.parse(value) as number[];
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

export async function indexQaDocument(doc: QaDocument) {
  const chunks = chunkText(doc.extracted_text);
  if (!chunks.length) return;
  const embeddings = await embedTexts(chunks);
  const supabase = createAdminClient();
  await supabase.from("qa_document_chunks").delete().eq("document_id", doc.id);

  const rows = chunks.map((content, index) => ({
    document_id: doc.id,
    user_id: doc.user_id,
    kind: doc.kind,
    chunk_index: index,
    content,
    embedding: embeddings[index],
  }));

  const { error } = await supabase.from("qa_document_chunks").insert(rows);
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.toLowerCase().includes("qa_document_chunks")
    ) {
      return;
    }
    throw new Error(error.message);
  }
}

function documentReferenceQuery(docs: QaDocument[]) {
  const parts = docs.map((doc) => {
    const text = (doc.extracted_text || "").replace(/\s+/g, " ").trim();
    return `${doc.kind}: ${doc.title} (${doc.file_name})\n${text.slice(0, 500)}`;
  });
  return [
    "Company standards reference: scorecard criteria, compliance rules, process steps, product names, and required key terms.",
    "Do not use a call transcript. Rank chunks from these uploaded files.",
    parts.join("\n\n"),
  ]
    .join("\n\n")
    .slice(0, 4000);
}

export async function retrieveQaContext(userId: string, docs: QaDocument[]) {
  const supabase = createAdminClient();
  const teamScope = await getTeamScope(userId);
  const { data, error } = await supabase
    .from("qa_document_chunks")
    .select("document_id, kind, content, embedding")
    .in("user_id", teamScope);

  if (error || !data?.length) {
    return formatQaContext(docs);
  }

  const query = await embedQuery(documentReferenceQuery(docs));

  const ranked = (data as StoredChunk[])
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(query, asVector(chunk.embedding)),
    }))
    .sort((a, b) => b.score - a.score);

  const limits: Record<QaKind, number> = {
    scorecard: 8,
    compliance: 8,
    document: 6,
    opening: 3,
    closing: 3,
    holding: 3,
  };

  const picked = ALL_DOCUMENT_KINDS.flatMap((kind) =>
    ranked.filter((row) => row.kind === kind).slice(0, limits[kind]),
  );

  const scriptBlock = formatCallScripts(docs);
  if (!picked.length) {
    return [formatQaContext(docs), scriptBlock].filter(Boolean).join("\n\n");
  }

  const byKind = QA_KINDS.map((kind) => {
    const items = picked.filter((row) => row.kind === kind);
    if (!items.length) {
      const fallback = docs.filter((doc) => doc.kind === kind);
      if (!fallback.length) return "";
      return formatQaContext(fallback);
    }
    const heading =
      kind === "scorecard"
        ? "SCORECARD — from company files; this is the only scoring rubric"
        : kind === "compliance"
          ? "COMPLIANCE — from company files; flag every breach"
          : "PROCESS DOCUMENTS — from company files; required scripts, steps, and key terms";
    return `## ${heading}\n\n${items
      .map((row, index) => `### Chunk ${index + 1}\n${row.content}`)
      .join("\n\n")}`;
  }).filter(Boolean);

  const scriptChunks = SCRIPT_KINDS.map((kind) => {
    const items = picked.filter((row) => row.kind === kind);
    if (!items.length) return "";
    const heading =
      kind === "opening"
        ? "OPENING SCRIPT — from company files"
        : kind === "closing"
          ? "CLOSING SCRIPT — from company files"
          : "HOLDING PROCEDURE — from company files (optional; score only if the call went on hold)";
    return `## ${heading}\n\n${items
      .map((row, index) => `### Chunk ${index + 1}\n${row.content}`)
      .join("\n\n")}`;
  }).filter(Boolean);

  return [...byKind, scriptBlock || scriptChunks.join("\n\n")].filter(Boolean).join("\n\n");
}
