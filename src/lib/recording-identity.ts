export type RecordingIdentityInput = {
  callId: string;
  fileName?: string | null;
  title?: string | null;
  durationSeconds?: number | null;
  audioFingerprint?: string | null;
};

const GENERIC_NAMES = new Set([
  "audio",
  "call",
  "recording",
  "voice recording",
  "untitled",
  "unknown",
]);

export function normalizeRecordingName(value?: string | null): string | null {
  if (!value) return null;
  const name = value
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\s*\((?:copy|\d+)\)$/i, "")
    .replace(/\s+(?:copy|duplicate)$/i, "")
    .replace(/[_\s-]+/g, " ")
    .trim()
    .toLowerCase();
  return name && !GENERIC_NAMES.has(name) ? name : null;
}

/**
 * Identifies the physical audio, not its audit row. A cryptographic fingerprint
 * is preferred. Historical uploads fall back to their original name + duration.
 */
export function recordingIdentityKey(input: RecordingIdentityInput): string {
  const fingerprint = input.audioFingerprint?.trim().toLowerCase();
  if (fingerprint && /^[a-f0-9]{64}$/.test(fingerprint)) return `sha256:${fingerprint}`;

  const name = normalizeRecordingName(input.fileName) || normalizeRecordingName(input.title);
  const duration = Number(input.durationSeconds);
  if (name && Number.isFinite(duration) && duration > 0) {
    return `file:${name}|seconds:${Math.round(duration)}`;
  }
  return `call:${input.callId}`;
}

