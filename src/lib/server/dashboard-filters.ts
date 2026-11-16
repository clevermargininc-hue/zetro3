import { DEFAULT_TIMEZONE } from "@/lib/i18n/dashboard";

export type DatePreset = "7d" | "30d" | "90d" | "custom";
export type ChannelFilter = "all" | "voice" | "whatsapp" | "email" | "chat" | "other";
export type SentimentFilter = "all" | "positive" | "neutral" | "negative";
export type CallSortField =
  | "created_at"
  | "overall_score"
  | "duration_seconds"
  | "agent_name"
  | "review_status";

export type DashboardFilterParams = {
  preset: DatePreset;
  fromIso: string;
  toIso: string;
  fromMs: number;
  toMs: number;
  prevFromIso: string;
  prevToIso: string;
  prevFromMs: number;
  prevToMs: number;
  timezone: string;
  teamId: string | null;
  queueId: string | null;
  agentId: string | null;
  channel: ChannelFilter;
  sentiment: SentimentFilter;
  needsReview: boolean;
  flagged: boolean;
  q: string;
  sortBy: CallSortField;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

const VALID_CHANNELS = new Set<ChannelFilter>(["all", "voice", "whatsapp", "email", "chat", "other"]);
const VALID_SENTIMENTS = new Set<SentimentFilter>(["all", "positive", "neutral", "negative"]);
const VALID_SORTS = new Set<CallSortField>([
  "created_at",
  "overall_score",
  "duration_seconds",
  "agent_name",
  "review_status",
]);

function parsePositiveInt(raw: string | null, fallback: number, min: number, max: number) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseBoolFlag(raw: string | null) {
  return raw === "1" || raw === "true";
}

function parseIsoDate(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Support YYYY-MM-DD cleanly across full UTC boundaries or full ISO timestamps
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = Date.parse(`${trimmed}T00:00:00.000Z`);
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

export function presetDays(preset: DatePreset): number {
  if (preset === "7d") return 7;
  if (preset === "90d") return 90;
  return 30;
}

export function parseDashboardFilters(
  url: URL,
  timezone = DEFAULT_TIMEZONE,
  nowMs = Date.now(),
): DashboardFilterParams {
  const sp = url.searchParams;
  const rawPreset = (sp.get("preset") || sp.get("range") || "30d").toLowerCase();
  let preset: DatePreset =
    rawPreset === "7d" || rawPreset === "7"
      ? "7d"
      : rawPreset === "90d" || rawPreset === "90"
        ? "90d"
        : rawPreset === "custom"
          ? "custom"
          : "30d";

  const parsedFrom = parseIsoDate(sp.get("from"));
  const parsedTo = parseIsoDate(sp.get("to"));

  let fromMs: number;
  let toMs: number;

  if (parsedFrom != null && parsedTo != null && parsedTo >= parsedFrom) {
    preset = rawPreset === "7d" || rawPreset === "30d" || rawPreset === "90d" ? (rawPreset as DatePreset) : "custom";
    fromMs = parsedFrom;
    toMs = /^\d{4}-\d{2}-\d{2}$/.test((sp.get("to") || "").trim())
      ? parsedTo + 86_400_000 - 1
      : parsedTo;
  } else {
    const days = presetDays(preset);
    toMs = nowMs;
    fromMs = nowMs - days * 86_400_000;
  }

  const spanMs = Math.max(86_400_000, toMs - fromMs);
  const prevToMs = fromMs - 1;
  const prevFromMs = prevToMs - spanMs;

  const rawChannel = (sp.get("channel") || "all").toLowerCase() as ChannelFilter;
  const rawSentiment = (sp.get("sentiment") || "all").toLowerCase() as SentimentFilter;
  const rawSortBy = (sp.get("sortBy") || "created_at") as CallSortField;
  const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";

  return {
    preset,
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(toMs).toISOString(),
    fromMs,
    toMs,
    prevFromIso: new Date(prevFromMs).toISOString(),
    prevToIso: new Date(prevToMs).toISOString(),
    prevFromMs,
    prevToMs,
    timezone: timezone || DEFAULT_TIMEZONE,
    teamId: sp.get("teamId")?.trim() || null,
    queueId: sp.get("queueId")?.trim() || null,
    agentId: sp.get("agentId")?.trim() || null,
    channel: VALID_CHANNELS.has(rawChannel) ? rawChannel : "all",
    sentiment: VALID_SENTIMENTS.has(rawSentiment) ? rawSentiment : "all",
    needsReview: parseBoolFlag(sp.get("needsReview")),
    flagged: parseBoolFlag(sp.get("flagged")),
    q: (sp.get("q") || "").trim().slice(0, 120),
    sortBy: VALID_SORTS.has(rawSortBy) ? rawSortBy : "created_at",
    sortDir,
    page: parsePositiveInt(sp.get("page"), 1, 1, 10_000),
    pageSize: parsePositiveInt(sp.get("pageSize"), 20, 5, 100),
  };
}

export function isTimestampInRange(iso: string | null | undefined, startMs: number, endMs: number): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  return ms >= startMs && ms <= endMs;
}

export function dateBucketKey(iso: string, timezone = DEFAULT_TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone || DEFAULT_TIMEZONE,
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value ?? "1970";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return iso.slice(0, 10);
  }
}

