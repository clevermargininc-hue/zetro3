import OpenAI from "openai";
import { getOpenAI, isModelAccessError, withRetries } from "@/lib/ai-client";
import { getServerEnv } from "@/lib/env";
import type {
  GenericUtterance,
  CallAnalysis,
  SpeakerRole,
  AuditMode,
  MetricEvidence,
  MetricEvidenceItem,
  MetricEvidenceVerdict,
  ScoreDimension,
  DocumentReference,
  ScoreParameter,
} from "@/lib/types";
import type { QaDocument } from "@/lib/qa-kinds";
import { SCRIPT_KINDS } from "@/lib/qa-kinds";
import { extractKeytermsFromDocuments, scriptsOf } from "@/lib/call-scripts";
import { detectHoldEvents, formatHoldListenBlock } from "@/lib/detect-holds";
import { cleanScoreLine, cleanScoreLines, cleanScoreQuote } from "@/lib/clean-score-text";

const SCORE_DIMENSIONS: ScoreDimension[] = [
  "greeting",
  "empathy",
  "professionalism",
  "resolution",
  "communication",
  "language_handling",
];

const EVIDENCE_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["hit", "miss", "partial"] },
    quote: { type: "string" },
    note: { type: "string" },
    utterance_index: { type: "integer" },
    start_s: { type: "integer" },
    findings: { type: "array", items: { type: "string" } },
    source_file: { type: "string" },
    criterion: { type: "string" },
  },
  required: ["verdict", "quote", "note", "utterance_index", "source_file", "criterion"],
} as const;

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    speaker_assignments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          speaker_label: { type: "string" },
          role: { type: "string", enum: ["agent", "customer"] },
        },
        required: ["speaker_label", "role"],
      },
    },
    overall_score: { type: "integer" },
    raw_score: { type: "integer" },
    greeting: { type: "integer" },
    empathy: { type: "integer" },
    professionalism: { type: "integer" },
    resolution: { type: "integer" },
    communication: { type: "integer" },
    language_handling: { type: "integer" },
    verdict: {
      type: "string",
      enum: ["excellent", "good", "needs_improvement", "poor"],
    },
    customer_sentiment: { type: "string" },
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    compliance_findings: {
      type: "array",
      items: { type: "string" },
    },
    metric_evidence: {
      type: "object",
      additionalProperties: false,
      properties: {
        greeting: EVIDENCE_ITEM_SCHEMA,
        empathy: EVIDENCE_ITEM_SCHEMA,
        professionalism: EVIDENCE_ITEM_SCHEMA,
        resolution: EVIDENCE_ITEM_SCHEMA,
        communication: EVIDENCE_ITEM_SCHEMA,
        language_handling: EVIDENCE_ITEM_SCHEMA,
        holding: EVIDENCE_ITEM_SCHEMA,
      },
      required: [],
    },
    hold_detected: { type: "boolean" },
    hold_findings: {
      type: "array",
      items: { type: "string" },
    },
    auto_zero_applied: { type: "boolean" },
    parameters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "integer" },
          weight_pct: { type: ["number", "null"] },
          result: { type: "string", enum: ["hit", "miss", "partial"] },
          source_file: { type: "string" },
          note: { type: "string" },
          quote: { type: "string" },
          utterance_index: { type: "integer" },
        },
        required: [
          "name",
          "score",
          "result",
          "source_file",
          "note",
          "quote",
          "utterance_index",
        ],
      },
    },
    document_references: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          file_name: { type: "string" },
          criterion: { type: "string" },
          result: { type: "string", enum: ["hit", "miss", "partial"] },
        },
        required: ["file_name", "criterion", "result"],
      },
    },
  },
  required: [
    "speaker_assignments",
    "overall_score",
    "raw_score",
    "auto_zero_applied",
    "greeting",
    "empathy",
    "professionalism",
    "resolution",
    "communication",
    "language_handling",
    "verdict",
    "customer_sentiment",
    "summary",
    "strengths",
    "improvements",
    "compliance_findings",
    "metric_evidence",
    "hold_detected",
    "hold_findings",
    "parameters",
    "document_references",
  ],
} as const;

