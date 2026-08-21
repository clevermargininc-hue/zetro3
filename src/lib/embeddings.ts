import { getEmbeddingClient, withRetries } from "@/lib/ai-client";
import { getServerEnv } from "@/lib/env";

const BATCH = 16;

export function chunkText(text: string, size = 900, overlap = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + size);
    const slice = clean.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.slice(0, 80);
}

export async function embedTexts(inputs: string[]) {
  const openai = getEmbeddingClient();
  const { aiEmbeddingModel } = getServerEnv();
  const vectors: number[][] = [];

  for (let i = 0; i < inputs.length; i += BATCH) {
    const batch = inputs.slice(i, i + BATCH);
    const response = await withRetries(() =>
      openai.embeddings.create({
        model: aiEmbeddingModel,
        input: batch,
      }),
    );
    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    for (const row of ordered) vectors.push(row.embedding);
  }

  return vectors;
}

export async function embedQuery(text: string) {
  const [vector] = await embedTexts([text.slice(0, 8000)]);
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom ? dot / denom : 0;
}
