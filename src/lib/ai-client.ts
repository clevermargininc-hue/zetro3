import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI() {
  const env = getServerEnv();
  if (env.llmProvider !== "openai") {
    throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}. Use openai.`);
  }
  if (!client) {
    client = new OpenAI({
      apiKey: env.openaiKey,
      project: env.openaiProject,
      timeout: env.aiTimeoutMs,
      maxRetries: 0,
    });
  }
  return client;
}

export function getEmbeddingClient() {
  const env = getServerEnv();
  if (env.embeddingProvider !== "openai") {
    throw new Error(`Unsupported EMBEDDING_PROVIDER: ${env.embeddingProvider}. Use openai.`);
  }
  return getOpenAI();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: number }).status)
    : 0;
  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500 ||
    message.includes("timeout") ||
    message.includes("ETIMEDOUT") ||
    message.includes("rate limit")
  );
}

export function isModelAccessError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not have access to model") ||
    message.includes("model_not_found") ||
    message.includes("invalid_model") ||
    message.includes("is not a valid model")
  );
}

export async function withRetries<T>(run: () => Promise<T>) {
  const { aiMaxRetries } = getServerEnv();
  let lastError: unknown;
  for (let attempt = 0; attempt < aiMaxRetries; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === aiMaxRetries - 1) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI request failed");
}