function clamp(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function normalizeEvidenceVerdict(value: unknown): MetricEvidenceVerdict {
  const v = String(value || "").toLowerCase();
  if (v === "hit" || v === "miss" || v === "partial") return v;
  return "partial";
}

function normalizeMetricEvidence(
  raw: unknown,
  utterances: GenericUtterance[],
  files: QaDocument[] = [],
): MetricEvidence {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: MetricEvidence = {};

  for (const key of [...SCORE_DIMENSIONS, "holding"] as const) {
    const row = source[key];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const index = Number(item.utterance_index);
    const fromUtterance =
      Number.isFinite(index) && index >= 0 && index < utterances.length
        ? utterances[index]
        : null;
    const startRaw = Number(item.start_s);
    const start_s = fromUtterance
      ? Math.floor(fromUtterance.start / 1000)
      : Number.isFinite(startRaw)
        ? Math.max(0, Math.round(startRaw))
        : null;
    const quote = cleanScoreQuote(
      String(item.quote || ""),
      String(fromUtterance?.text || ""),
    );
    const note = cleanScoreLine(String(item.note || "")).slice(0, 280);
    const source_file = resolveCompanyFileName(
      cleanScoreLine(String(item.source_file || "")),
      files,
    ).slice(0, 120);
    const criterion = cleanScoreLine(String(item.criterion || "")).slice(0, 180);
    if (!quote && !note && !source_file && !criterion && key !== "holding") continue;
    const findings = Array.isArray(item.findings)
      ? cleanScoreLines(item.findings).slice(0, 8)
      : undefined;
    out[key] = {
      verdict: normalizeEvidenceVerdict(item.verdict),
      quote,
      note,
      start_s,
      ...(findings?.length ? { findings } : {}),
      ...(source_file ? { source_file } : {}),
      ...(criterion ? { criterion } : {}),
    } satisfies MetricEvidenceItem;
  }

  return out;
}

const DOCUMENTS_EVIDENCE_BLOCK = `
parameters (REQUIRED — this is the company scorecard):
- First read COMPANY RULE CHECKLIST and the SCORECARD file(s). Those lines are the audit.
- Output ONE entry for EVERY scored criterion / parameter / weight / Auto-Zero line found in the uploaded company SCORECARD (and related standards scripts when they are scored).
- If COMPANY RULE CHECKLIST lists N rules, parameters MUST have about N entries (same names). Missing a listed rule is not allowed.
- Do NOT stop at 6 items. If the company file has 8, 12, 20, or more lines, score all of them.
- Do NOT invent Zetro's generic categories (Greeting & Identity, Empathy & Active Listening, etc.) unless that exact line appears in the company files.
- name: the criterion name exactly as written in the company file (include weight text if it is part of the line).
- score: 0–100 for how well the agent met THAT company rule on this call. Apply the file's own scoring / Auto-Zero rules.
- weight_pct: the percentage weight from the company scorecard when present (e.g. 5 for "5%"), otherwise null.
- result: hit, miss, or partial according to the company rule.
- source_file: exact uploaded file name from FILE INDEX.
- note: one short sentence explaining WHY this score was given on this call (what the agent did or missed vs that company rule). Clean language only. Required for every score including 100%.
- quote: a SHORT clean transcript snippet that proves the score (what was said). Required for every parameter — including 100% hits and partial scores. Use readable Kiswahili/English only; never paste garbled ASR. If truly no speech applies (e.g. "If applicable" and not needed), set quote to "" and explain in note.
- utterance_index: the timed turn index [i] that best supports the quote, or -1 if no turn applies.

You MUST also output document_references (same criteria list is fine). Inventing a score or a criterion that is not in the company files is forbidden.

document_references: one row per criterion you actually scored from the uploaded files.
- file_name: exact uploaded file name from FILE INDEX.
- criterion: the rule / line / weight you used from that file.
- result: hit, miss, or partial.

metric_evidence (optional roll-up into 6 buckets for analytics only — not the scorecard UI):
- If helpful, also map evidence into greeting / empathy / professionalism / resolution / communication / language_handling.
- source_file, criterion, quote, note, verdict, utterance_index as before.

hold_detected: true if the timed transcript/audio shows a hold or wait.
hold_findings: if hold_detected and a HOLDING PROCEDURE file exists, list each company hold rule that was followed or missed. If no hold, return [].`;

const FALLBACK_REASONING = ["gpt-4o-mini", "gpt-4o", "gpt-5-mini"];
const FALLBACK_FAST = ["gpt-4o-mini", "gpt-4o", "gpt-5-mini"];

type ModelMode = "reasoning" | "fast";

function modelsFor(mode: ModelMode) {
  const { aiReasoningModel, aiFastModel } = getServerEnv();
  const primary = mode === "fast" ? aiFastModel : aiReasoningModel;
  const fallbacks = mode === "fast" ? FALLBACK_FAST : FALLBACK_REASONING;
  return [primary, ...fallbacks.filter((model) => model !== primary)];
}

const noTemperature = new Set<string>();
const noReasoningEffort = new Set<string>();

function isReasoningModel(model: string) {
  return /^(gpt-5|o1|o3|o4)/i.test(model);
}

function supportsTemperature(model: string) {
  if (noTemperature.has(model)) return false;
  return !isReasoningModel(model);
}

function tokenLimit(model: string, extra = false) {
  if (isReasoningModel(model)) {
    return { max_completion_tokens: extra ? 16000 : 8192 };
  }
  return { max_tokens: extra ? 8192 : 4096 };
}

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function completionText(completion: OpenAI.Chat.Completions.ChatCompletion) {
  const choice = completion.choices[0];
  const message = choice?.message;
  if (!message) return { text: "", finishReason: choice?.finish_reason ?? null };
  if (message.refusal) {
    throw new Error(`OpenAI refused the request: ${message.refusal}`);
  }
  return {
    text: stripJsonFence(typeof message.content === "string" ? message.content : ""),
    finishReason: choice.finish_reason ?? null,
  };
}

function isEmptyCompletionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("empty response") ||
    message.includes("ran out of output tokens")
  );
}

