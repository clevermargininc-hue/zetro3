/**
 * Pluggable error monitoring hook (Sentry-compatible).
 * Activated when NEXT_PUBLIC_SENTRY_DSN (browser) or SENTRY_DSN (server) is set.
 * Never ships server secrets into client bundles.
 */

export type ErrorContext = {
  area: string;
  requestId?: string | null;
  status?: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type SentryEnvelopeHeader = {
  dsn: string;
  sent_at: string;
};

function parseDsnParts(dsn: string): { storeUrl: string; publicKey: string } | null {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\/+/, "");
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return null;
    const storeUrl = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`;
    return { storeUrl, publicKey };
  } catch {
    return null;
  }
}

async function sendSentryEnvelope(
  dsn: string,
  errorName: string,
  errorMessage: string,
  context: ErrorContext,
) {
  const parts = parseDsnParts(dsn);
  if (!parts) return;

  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : String(Date.now());

  const header: SentryEnvelopeHeader = {
    dsn,
    sent_at: new Date().toISOString(),
  };

  const payload = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    tags: {
      area: context.area,
      ...(context.status != null ? { http_status: String(context.status) } : {}),
      ...(context.requestId ? { request_id: context.requestId } : {}),
    },
    extra: context.metadata || {},
    exception: {
      values: [{ type: errorName, value: errorMessage }],
    },
  };

  const envelope = `${JSON.stringify(header)}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(payload)}\n`;

  try {
    await fetch(parts.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parts.publicKey}`,
      },
      body: envelope,
      keepalive: true,
    });
  } catch {
    // Monitoring must never cascade failures back to the UI or API.
  }
}

export function reportClientError(error: unknown, context: ErrorContext) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[zetro-telemetry]", context.area, {
    message: err.message,
    requestId: context.requestId ?? undefined,
    status: context.status,
    metadata: context.metadata,
  });

  const dsn =
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_SENTRY_DSN : undefined;
  if (dsn) {
    void sendSentryEnvelope(dsn, err.name || "Error", err.message, context);
  }
}

export function reportServerError(error: unknown, context: ErrorContext) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[zetro-server-error]", context.area, {
    message: err.message,
    requestId: context.requestId ?? undefined,
    status: context.status,
    metadata: context.metadata,
  });

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    void sendSentryEnvelope(dsn, err.name || "Error", err.message, context);
  }
}

