import type { CallStatus, Verdict } from "./types";

export function formatClock(ms: number | null | undefined) {
  if (ms == null || Number.isNaN(ms)) return "0:00";
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  return formatClock(seconds * 1000);
}

/** Average handle time from call duration in seconds (mm:ss or h:mm:ss). */
export function formatAht(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  return formatDuration(seconds);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function scoreTone(score: number | null | undefined) {
  if (score == null) return "muted";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "poor";
}

export function verdictLabel(verdict: Verdict | string | null) {
  switch (verdict) {
    case "excellent":
      return "Excellent service";
    case "good":
      return "Good service";
    case "needs_improvement":
      return "Needs improvement";
    case "poor":
      return "Poor service";
    default:
      return "Not scored";
  }
}

export function statusLabel(status: CallStatus) {
  switch (status) {
    case "queued":
      return "Uploaded";
    case "transcribing":
      return "Transcribing";
    case "transcribed":
      return "Ready to audit";
    case "analyzing":
      return "Scoring the agent";
    case "completed":
      return "Scored";
    case "failed":
      return "Failed";
  }
}

export type AuditStatus = "processing" | "transcribed" | "audited" | "failed";

export function auditStatus(status: CallStatus): AuditStatus {
  if (status === "completed") return "audited";
  if (status === "transcribed") return "transcribed";
  if (status === "failed") return "failed";
  return "processing";
}

export function auditLabel(status: CallStatus) {
  switch (auditStatus(status)) {
    case "audited":
      return "Scored / Audited";
    case "transcribed":
      return "Ready to audit";
    case "failed":
      return "Failed";
    default:
      return "Processing";
  }
}

export function isCallAudited(status: CallStatus) {
  return status === "completed";
}

/** Calls still in the prepare workflow (not yet audited). */
export const PREPARE_QUEUE_STATUSES: CallStatus[] = [
  "queued",
  "transcribing",
  "failed",
];

/** Calls waiting on Score. Audited calls live in Call inventory. */
export const SCORE_QUEUE_STATUSES: CallStatus[] = ["transcribed", "analyzing"];

export function pipelineQueueCounts(statuses: Array<CallStatus | string>) {
  let prepare = 0;
  let score = 0;
  for (const status of statuses) {
    if (PREPARE_QUEUE_STATUSES.includes(status as CallStatus)) prepare += 1;
    else if (SCORE_QUEUE_STATUSES.includes(status as CallStatus)) score += 1;
  }
  return { prepare, score };
}

/**
 * Recording names end with the agent id, e.g.
 * "…_255629623681_6223.mp3" → "6223". Timestamp-prefixed files
 * ("20260801T043733.479Z_1-001785559053") keep the id after the stamp.
 */
export function agentIdFromFile(value: string | null | undefined) {
  const base = (value || "").split(/[\\/]/).pop()?.trim() || "";
  if (!base) return "Unknown";
  const stem = base.replace(/\.(?:mp3|wav|m4a|ogg|webm|mp4|aac|flac|mpeg)$/i, "");
  const trailing = /_(\d{2,8})$/.exec(stem);
  if (trailing) return trailing[1];
  const stamped = /^(?:\d{8}T\d{6}(?:[.,]\d+)?Z?)[_-](.+)$/i.exec(stem);
  if (stamped?.[1]) return stamped[1];
  return stem || "Unknown";
}

/** Prefer linked agent name; otherwise parse from the recording filename. */
export function agentLabel(
  call: {
    file_name?: string | null;
    title?: string | null;
    agents?: { name?: string | null } | { name?: string | null }[] | null;
  },
) {
  const agent = Array.isArray(call.agents) ? call.agents[0] : call.agents;
  const named = agent?.name?.trim();
  if (named) return named;
  return agentIdFromFile(call.file_name || call.title);
}

export function languageLabel(mode: string | null) {
  switch (mode) {
    case "en":
      return "English";
    case "sw":
      return "Kiswahili";
    case "mixed":
      return "English + Kiswahili";
    case "auto":
      return "Auto-detect";
    default:
      return mode || "Unknown";
  }
}