function clipKeepStart(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[…remainder of later company-file sections truncated; scorecard at the start is complete…]`;
}

function clipText(text: string, max: number) {
  return clipKeepStart(text, max);
}

function formatUtteranceLine(u: GenericUtterance, index: number) {
  const start = Math.floor(u.start / 1000);
  return `[${index}] Speaker ${u.speaker} (${start}s): ${u.text}`;
}

/**
 * Keep opening + closing (and a middle sample) so long calls are not scored
 * from the first 12k characters only — closings and late resolution stay visible.
 */
function packTranscriptForAudit(utterances: GenericUtterance[], maxChars = 16000) {
  const lines = utterances.map((u, i) => formatUtteranceLine(u, i));
  const full = lines.join("\n");
  if (full.length <= maxChars) return full;

  const headBudget = Math.floor(maxChars * 0.4);
  const tailBudget = Math.floor(maxChars * 0.4);
  const midBudget = Math.max(400, maxChars - headBudget - tailBudget - 180);

  const head: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (head.length && size + line.length + 1 > headBudget) break;
    head.push(line);
    size += line.length + 1;
  }

  const tail: string[] = [];
  size = 0;
  for (let i = lines.length - 1; i >= head.length; i--) {
    const line = lines[i];
    if (tail.length && size + line.length + 1 > tailBudget) break;
    tail.unshift(line);
    size += line.length + 1;
  }

  const midStart = head.length;
  const midEnd = lines.length - tail.length;
  const mid: string[] = [];
  if (midEnd > midStart && midBudget > 120) {
    const remaining = lines.slice(midStart, midEnd);
    const step = Math.max(1, Math.ceil(remaining.length / 8));
    size = 0;
    for (let i = 0; i < remaining.length; i += step) {
      const line = remaining[i];
      if (mid.length && size + line.length + 1 > midBudget) break;
      mid.push(line);
      size += line.length + 1;
    }
  }

  return [
    head.join("\n"),
    mid.length
      ? `\n[…middle of call sampled for context — ${midEnd - midStart} turns condensed…]\n${mid.join("\n")}`
      : `\n[…middle of call omitted for length…]`,
    `\n[…closing / late turns — read carefully for resolution & wrap-up…]\n${tail.join("\n")}`,
  ].join("\n");
}

const CALL_UNDERSTANDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    customer_issue: { type: "string" },
    agent_actions: { type: "array", items: { type: "string" } },
    outcome: { type: "string" },
    opening_present: { type: "boolean" },
    closing_present: { type: "boolean" },
    hold_or_wait: { type: "boolean" },
    tone_notes: { type: "string" },
    unclear_parts: { type: "string" },
    speaker_guess: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          speaker_label: { type: "string" },
          role: { type: "string", enum: ["agent", "customer"] },
        },
        required: ["speaker_label", "role"],
      },
    },
  },
  required: [
    "customer_issue",
    "agent_actions",
    "outcome",
    "opening_present",
    "closing_present",
    "hold_or_wait",
    "tone_notes",
    "unclear_parts",
    "speaker_guess",
  ],
} as const;

export type CallUnderstanding = {
  customer_issue: string;
  agent_actions: string[];
  outcome: string;
  opening_present: boolean;
  closing_present: boolean;
  hold_or_wait: boolean;
  tone_notes: string;
  unclear_parts: string;
  speaker_guess: { speaker_label: string; role: SpeakerRole }[];
};

/**
 * Listen to the repaired transcript first — build a clear call story before scoring.
 * This bridges transcription → human-like QA judgment.
 */
export async function understandCallBrief(
  utterances: GenericUtterance[],
  bilingual = true,
  agentName?: string | null,
): Promise<CallUnderstanding | null> {
  if (!utterances.length) return null;
  const transcript = packTranscriptForAudit(utterances, 14000);
  const system = bilingual
    ? `You are an experienced bilingual (Kiswahili + English) contact-center QA coach.
Your only job is to UNDERSTAND this call clearly — like a human who listened carefully — before any scorecard is filled.
Do not invent facts. If ASR is unclear, say so in unclear_parts. Prefer the language of the call in short notes.
Identify Agent vs Customer from what they say (greeting/script vs problem/complaint), not from who spoke first.`
    : `You are an experienced contact-center QA coach.
Your only job is to UNDERSTAND this call clearly — like a human who listened carefully — before any scorecard is filled.
Do not invent facts. If ASR is unclear, say so in unclear_parts.
Identify Agent vs Customer from what they say (greeting/script vs problem/complaint), not from who spoke first.`;

  try {
    const parsed = (await completeJson(
      system,
      [
        agentName ? `Submitted agent name (belongs to the Agent speaker): ${agentName}` : "",
        "Read the timed conversation. Return a short, accurate understanding of what happened.",
        transcript,
      ]
        .filter(Boolean)
        .join("\n\n"),
      "call_understanding",
      CALL_UNDERSTANDING_SCHEMA,
      "fast",
    )) as Partial<CallUnderstanding>;

    return {
      customer_issue: cleanScoreLine(String(parsed.customer_issue || "")).slice(0, 320),
      agent_actions: cleanScoreLines(
        Array.isArray(parsed.agent_actions) ? parsed.agent_actions.map(String) : [],
      ).slice(0, 8),
      outcome: cleanScoreLine(String(parsed.outcome || "")).slice(0, 320),
      opening_present: parsed.opening_present === true,
      closing_present: parsed.closing_present === true,
      hold_or_wait: parsed.hold_or_wait === true,
      tone_notes: cleanScoreLine(String(parsed.tone_notes || "")).slice(0, 280),
      unclear_parts: cleanScoreLine(String(parsed.unclear_parts || "")).slice(0, 280),
      speaker_guess: (Array.isArray(parsed.speaker_guess) ? parsed.speaker_guess : [])
        .filter((row) => row && typeof row === "object")
        .map((row) => ({
          speaker_label: String((row as { speaker_label?: string }).speaker_label || "").trim(),
          role:
            (row as { role?: string }).role === "agent"
              ? ("agent" as const)
              : ("customer" as const),
        }))
        .filter((row) => row.speaker_label)
        .slice(0, 6),
    };
  } catch {
    return null;
  }
}

function formatCallUnderstandingBlock(brief: CallUnderstanding | null) {
  if (!brief) return "";
  const actions = brief.agent_actions.length
    ? brief.agent_actions.map((a, i) => `  ${i + 1}. ${a}`).join("\n")
    : "  (none clear)";
  const speakers = brief.speaker_guess.length
    ? brief.speaker_guess.map((s) => `  - ${s.speaker_label} → ${s.role}`).join("\n")
    : "  (decide from the timed turns)";
  return [
    "CALL UNDERSTANDING (from the repaired transcript — use this as your listening notes before you score):",
    `- Customer issue: ${brief.customer_issue || "unclear"}`,
    `- Agent actions:\n${actions}`,
    `- Outcome: ${brief.outcome || "unclear"}`,
    `- Opening present: ${brief.opening_present ? "yes" : "no / unclear"}`,
    `- Closing / wrap-up present: ${brief.closing_present ? "yes" : "no / unclear"}`,
    `- Hold or wait heard: ${brief.hold_or_wait ? "yes" : "no / unclear"}`,
    `- Tone: ${brief.tone_notes || "not noted"}`,
    `- Unclear ASR / weak spots: ${brief.unclear_parts || "none noted"}`,
    `- Speaker roles (verify):\n${speakers}`,
    "Score like a wise human QA: weigh the full conversation arc above, then verify each scorecard rule against the timed turns. Do not punish the agent for things the customer never asked for. Do not invent misses from garbled ASR — if unclear_parts says it is unclear, be fair and conservative on that point.",
  ].join("\n");
}

function resolveCompanyFileName(named: string, files: QaDocument[]): string {
  const allowedNames = files.map((doc) => doc.file_name).filter(Boolean);
  const needle = named.trim().toLowerCase();
  if (!needle) return "";
  return (
    allowedNames.find((name) => name.toLowerCase() === needle) ||
    allowedNames.find(
      (name) => name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase()),
    ) ||
    allowedNames[0] ||
    ""
  );
}

function normalizeDocumentReferences(raw: unknown, files: QaDocument[]): DocumentReference[] {
  const rows = Array.isArray(raw) ? raw : [];
  const out: DocumentReference[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const criterion = cleanScoreLine(String(item.criterion || "")).slice(0, 180);
    if (!criterion) continue;
    const file_name =
      resolveCompanyFileName(cleanScoreLine(String(item.file_name || "")), files) || "company file";
    out.push({
      file_name,
      criterion,
      result: normalizeEvidenceVerdict(item.result),
    });
    if (out.length >= 60) break;
  }
  return out;
}

function normalizeScoreParameters(
  raw: unknown,
  files: QaDocument[],
  references: DocumentReference[] = [],
  utterances: GenericUtterance[] = [],
): ScoreParameter[] {
  const rows = Array.isArray(raw) ? raw : [];
  const out: ScoreParameter[] = [];
  const seen = new Set<string>();

  function push(item: ScoreParameter) {
    const key = item.name.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  }

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = cleanScoreLine(String(item.name || item.criterion || "")).slice(0, 180);
    if (!name) continue;
    const weightRaw = item.weight_pct;
    const weight =
      weightRaw == null || weightRaw === ""
        ? null
        : Number.isFinite(Number(weightRaw))
          ? Math.max(0, Math.min(100, Number(weightRaw)))
          : null;
    const source_file =
      resolveCompanyFileName(cleanScoreLine(String(item.source_file || "")), files) ||
      files[0]?.file_name ||
      "";
    const note = cleanScoreLine(String(item.note || "")).slice(0, 280);
    const index = Number(item.utterance_index);
    const fromUtterance =
      Number.isFinite(index) && index >= 0 && index < utterances.length
        ? utterances[index]
        : null;
    const quote = cleanScoreQuote(
      String(item.quote || ""),
      String(fromUtterance?.text || ""),
    ).slice(0, 320);
    const start_s = fromUtterance
      ? Math.floor(fromUtterance.start / 1000)
      : null;
    push({
      name,
      score: clamp(item.score),
      weight_pct: weight,
      result: normalizeEvidenceVerdict(item.result),
      utterance_index: fromUtterance ? index : null,
      start_s,
      ...(source_file ? { source_file } : {}),
      ...(note ? { note } : {}),
      ...(quote ? { quote } : {}),
    });
    if (out.length >= 60) break;
  }

  if (!out.length) {
    for (const ref of references) {
      push({
        name: ref.criterion,
        score:
          ref.result === "hit" ? 100 : ref.result === "miss" ? 0 : 50,
        result: ref.result,
        source_file: ref.file_name,
      });
      if (out.length >= 60) break;
    }
  }

  return out;
}

function rollupDimensionFromParameters(
  parameters: ScoreParameter[],
  patterns: RegExp[],
  fallback: number,
) {
  const matches = parameters.filter((row) =>
    patterns.some((pattern) => pattern.test(row.name)),
  );
  if (!matches.length) return fallback;
  return clamp(
    matches.reduce((sum, row) => sum + row.score, 0) / matches.length,
  );
}

function parseCompletionJson(completion: OpenAI.Chat.Completions.ChatCompletion) {
  const { text, finishReason } = completionText(completion);
  if (!text) {
    throw new Error(
      finishReason === "length"
        ? "OpenAI ran out of output tokens before finishing the score."
        : "OpenAI returned an empty response",
    );
  }
  return JSON.parse(text);
}

async function createCompletion(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
) {
  try {
    return await getOpenAI().chat.completions.create(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("temperature") && "temperature" in body) {
      noTemperature.add(body.model);
      const { temperature: _t, ...withoutTemp } = body;
      return getOpenAI().chat.completions.create(withoutTemp);
    }
    if (/reasoning_effort/i.test(message) && "reasoning_effort" in body) {
      noReasoningEffort.add(body.model);
      const { reasoning_effort: _r, ...withoutEffort } = body;
      return getOpenAI().chat.completions.create(withoutEffort);
    }
    if (/max_tokens|max_completion_tokens/i.test(message)) {
      const { max_tokens: _a, max_completion_tokens: _b, ...withoutLimit } = body;
      return getOpenAI().chat.completions.create(withoutLimit);
    }
    throw error;
  }
}

async function completeJson(
  system: string,
  user: string,
  schemaName: string,
  schema: object,
  mode: ModelMode,
) {
  const { aiTemperature } = getServerEnv();
  const models = modelsFor(mode);
  let lastError: unknown;

  for (const model of models) {
    try {
      const parsed = await withRetries(async () => {
        const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
          model,
          ...tokenLimit(model),
          response_format: {
            type: "json_schema",
            json_schema: {
              name: schemaName,
              strict: false,
              schema: schema as unknown as Record<string, unknown>,
            },
          },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        };
        if (supportsTemperature(model)) {
          body.temperature = aiTemperature;
        }
        if (isReasoningModel(model) && !noReasoningEffort.has(model)) {
          body.reasoning_effort = "low";
        }

        let completion = await createCompletion(body);
        try {
          return parseCompletionJson(completion);
        } catch (error) {
          if (!isEmptyCompletionError(error)) throw error;
          const finishReason = completion.choices[0]?.finish_reason;
          if (finishReason !== "length") throw error;
          completion = await createCompletion({
            ...body,
            ...tokenLimit(model, true),
          });
          return parseCompletionJson(completion);
        }
      });
      return parsed;
    } catch (error) {
      lastError = error;
      if (!isModelAccessError(error) && !isEmptyCompletionError(error)) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI returned an empty response");
}

const SWAHILI_REPAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    turns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          text: { type: "string" },
        },
        required: ["index", "text"],
      },
    },
  },
  required: ["turns"],
} as const;

const SWAHILI_MEANING_SYSTEM = `You repair East African contact-center speech-to-text so a human QA coach can UNDERSTAND the call clearly before scoring.

The input is automatic speech recognition. Kiswahili is often fused, misspelled, or phonetic junk. Your output is the SAME conversation in real, readable Kiswahili and/or English — the bridge from transcription to wise scoring.

Rules:
- Fix broken words into the words the speaker likely said. Example: "habar zako namtaka kusadia" → "Habari yako, namtaka kukusaidia."
- Company names from the documents: if ASR produced a similar-sounding junk word, use the company spelling. Example: "karibu neskyryma" with TANESCO in the company files → "Karibu TANESCO, huduma kwa wateja" only if that greeting is in the script or clearly intended. Never invent a company that is not in the files.
- Keep the same dialogue: same speakers' turns, same questions, same answers, same numbers and names that the ASR supports.
- Preserve meaning and intent (complaint, apology, promise, escalation) so scoring can judge the call like a human listener.
- Do NOT write a new call. Do NOT add greetings, products, account numbers, amounts, or names that are not supported by the ASR, the company files, or the immediate neighbouring turns.
- Keep code-switching. Never translate Kiswahili into English or English into Kiswahili.
- Prefer company spellings and script phrases only when the speaker is clearly using that product or script.
- If a turn is already clean, return it unchanged.
- Do not drop or merge turns. Return the same index for every REPAIR turn.
- CONTEXT turns are already repaired. Do not rewrite them.`;

type IndexedTurn = { index: number; text: string; start_s?: number };

function meaningRestoreBatches(turns: IndexedTurn[], maxChars: number) {
  const contextTurns = 5;
  const batches: { context: IndexedTurn[]; repair: IndexedTurn[] }[] = [];
  let i = 0;
  while (i < turns.length) {
    const context = turns.slice(Math.max(0, i - contextTurns), i);
    const repair: IndexedTurn[] = [];
    let size = JSON.stringify(context).length;
    while (i < turns.length) {
      const extra = JSON.stringify(turns[i]).length + 8;
      if (repair.length && size + extra > maxChars) break;
      repair.push(turns[i]);
      size += extra;
      i += 1;
    }
    if (repair.length) batches.push({ context, repair });
  }
  return batches;
}

function keepRepairedTurn(original: string, repaired: string) {
  const from = original.replace(/\s+/g, " ").trim();
  const to = repaired.replace(/\s+/g, " ").trim();
  if (!to) return from;
  const fromWords = from.split(/\s+/).filter(Boolean).length;
  const toWords = to.split(/\s+/).filter(Boolean).length;
  if (from.length >= 12 && to.length > from.length * 2.4 && toWords > fromWords * 2.2) {
    return from;
  }
  return to;
}

export type SwahiliRestoreOptions = {
  keyTerms?: string[];
  scriptHints?: string;
};

/** Repair broken ASR into readable speech for understanding + scoring. Never shown to the user. */
export async function restoreSwahiliMeaning<T extends { text: string; start?: number }>(
  turns: T[],
  options: SwahiliRestoreOptions = {},
): Promise<T[]> {
  if (!turns.length) return turns;

  const keyed = turns.map((turn, index) => ({
    index,
    text: turn.text,
    start_s: Math.floor(Number(turn.start ?? 0) / 1000),
  }));
  const terms = (options.keyTerms || []).filter(Boolean).slice(0, 60);
  const scripts = (options.scriptHints || "").replace(/\s+/g, " ").trim().slice(0, 2500);
  const out = [...turns];

  try {
    for (const batch of meaningRestoreBatches(keyed, 9000)) {
      const parsed = (await completeJson(
        SWAHILI_MEANING_SYSTEM,
        [
          terms.length
            ? `Company names and script spellings (fix ASR junk to these spellings when the speaker clearly meant them; do not invent others):\n${terms.join(", ")}`
            : "",
          scripts
            ? `Organization scripts / procedure phrases (use only when the speaker is clearly following them):\n${scripts}`
            : "",
          batch.context.length
            ? `CONTEXT (already repaired — do not rewrite):\n${JSON.stringify(batch.context)}`
            : "",
          `REPAIR these timed turns into readable speech so QA can understand the call clearly. Same conversation. Do not invent.\n${JSON.stringify(batch.repair)}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        "swahili_meaning_restore",
        SWAHILI_REPAIR_SCHEMA,
        "reasoning",
      )) as { turns?: { index?: unknown; text?: unknown }[] };

      const rows = parsed.turns || [];
      if (!rows.length) continue;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const claimed = Number(row.index);
        const fallback = batch.repair[i]?.index;
        const index =
          Number.isInteger(claimed) && batch.repair.some((item) => item.index === claimed)
            ? claimed
            : fallback;
        if (index == null || index < 0 || index >= out.length) continue;
        const text = String(row.text || "").replace(/\s+/g, " ").trim();
        out[index] = {
          ...out[index],
          text: keepRepairedTurn(out[index].text, text),
        };
      }
    }
    return out;
  } catch {
    return turns;
  }
}

