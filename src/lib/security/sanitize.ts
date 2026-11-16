/**
 * Input and transcript sanitization utilities.
 * Strips null bytes, ANSI escape sequences, and bidirectional spoofing controls
 * before rendering or exporting user-generated text or transcripts.
 */

const BIDI_AND_CONTROL_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
const ANSI_ESCAPE_RE = /\u001B\[[0-?]*[ -/]*[@-~]/g;

export function sanitizeDisplayText(
  value: string | null | undefined,
  fallback = "",
): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value
    .replace(ANSI_ESCAPE_RE, "")
    .replace(BIDI_AND_CONTROL_RE, "")
    .trim();
  return cleaned || fallback;
}

export function sanitizeInlineSnippet(
  value: string | null | undefined,
  maxLength = 400,
): string {
  const clean = sanitizeDisplayText(value, "").replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

