export const PREPARE_NETWORK_MESSAGE =
  "Could not reach the transcription service. Check your internet connection and try again.";

export function networkErrorText(error: unknown) {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.name, error.message);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) parts.push(cause.name, cause.message);
    if (cause && typeof cause === "object") {
      const coded = cause as { code?: string; message?: string; errno?: string };
      if (coded.code) parts.push(String(coded.code));
      if (coded.message) parts.push(String(coded.message));
      if (coded.errno) parts.push(String(coded.errno));
    }
  } else if (error && typeof error === "object" && "message" in error) {
    parts.push(String((error as { message?: unknown }).message || ""));
  } else {
    parts.push(String(error ?? ""));
  }
  return parts.filter(Boolean).join(" ");
}

export function isNetworkFailure(error: unknown) {
  return /typeerror|fetch failed|failed to fetch|networkerror|load failed|und_err|econnreset|econnrefused|etimedout|enotfound|eai_again|socket hang up|other side closed|connect timeout|network/i.test(
    networkErrorText(error),
  );
}

export function friendlyNetworkError(
  error: unknown,
  fallback = PREPARE_NETWORK_MESSAGE,
) {
  if (isNetworkFailure(error)) return PREPARE_NETWORK_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const text = networkErrorText(error).trim();
  if (!text || text === "[object Object]") return fallback;
  if (isNetworkFailure(text)) return PREPARE_NETWORK_MESSAGE;
  return text;
}