const SCRIPT_PROMPT_BLOCK = `
When an OPENING SCRIPT or CLOSING SCRIPT is provided, score greeting and closing against those org-wide scripts (shared by all agents). Required key terms come from those files and the other company documents, not from the transcript.

HOLDING PROCEDURE — listen to the call first, then apply that company's rules only when a hold actually happened:
- You are given a CALL LISTENING block built from audio timestamps (silence gaps ≥ 8s) and hold/wait phrases in English and Kiswahili. Treat that as having heard the recording. hold_detected must match that listening result unless the timed transcript clearly shows a hold the listener missed.
- If a HOLDING PROCEDURE file is provided AND hold/wait was heard, you MUST walk through THAT company's rules only (permission to hold, hold language/key terms, check-back interval, what to say when returning). Do not use a generic hold policy. Missed rules go in hold_findings and should lower professionalism.
- If no hold/wait was heard, ignore the holding file even if it is uploaded. hold_detected=false, hold_findings=[]. Do not penalize holding.
- If no holding procedure file is provided, do not invent hold rules.`;

const HUMAN_JUDGMENT_BLOCK = `
HUMAN-LIKE UNDERSTANDING (transcription → wise scoring):
- The timed transcript was meaning-repaired from speech recognition so you can understand the call clearly. Treat CALL UNDERSTANDING as your listening notes from a careful human coach.
- First understand the full arc: opening → customer issue → agent actions → outcome / closing. Then score each company rule against that reality.
- Be wise like an experienced QA human: weigh intent, context, and fairness — not isolated keywords.
- If the customer never needed a behaviour (and the scorecard says "if applicable"), do not force a miss.
- If ASR was unclear (see unclear_parts), do not invent a severe miss from gibberish; be conservative and fair on that criterion.
- Closing and resolution often appear late — the transcript includes opening AND closing turns; read both.
- Sarcasm, cold dismissal, or empty promises still count even when volume is calm.
- Scores must still follow the company SCORECARD / CHECKLIST exactly — wisdom sharpens judgment; it does not invent a new rubric.`;

