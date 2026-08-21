import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText, cosineSimilarity, embedQuery, embedTexts } from "@/lib/embeddings";
import { QA_KINDS, type QaDocument, type QaKind } from "@/lib/qa-kinds";
import { formatQaContext } from "@/lib/qa-documents";

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

export async function retrieveQaContext(userId: string, transcript: string, docs: QaDocument[]) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("qa_document_chunks")
    .select("document_id, kind, content, embedding")
    .eq("user_id", userId);

  if (error || !data?.length) {
    return formatQaContext(docs);
  }

  const query = await embedQuery(
    `Call transcript for QA scoring and compliance review:\n${transcript.slice(0, 7000)}`,
  );

  const ranked = (data as StoredChunk[])
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(query, asVector(chunk.embedding)),
    }))
    .sort((a, b) => b.score - a.score);

  const limits: Record<QaKind, number> = {
    scorecard: 10,
    compliance: 10,
    document: 8,
  };

  const picked = QA_KINDS.flatMap((kind) =>
    ranked.filter((row) => row.kind === kind).slice(0, limits[kind]),
  );

  if (!picked.length) return formatQaContext(docs);

  const byKind = QA_KINDS.map((kind) => {
    const items = picked.filter((row) => row.kind === kind);
    if (!items.length) {
      const fallback = docs.filter((doc) => doc.kind === kind);
      if (!fallback.length) return "";
      return formatQaContext(fallback);
    }
    const heading =
      kind === "scorecard"
        ? "SCORECARD — retrieved by embeddings; this is the scoring rubric"
        : kind === "compliance"
          ? "COMPLIANCE — retrieved by embeddings; flag every breach"
          : "PROCESS DOCUMENTS — retrieved by embeddings; required scripts and steps";
    return `## ${heading}\n\n${items
      .map((row, index) => `### Chunk ${index + 1}\n${row.content}`)
      .join("\n\n")}`;
  }).filter(Boolean);

  return byKind.join("\n\n");
}
