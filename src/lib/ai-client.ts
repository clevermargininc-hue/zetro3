import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";
import { durableFetch, resetDurableFetch } from "@/lib/durable-fetch";

let client: OpenAI | null = null;

export function resetOpenAI() {
  client = null;
  resetDurableFetch();
}

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
      fetch: durableFetch,
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

function errorText(error: unknown) {
  const parts = [error instanceof Error ? error.message : String(error)];
  if (error && typeof error === "object") {
    const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
    if (cause instanceof Error) parts.push(cause.message, cause.cause instanceof Error ? cause.cause.message : "");
    if (cause && typeof cause === "object" && "code" in cause) {
      parts.push(String((cause as { code?: string }).code));
    }
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function isConnectionError(error: unknown) {
  const message = errorText(error);
  return (
    message.includes("connection error") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("epipe") ||
    message.includes("fetch failed") ||
    message.includes("socket hang up") ||
    message.includes("network")
  );
}

export function isRetryableError(error: unknown) {
  const message = errorText(error);
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: number }).status)
      : 0;
  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500 ||
    message.includes("timeout") ||
    message.includes("etimedout") ||
    message.includes("rate limit") ||
    isConnectionError(error)
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

export function describeAiError(error: unknown) {
  if (isConnectionError(error)) {
    return "Could not reach OpenAI to score this call. Try the audit again in a moment.";
  }
  return error instanceof Error ? error.message : "AI request failed";
}

export async function withRetries<T>(run: () => Promise<T>) {
  const { aiMaxRetries } = getServerEnv();
  const attempts = Math.max(3, aiMaxRetries);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === attempts - 1) throw error;
      if (isConnectionError(error)) resetOpenAI();
      await sleep(600 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI request failed");
}