const DOCUMENTS_PROMPT = `You are a bilingual (Kiswahili + English) call-center quality assurance analyst.

PATH: DOCUMENTS AUDIT FROM THE CUSTOMER'S / WORKSPACE'S UPLOADED FILES.
You MUST read FILE INDEX, COMPANY RULE CHECKLIST, and COMPANY FILE CONTENTS before assigning any score.
Those files are this organization's uploaded SCORECARD, COMPLIANCE, PROCESS DOCUMENTS, and scripts.
They are the only REFERENCE for criteria, weights, Auto-Zero rules, required phrases, product names, and key terms.
Do not invent a score, a criterion, a company name, or a key term.
If a required behaviour is in the documents and the agent skipped it, mark it as a miss.
If a behaviour is not in the scorecard or process documents, do not penalize it unless it breaks compliance.
Cite the exact file name and criterion in document_references and in metric_evidence.source_file / criterion.

Your job:
1. READ the company files carefully (scorecard first, then compliance, process docs, scripts).
2. READ CALL UNDERSTANDING and the timed transcript so you clearly understand what happened on this call (like a human who listened).
3. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
4. AUDIT the agent against EVERY rule / criterion / weight line in the uploaded company SCORECARD (and COMPANY RULE CHECKLIST). Not a fixed 6-box Zetro rubric.
5. Check every compliance rule from the uploaded files and list breaches.
6. CLEAN LANGUAGE ON THE SCORECARD:
   - Evidence comes from the company SCORECARD and the CLEAN SCRIPT, checked against the meaning-repaired conversation.
   - If a Kiswahili or English phrase is clean and readable, put that short phrase in metric_evidence.quote so it appears on the scorecard.
   - NEVER put broken, fused, misspelled, or garbled speech-to-text words on the scorecard (quote, note, summary, strengths, improvements, compliance). If a word is not clean, omit it and write the point in correct Kiswahili or English.
   - Never translate Kiswahili into English. Write analysis in the primary language spoken on the call (Kiswahili or English).
7. PRIVACY:
   - The full transcript stays internal. The scorecard may show only short clean evidence quotes, not whole turns.
8. AGENT & COMPANY NAMES:
   - Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.
9. SPEAKER ROLES IN TEXT:
   - When writing your notes, summaries, and findings, always refer to the speakers as 'Agent' (or their name) and 'Customer' (or 'Mteja'). Do NOT use raw transcript labels like 'Speaker A' or 'Speaker 1' in your written analysis, though you must still output the exact speaker_label string in the speaker_assignments array.
10. DEEP TONE, SARCASM & ATTITUDE DETECTION (UTAMBUZI WA DHIHAKA, KEJELI, KUFADHAIKA NA DHARAU):
   - You MUST analyze the subtle emotional, conversational, and behavioral tone of both the agent and customer beyond just volume or shouting. Use high discretion (busara sana) to check for sarcasm, frustrations, or other negative traits.
   - LOW-TONE SARCASM & MOCKERY (Kejeli na dhihaka ya chinichini): An agent does NOT need to yell or raise their voice to be rude. If the agent speaks in a quiet, soft, flat, or normal voice but uses words, phrases, or rhetorical questions that are sarcastic, cynical, mocking, patronizing, or dismissive (mfano: "Sasa unataka nikufanyie nini?", "Hata mtoto anajua hilo", "Si nilishakwambia?", "Huwezi kusoma?", "Haya bwana wewe ndio unajua", "Ulitaka niseme nini sasa?", "Ndio hivyo huwezi kubadilisha", "Hapo sina msaada wowote", au kejeli kama "Haya asante sana kwa kutufundisha kazi"), you MUST detect and penalize this severely.
   - DISMISSIVENESS & PASSIVE-AGGRESSION (Kupuuza na dharau): Giving curt, indifferent, dismissive, or reluctant one-word answers, brushing off the customer's problem without attempting genuine resolution, sighing with irritation, or acting bored/uninterested.
   - CONDESCENSION & SUPERIORITY (Kujiona na kumdharau mteja): Belittling the customer, speaking down to them, or making them feel foolish for asking questions or not understanding technical details.
   - SCORING IMPACT OF NEGATIVE TONES:
     * Professionalism: Severe penalty (drop to 20-50/100). Sarcasm, mockery, or subtle insults completely violate professional contact center standards.
     * Empathy: Severe penalty (drop to 10-40/100). Cold, dismissive, or mocking responses to customer distress represent zero active empathy.
     * Resolution: Penalize if dismissive tone led to incomplete, careless, or unhelpful support.
     * Overall Score: A call with evident mockery, sarcasm, or contempt must NEVER receive a passing/high score.
   - COACHING & FEEDBACK: If low-tone mockery or sarcasm is detected, clearly identify it in 'improvements' and 'metric_evidence.professionalism.note' / 'metric_evidence.empathy.note' (mfano: "Ingawa mhudumu hakuinua sauti, alitumia maneno yenye dhihaka, kejeli au kupuuza maelezo ya mteja aliposema...").
11. AUDIO QUALITY, NETWORK & PRONUNCIATION ISSUES (UBORA WA SAUTI NA MATAMSHI):
   - You MUST detect if the transcript indicates the agent is not speaking clearly, mispronouncing words, or if there is no sound/silence from the agent.
   - Detect network challenges, low volume from either the customer or agent, and static/noise in the background (e.g., if the transcript has markers for this, or if the customer says "Sikuskii vizuri", "Mtandao unasumbua", etc).
   - If the agent does not speak clearly or mispronounces words, explicitly note this in the scorecard and provide educational coaching in the 'improvements' section (mfano: "Agent anapaswa kutamka maneno vizuri na kwa uwazi").
   - If there are network issues or static, note it in the 'improvements' or 'summary' so the manager is aware it affected the call quality.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.
- Do NOT assume the first speaker is the agent — use CALL UNDERSTANDING speaker_guess and the cues above.

${HUMAN_JUDGMENT_BLOCK}

${SCRIPT_PROMPT_BLOCK}

Numeric fields:
- parameters: score EVERY company scorecard / checklist criterion (any count). This drives the scorecard UI.
- overall_score / raw_score: follow the company scorecard weighting across those parameters
- greeting, empathy, professionalism, resolution, communication, language_handling: optional closest roll-ups for analytics only — do not replace the company parameter list
- AUTO-ZERO (AUTO-FAIL): If the scorecard explicitly defines an "Auto-Zero" or "Auto-Fail" for a specific severe violation, and the agent commits it, you MUST set the \`auto_zero_applied\` boolean to true. Calculate the \`overall_score\` normally based on all other points earned. The system will automatically zero out the final score if \`auto_zero_applied\` is true, but you must provide the normal sum in \`overall_score\`. Use extreme wisdom: only apply this if it is a genuine, explicitly defined severe violation, to prevent unfair zeroes. If no auto-zero occurred, set \`auto_zero_applied\` to false.
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches explained in clean professional language, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.
${DOCUMENTS_EVIDENCE_BLOCK}`;

