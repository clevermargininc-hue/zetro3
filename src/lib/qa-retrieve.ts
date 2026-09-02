import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamScope } from "@/lib/workspaces";
import { chunkText, cosineSimilarity, embedQuery, embedTexts } from "@/lib/embeddings";
import { ALL_DOCUMENT_KINDS, QA_KINDS, SCRIPT_KINDS, type QaDocument, type QaKind } from "@/lib/qa-kinds";
import { formatCallScripts } from "@/lib/call-scripts";
import {
  formatCompanyFileIndex,
  formatCompanyRuleChecklist,
  formatQaContext,
} from "@/lib/qa-documents";

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

async function extraRulesForCall(userId: string, callText: string) {
  if (!callText.trim()) return "";
  const supabase = createAdminClient();
  const teamScope = await getTeamScope(userId);
  const { data, error } = await supabase
    .from("qa_document_chunks")
    .select("document_id, kind, content, embedding")
    .in("user_id", teamScope);

  if (error || !data?.length) return "";

  const query = await embedQuery(
    `Find company scorecard criteria, compliance rules, and process steps that apply to this call.\n\n${callText.slice(0, 6000)}`,
  );

  const ranked = (data as StoredChunk[])
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(query, asVector(chunk.embedding)),
    }))
    .sort((a, b) => b.score - a.score);

  const limits: Record<QaKind, number> = {
    scorecard: 12,
    compliance: 10,
    document: 8,
    opening: 3,
    closing: 3,
    holding: 3,
  };

  const picked = ALL_DOCUMENT_KINDS.flatMap((kind) =>
    ranked.filter((row) => row.kind === kind && row.score > 0.12).slice(0, limits[kind]),
  );
  if (!picked.length) return "";

  const byKind = [...QA_KINDS, ...SCRIPT_KINDS]
    .map((kind) => {
      const items = picked.filter((row) => row.kind === kind);
      if (!items.length) return "";
      return `## Extra ${kind} rules matched to this call\n\n${items
        .map((row, index) => `### Match ${index + 1}\n${row.content}`)
        .join("\n\n")}`;
    })
    .filter(Boolean);

  return byKind.join("\n\n");
}

/**
 * Always send the uploaded company files. Retrieval only adds extra matched rules
 * for this call — it never replaces the files.
 */
export async function retrieveQaContext(
  userId: string,
  docs: QaDocument[],
  callText = "",
) {
  const checklist = formatCompanyRuleChecklist(docs);
  const files = formatQaContext(docs);
  const scripts = formatCallScripts(docs);
  const extra = await extraRulesForCall(userId, callText).catch(() => "");

  return [
    "COMPANY FILES — READ THESE RULES BEFORE ANY SCORE.",
    "Audit this call ONLY against the customer's / workspace's uploaded Standards files.",
    "Do not invent a Zetro rubric. Do not skip scorecard lines. Do not invent criteria.",
    formatCompanyFileIndex(docs),
    checklist,
    files,
    scripts,
    extra
      ? `ADDITIONAL RULES MATCHED TO THIS CONVERSATION (still from company files only):\n\n${extra}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
