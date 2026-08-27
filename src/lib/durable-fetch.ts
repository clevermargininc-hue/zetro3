import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";

dns.setDefaultResultOrder("ipv4first");

function createAgent() {
  return new Agent({
    allowH2: false,
    pipelining: 0,
    connections: 4,
    keepAliveTimeout: 10_000,
    keepAliveMaxTimeout: 15_000,
    connect: {
      allowH2: false,
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

export async function durableFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input
        : input.url;
  try {
    const response = await undiciFetch(url, {
      method: init?.method,
      headers: init?.headers as Record<string, string> | undefined,
      body: init?.body as string | Buffer | Uint8Array | undefined,
      signal: init?.signal as AbortSignal | undefined,
      dispatcher: agent,
    });
    return response as unknown as Response;
  } catch (error) {
    resetDurableFetch();
    throw error;
  }
}