const DOCUMENTS_PROMPT_EN = `You are an English-language call-center quality analyst.

PATH: DOCUMENTS AUDIT FROM THE CUSTOMER'S / WORKSPACE'S UPLOADED FILES.
You MUST read FILE INDEX, COMPANY RULE CHECKLIST, and COMPANY FILE CONTENTS before assigning any score.
Those files are this organization's uploaded SCORECARD, COMPLIANCE, PROCESS DOCUMENTS, and scripts.
They are the only REFERENCE for criteria, weights, Auto-Zero rules, required phrases, product names, and key terms.
Do not invent a score, a criterion, a company name, or a key term.
If a required behaviour is in the documents and the agent skipped it, mark it as a miss.
If a behaviour is not in the scorecard or process documents, do not penalize it unless it breaks compliance.
Cite the exact file name and criterion in document_references and in metric_evidence.source_file / criterion.

Your job:
1. READ the company files carefully (scorecard first, then compliance, process docs, scripts).
2. READ CALL UNDERSTANDING and the timed transcript so you clearly understand what happened on this call (like a human who listened).
3. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
4. AUDIT the agent against EVERY rule / criterion / weight line in the uploaded company SCORECARD (and COMPANY RULE CHECKLIST). Not a fixed 6-box Zetro rubric.
5. Check every compliance rule from the uploaded files and list breaches.
6. Keep English as spoken. Never translate. If a phrase is clean, put it on the scorecard as evidence. Never copy broken speech-to-text spellings into any scorecard field.
7. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.
8. DEEP TONE, SARCASM & ATTITUDE DETECTION:
   - Analyze the subtle emotional and behavioral tone of both the agent and customer. Agents do NOT need to shout or raise their voice to be rude or unprofessional. Use high discretion to check for sarcasm, frustrations, or other negative traits.
   - LOW-TONE SARCASM, MOCKERY & CONDESCENSION: If the agent speaks in a quiet, calm, or normal volume but uses sarcastic remarks, mockery, condescension, passive-aggressive phrasing, patronizing comments, or contempt (e.g., "What did you expect me to do?", "As I already told you multiple times", "Well, that's not my problem", "If you had bothered to read...", or sarcastic "Thanks for telling me how to do my job"), detect this and penalize severely.
   - DISMISSIVENESS & INDIFFERENCE: Giving curt, dismissive, reluctant, or unhelpful answers, brushing off customer issues, or acting bored and uncaring.
   - SCORING IMPACT:
     * Professionalism: Heavily penalize (drop to 20-50/100).
     * Empathy: Heavily penalize (drop to 10-40/100).
     * Resolution: Penalize if dismissiveness prevented genuine customer assistance.
     * Overall Score: A call with evident mockery, sarcasm, or contempt must not receive a high score.
   - FEEDBACK: Explicitly highlight the subtle tone issue in 'improvements' and 'metric_evidence' notes so managers can coach on attitude and tone.
9. AUDIO QUALITY, NETWORK & PRONUNCIATION ISSUES:
   - You MUST detect if the transcript indicates the agent is not speaking clearly, mispronouncing words, or if there is no sound/silence from the agent.
   - Detect network challenges, low volume from either the customer or agent, and static/noise in the background (e.g., if the transcript has markers for this, or if the customer says "I can't hear you", "The network is bad", etc).
   - If the agent does not speak clearly or mispronounces words, explicitly note this in the scorecard and provide educational coaching in the 'improvements' section (e.g., "The agent should pronounce words clearly and audibly").
   - If there are network issues or static, note it in the 'improvements' or 'summary' so the manager is aware it affected the call quality.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.
- Do NOT assume the first speaker is the agent — use CALL UNDERSTANDING speaker_guess and the cues above.

${HUMAN_JUDGMENT_BLOCK}

${SCRIPT_PROMPT_BLOCK}

Numeric fields:
- parameters: score EVERY company scorecard / checklist criterion (any count). This drives the scorecard UI.
- overall_score / raw_score: follow the company scorecard weighting across those parameters
- greeting, empathy, professionalism, resolution, communication, language_handling: optional closest roll-ups for analytics only — do not replace the company parameter list
- AUTO-ZERO (AUTO-FAIL): If the scorecard explicitly defines an "Auto-Zero" or "Auto-Fail" for a specific severe violation, and the agent commits it, you MUST set the \`auto_zero_applied\` boolean to true. Calculate the \`overall_score\` normally based on all other points earned. The system will automatically zero out the final score if \`auto_zero_applied\` is true, but you must provide the normal sum in \`overall_score\`. Use extreme wisdom: only apply this if it is a genuine, explicitly defined severe violation, to prevent unfair zeroes. If no auto-zero occurred, set \`auto_zero_applied\` to false.
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches with a short quote, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.
${DOCUMENTS_EVIDENCE_BLOCK}`;

