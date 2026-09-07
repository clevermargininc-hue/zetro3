import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import type { RequestInfo as UndiciRequestInfo, RequestInit as UndiciRequestInit } from "undici";
import { isNetworkFailure } from "@/lib/network-error";

dns.setDefaultResultOrder("ipv4first");

function createAgent() {
  return new Agent({
    allowH2: false,
    pipelining: 0,
    connections: 8,
    keepAliveTimeout: 10_000,
    keepAliveMaxTimeout: 15_000,
    connect: {
      timeout: 20_000,
    },
  });
}

let agent = createAgent();

export function resetDurableFetch() {
  const previous = agent;
  agent = createAgent();
  void previous.close().catch(() => undefined);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function durableFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await undiciFetch(input as UndiciRequestInfo, {
        ...(init as UndiciRequestInit | undefined),
        dispatcher: agent,
      });
      return response as unknown as Response;
    } catch (error) {
      lastError = error;
      resetDurableFetch();
      if (!isNetworkFailure(error) || attempt === 3) {
        throw error;
      }
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}