export async function analyzeCall(
  utterances: GenericUtterance[],
  agentName: string | null | undefined,
  standardsText: string,
  standards: QaDocument[],
  mode: AuditMode,
  bilingual = true,
  scriptsText = "",
  scriptDocs: QaDocument[] = [],
): Promise<CallAnalysis> {
  const transcript = packTranscriptForAudit(utterances, 16000);
  const understanding = await understandCallBrief(utterances, bilingual, agentName);
  const understandingBlock = formatCallUnderstandingBlock(understanding);

  const holdListen = detectHoldEvents(utterances);
  const holdingDocs = scriptsOf(scriptDocs, "holding");
  const hasHoldingProcedure = holdingDocs.length > 0;
  const holdBlock = formatHoldListenBlock(holdListen, hasHoldingProcedure);
  const applyHoldingNow =
    holdListen.detected && hasHoldingProcedure
      ? `\n\nAPPLY THIS COMPANY HOLDING PROCEDURE NOW (hold/wait was heard on this recording — follow these company rules only, do not invent others):\n${clipText(
          holdingDocs
            .map((doc) => `### ${doc.title} (${doc.file_name})\n${(doc.extracted_text || "").trim()}`)
            .join("\n\n"),
          3500,
        )}`
      : "";

  const scriptsBlock = scriptsText.trim()
    ? `\n\nORGANIZATION CALL SCRIPTS (shared by all agents; holding procedure is optional and applies only if a hold was heard):\n${clipText(scriptsText.trim(), 4000)}`
    : "";

  const documentKeyTerms =
    mode === "documents"
      ? extractKeytermsFromDocuments(scriptDocs.length ? scriptDocs : standards, 48)
      : [];
  const keyTermsBlock =
    mode === "documents" && documentKeyTerms.length
      ? `\n\nKEY TERMS FROM COMPANY DOCUMENTS (use these spellings only; do not invent terms from the transcript):\n${documentKeyTerms.join(", ")}`
      : "";

  const userPrompt = `${agentName ? `Explicitly Submitted Agent Name: ${agentName}\n\n` : ""}READ THE CUSTOMER'S / WORKSPACE'S UPLOADED FILES FIRST.
1) FILE INDEX — which files exist
2) COMPANY RULE CHECKLIST — every rule to score (one parameters[] row each)
3) SCORECARD / COMPLIANCE / PROCESS DOCUMENTS — full text behind those rules
Score only from those files. Do not invent a Zetro rubric, company name, or key term.
If the checklist lists N rules, return about N parameters with matching names, a short note, and a transcript quote for each (including 100% scores).

Then UNDERSTAND the call (CALL UNDERSTANDING + timed transcript) before you assign marks — like a wise human QA who listened carefully.

${clipKeepStart(standardsText, 56000)}${scriptsBlock}${keyTermsBlock}\n\n${understandingBlock}\n\n${holdBlock}${applyHoldingNow}\n\nTimed transcript, meaning-repaired for clear understanding (opening + closing preserved). Audit against the company checklist, scorecard, scripts, and key terms. Put CLEAN Kiswahili/English on the scorecard. If a word is still broken, do not mention it:\n${transcript}`;

  const parsed = (await completeJson(
    bilingual
      ? DOCUMENTS_PROMPT
      : DOCUMENTS_PROMPT_EN,
    userPrompt,
    "call_analysis",
    ANALYSIS_SCHEMA,
    "reasoning",
  )) as CallAnalysis & {
    raw_score?: unknown;
    auto_zero_applied?: boolean;
    speaker_assignments?: { speaker_label: string; role: SpeakerRole }[];
    compliance_findings?: string[];
    metric_evidence?: unknown;
    hold_detected?: unknown;
    hold_findings?: unknown;
    document_references?: unknown;
    parameters?: unknown;
  };
  const speakerMap: Record<string, SpeakerRole> = {
    ...(parsed.speaker_map || {}),
  };
  for (const row of parsed.speaker_assignments || []) {
    speakerMap[row.speaker_label] = row.role === "agent" ? "agent" : "customer";
  }
  for (const row of understanding?.speaker_guess || []) {
    if (!speakerMap[row.speaker_label]) {
      speakerMap[row.speaker_label] = row.role;
    }
  }

  if (!Object.values(speakerMap).includes("agent") && utterances.length) {
    const fromBrief = understanding?.speaker_guess?.find((row) => row.role === "agent");
    if (fromBrief?.speaker_label) {
      speakerMap[fromBrief.speaker_label] = "agent";
    } else {
      const greet = utterances.find((u) =>
        /\b(habari|karibu|asante kwa kupiga|thank you for calling|how (can|may) i help|my name is|jina langu)\b/i.test(
          u.text,
        ),
      );
      speakerMap[(greet || utterances[0]).speaker] = "agent";
    }
  }

  const holdFindings = cleanScoreLines(
    (Array.isArray(parsed.hold_findings) ? parsed.hold_findings : []).filter((item) => {
      const n = String(item).trim().toLowerCase();
      return n && n !== "no hold in this call" && n !== "none" && n !== "n/a" && n !== "none identified";
    }),
  );
  const holdDetected = holdListen.detected || parsed.hold_detected === true;
  const catalogFiles = (scriptDocs.length ? scriptDocs : standards).filter(
    (doc) => (doc.extracted_text || "").trim(),
  );
  const metric_evidence = normalizeMetricEvidence(
    parsed.metric_evidence,
    utterances,
    catalogFiles,
  );
  if (holdDetected && hasHoldingProcedure && !metric_evidence.holding && (holdFindings.length || holdListen.events[0])) {
    const first = holdListen.events[0];
    metric_evidence.holding = {
      verdict: holdFindings.some((f) => /miss|did not|failed|skipped|no check/i.test(f))
        ? "miss"
        : holdFindings.length
          ? "partial"
          : "hit",
      quote: cleanScoreQuote(first?.quote || "", first?.quote || ""),
      note: holdFindings[0] || "Hold procedure reviewed against the company file.",
      start_s: first?.start_s ?? null,
      findings: holdFindings.length ? holdFindings : undefined,
    };
  } else if (metric_evidence.holding && holdFindings.length && !metric_evidence.holding.findings) {
    metric_evidence.holding.findings = holdFindings;
  }
  if (!holdDetected || !hasHoldingProcedure) {
    delete metric_evidence.holding;
  }

  const document_references = normalizeDocumentReferences(
    parsed.document_references,
    catalogFiles,
  );
  if (!document_references.length) {
    for (const key of SCORE_DIMENSIONS) {
      const ev = metric_evidence[key];
      if (ev?.source_file && ev?.criterion) {
        document_references.push({
          file_name: ev.source_file,
          criterion: ev.criterion,
          result: ev.verdict,
        });
      }
    }
  }
  metric_evidence.document_references = document_references;
  const parameters = normalizeScoreParameters(
    parsed.parameters,
    catalogFiles,
    document_references,
    utterances,
  );
  if (parameters.length) {
    metric_evidence.parameters = parameters;
  }
  delete metric_evidence.key_terms;
  if (parsed.raw_score != null) {
    metric_evidence.raw_score = clamp(parsed.raw_score);
  }

  let final_overall_score = clamp(parsed.overall_score);
  if (parameters.length) {
    const weighted = parameters.filter(
      (row) => row.weight_pct != null && Number(row.weight_pct) > 0,
    );
    if (weighted.length) {
      const totalWeight = weighted.reduce((sum, row) => sum + Number(row.weight_pct), 0);
      if (totalWeight > 0) {
        final_overall_score = clamp(
          weighted.reduce(
            (sum, row) => sum + (row.score * Number(row.weight_pct)) / totalWeight,
            0,
          ),
        );
      }
    } else {
      final_overall_score = clamp(
        parameters.reduce((sum, row) => sum + row.score, 0) / parameters.length,
      );
    }
  }
  
  if (parsed.auto_zero_applied) {
    if (parsed.raw_score == null) {
      metric_evidence.raw_score = final_overall_score; // Save what would have been the score
    }
    final_overall_score = 0;
  }

  const greeting = rollupDimensionFromParameters(
    parameters,
    [/greet/i, /opening/i, /identity/i, /salamu/i],
    clamp(parsed.greeting),
  );
  const empathy = rollupDimensionFromParameters(
    parameters,
    [/empath/i, /listen/i, /compassion/i, /huruma/i],
    clamp(parsed.empathy),
  );
  const professionalism = rollupDimensionFromParameters(
    parameters,
    [/profession/i, /tone/i, /demeanor/i, /courtesy/i, /etiquette/i],
    clamp(parsed.professionalism),
  );
  const resolution = rollupDimensionFromParameters(
    parameters,
    [/resolut/i, /next step/i, /ownership/i, /closing/i, /solution/i],
    clamp(parsed.resolution),
  );
  const communication = rollupDimensionFromParameters(
    parameters,
    [/communicat/i, /clarity/i, /clear/i, /explain/i],
    clamp(parsed.communication),
  );
  const language_handling = rollupDimensionFromParameters(
    parameters,
    [/language/i, /kiswahili/i, /english/i, /bilingual/i],
    clamp(parsed.language_handling),
  );

  return {
    speaker_map: speakerMap,
    overall_score: final_overall_score,
    greeting,
    empathy,
    professionalism,
    resolution,
    communication,
    language_handling,
    verdict: parsed.verdict || "needs_improvement",
    customer_sentiment: parsed.customer_sentiment || "unknown",
    summary: cleanScoreLine(parsed.summary || ""),
    strengths: cleanScoreLines(parsed.strengths),
    improvements: cleanScoreLines(parsed.improvements),
    compliance_findings: cleanScoreLines(parsed.compliance_findings),
    hold_findings: holdDetected && hasHoldingProcedure ? holdFindings : [],
    metric_evidence,
    standards_used: (() => {
      const fromStandards =
        mode === "documents"
          ? standards.map((doc) => ({
              id: doc.id,
              kind: doc.kind,
              title: doc.title,
              file_name: doc.file_name,
            }))
          : [];
      const fromScripts = SCRIPT_KINDS.flatMap((kind) =>
        scriptsOf(scriptDocs, kind).map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          title: doc.title,
          file_name: doc.file_name,
        })),
      );
      const seen = new Set(fromStandards.map((d) => d.id));
      return [...fromStandards, ...fromScripts.filter((d) => !seen.has(d.id))];
    })(),
    audit_mode: mode,
  };
}
