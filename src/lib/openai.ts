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
import { formatCompanyRuleChecklist } from "@/lib/qa-documents";
import { extractKeytermsFromDocuments, scriptsOf } from "@/lib/call-scripts";
import { detectHoldEvents, formatHoldListenBlock } from "@/lib/detect-holds";
import { cleanScoreLine, cleanScoreLines, cleanScoreQuote } from "@/lib/clean-score-text";
import { overallFromParameters, verdictFromOverall } from "@/lib/score-variance";
import { normalizeCustomerVoice } from "@/lib/customer-voice";

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
    customer_sentiment: {
      type: "string",
      enum: ["satisfied", "frustrated", "mixed", "neutral", "unknown"],
    },
    customer_voice: {
      type: "object",
      additionalProperties: false,
      properties: {
        stance: {
          type: "string",
          enum: ["satisfied", "frustrated", "mixed", "neutral", "unknown"],
        },
        satisfaction_themes: {
          type: "array",
          items: { type: "string" },
        },
        frustration_themes: {
          type: "array",
          items: { type: "string" },
        },
        note: { type: "string" },
        quote: { type: "string" },
      },
      required: [
        "stance",
        "satisfaction_themes",
        "frustration_themes",
        "note",
        "quote",
      ],
    },
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
          gap_note: { type: "string" },
          quote: { type: "string" },
          utterance_index: { type: "integer" },
        },
        required: [
          "name",
          "score",
          "result",
          "source_file",
          "note",
          "gap_note",
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
    "customer_voice",
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
- First read COMPANY RULE CHECKLIST and the SCORECARD file(s) carefully. Those lines are the ONLY audit.
- Output ONE entry for EVERY scored criterion / parameter / weight / Auto-Zero line found in the uploaded company SCORECARD (and related standards scripts when they are scored).
- If COMPANY RULE CHECKLIST lists N rules, parameters MUST have about N entries (same names). Missing a listed rule is not allowed.
- Do NOT stop at 6 items. If the company file has 8, 12, 20, or more lines, score all of them.
- Do NOT invent Zetro's generic categories (Greeting & Identity, Empathy & Active Listening, etc.) unless that exact line appears in the company files.
- name: the criterion name exactly as written in the company file (include weight text if it is part of the line).
- score: 0–100 for how well the agent met THAT ONE company rule on this call — nothing else. Apply only that line's own scoring / Auto-Zero / Auto-100 / "if applicable" rules from the company file and the PARAMETER PLAYBOOK.
- weight_pct: copy the EXACT weight printed on that scorecard line (e.g. 3, 7.5, 12, 15). Do NOT invent 5/10/20/25% defaults. If the file has no weight for that line, set null.
- result: hit, miss, or partial according to THAT company rule only.
- source_file: exact uploaded file name from FILE INDEX.
- note: one short English sentence explaining WHY this score was EARNED for THIS parameter only (what the agent did vs that company rule / playbook meaning). Do not mention other parameters. Required even for 100%.
- gap_note: one short sentence explaining WHY points were CUT on THIS parameter only (what was missing vs that same company rule). FORBIDDEN: blaming holding, opening, product knowledge, tone, or any OTHER parameter for this cut. Example bad: cutting "Provide further assistance" because hold procedure failed. Example good: cutting it only if further assistance itself was incomplete. If score is 100, use "" or "Full marks — nothing deducted." If score is 0, explain the full miss of THIS rule. Required for every parameter.
- quote: a SHORT clean transcript snippet that proves THIS parameter's score. Never paste garbled ASR. If "If applicable" and not needed, quote "" and say so in note.
- utterance_index: the timed turn index [i] that best supports the quote, or -1 if no turn applies.

SPECIAL MARKS ON COMPANY LINES (read from scorecard / PARAMETER PLAYBOOK):
- Auto Zero / Auto-Fail / (Auto Zero): if THAT line's fail condition is met, score that parameter 0 and set auto_zero_applied=true when the company intends call-level zero.
- Auto 100 / Auto-Pass / (Auto 100): if THAT line's full-marks condition is fully met, score that parameter 100.
- If applicable: if the situation did not arise on this call, do not invent a miss for that line.
- These marks apply ONLY to the line that carries them — never to other parameters.

PARAMETER INDEPENDENCE (critical — never violate):
- Each parameter is judged alone. A miss on Hold procedure must NOT reduce Opening, Product knowledge, Provide further assistance, Empathy, Closing, or any other line.
- Put hold issues only on the Hold / Holding parameter (and hold_findings). Put opening issues only on Opening. Put product knowledge only on Product/Services knowledge. And so on.
- gap_note for parameter A may only cite failures of parameter A's own company rule.

You MUST also output document_references (same criteria list is fine). Inventing a score, a weight, or a criterion that is not in the company files is forbidden.

document_references: one row per criterion you actually scored from the uploaded files.
- file_name: exact uploaded file name from FILE INDEX.
- criterion: the rule / line / weight you used from that file.
- result: hit, miss, or partial.

metric_evidence (optional roll-up into 6 buckets for analytics only — not the scorecard UI):
- If helpful, also map evidence into greeting / empathy / professionalism / resolution / communication / language_handling.
- source_file, criterion, quote, note, verdict, utterance_index as before.
- Do not use these roll-ups to justify cutting an unrelated company parameter.

hold_detected: true if the timed transcript/audio shows a hold or wait.
hold_findings: if hold_detected and a HOLDING PROCEDURE file exists, list each company hold rule that was followed or missed. If no hold, return [].
Hold findings must NOT be copied into gap_note of non-hold parameters.
`;

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
    return { max_completion_tokens: extra ? 24000 : 12000 };
  }
  // Full scorecards need room for many parameters + customer_voice in one JSON reply.
  return { max_tokens: extra ? 16000 : 8192 };
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
  scoringSeed?: number,
): Promise<CallUnderstanding | null> {
  if (!utterances.length) return null;
  const transcript = packTranscriptForAudit(utterances, 14000);
  const system = bilingual
    ? `You are an experienced bilingual (Kiswahili + English) contact-center QA coach.
Your only job is to UNDERSTAND this call clearly — like a human who listened carefully — before any scorecard is filled.
Do not invent facts. If ASR is unclear, say so in unclear_parts.
Write every note in English, even when the call is Kiswahili or mixed. You may quote a short original phrase, then gloss it in English.
Identify Agent vs Customer from what they say (greeting/script vs problem/complaint), not from who spoke first.
Be consistent: the same recording should yield the same understanding every time.`
    : `You are an experienced contact-center QA coach.
Your only job is to UNDERSTAND this call clearly — like a human who listened carefully — before any scorecard is filled.
Do not invent facts. If ASR is unclear, say so in unclear_parts. Write every note in English.
Identify Agent vs Customer from what they say (greeting/script vs problem/complaint), not from who spoke first.
Be consistent: the same recording should yield the same understanding every time.`;

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
      { stable: true, seed: scoringSeed },
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

const PARAMETER_PLAYBOOK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    parameters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          meaning: { type: "string" },
          full_marks_requires: { type: "string" },
          deduction_or_fail_when: { type: "string" },
          special_rule: {
            type: "string",
            enum: ["none", "auto_zero", "auto_100", "if_applicable"],
          },
          weight_pct: { type: ["number", "null"] },
        },
        required: [
          "name",
          "meaning",
          "full_marks_requires",
          "deduction_or_fail_when",
          "special_rule",
          "weight_pct",
        ],
      },
    },
  },
  required: ["parameters"],
} as const;

export type ParameterPlaybookEntry = {
  name: string;
  meaning: string;
  full_marks_requires: string;
  deduction_or_fail_when: string;
  special_rule: "none" | "auto_zero" | "auto_100" | "if_applicable";
  weight_pct: number | null;
};

function normalizeSpecialRule(value: unknown): ParameterPlaybookEntry["special_rule"] {
  const raw = String(value || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (raw.includes("autozero") || raw.includes("autofail")) return "auto_zero";
  if (raw.includes("auto100") || raw.includes("autopass")) return "auto_100";
  if (raw.includes("ifapplicable") || raw.includes("applicable")) return "if_applicable";
  return "none";
}

/**
 * Read company scorecard lines first — explain what each parameter means
 * (including Auto Zero / Auto 100) before any call score is assigned.
 */
export async function understandCompanyParameters(
  docs: QaDocument[],
  standardsText: string,
  scoringSeed?: number,
): Promise<ParameterPlaybookEntry[]> {
  const checklist = formatCompanyRuleChecklist(docs);
  const scorecardDocs = docs.filter((doc) => doc.kind === "scorecard");
  const scorecardBody = scorecardDocs.length
    ? scorecardDocs
        .map((doc) => `### ${doc.file_name}\n${(doc.extracted_text || "").trim()}`)
        .join("\n\n")
    : standardsText;
  if (!checklist.trim() && !scorecardBody.trim()) return [];

  try {
    const parsed = (await completeJson(
      `You are a contact-center QA standards analyst.
Your ONLY job is to READ the company's uploaded scorecard / standards and build a clear playbook for each scored parameter BEFORE any call is audited.

Rules:
- Use ONLY what is written in the company files. Do not invent Zetro categories.
- For each parameter, explain in plain English what it checks (you may translate or clarify awkward labels).
- Detect special marks exactly: (Auto Zero), Auto-Zero, Auto-Fail → special_rule=auto_zero; (Auto 100), Auto-100, Auto-Pass → special_rule=auto_100; If applicable → if_applicable; otherwise none.
- auto_zero means: if THAT parameter's severe miss happens, the call overall can be forced to 0 (company Auto-Zero).
- auto_100 means: if THAT parameter's required behaviour is fully met as the company defines, that parameter scores 100 automatically for that line.
- weight_pct must be the EXACT percentage from the company line (3, 7, 12, 15, etc.). Never invent 5/10/20/25 defaults. Use null if the file has no weight.
- Each parameter is independent — do not merge hold into opening, etc.
- Write all explanations in English.`,
      [
        checklist || "No checklist extracted — read the scorecard text below carefully.",
        "COMPANY SCORECARD / STANDARDS TEXT:",
        clipKeepStart(scorecardBody, 28000),
        "Return one playbook entry for every scored criterion / weight / Auto-Zero / Auto-100 / If-applicable line.",
      ].join("\n\n"),
      "company_parameter_playbook",
      PARAMETER_PLAYBOOK_SCHEMA,
      "reasoning",
      { stable: true, seed: scoringSeed },
    )) as { parameters?: unknown[] };

    const rows = Array.isArray(parsed.parameters) ? parsed.parameters : [];
    const out: ParameterPlaybookEntry[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      const name = cleanScoreLine(String(item.name || "")).slice(0, 180);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const weightRaw = item.weight_pct;
      const weight =
        weightRaw == null || weightRaw === ""
          ? null
          : Number.isFinite(Number(weightRaw))
            ? Math.max(0, Math.min(100, Number(weightRaw)))
            : null;
      const fromField = normalizeSpecialRule(item.special_rule);
      const fromName = normalizeSpecialRule(name);
      out.push({
        name,
        meaning: cleanScoreLine(String(item.meaning || "")).slice(0, 320),
        full_marks_requires: cleanScoreLine(String(item.full_marks_requires || "")).slice(
          0,
          320,
        ),
        deduction_or_fail_when: cleanScoreLine(
          String(item.deduction_or_fail_when || ""),
        ).slice(0, 320),
        // Prefer explicit special_rule; also catch "(Auto Zero)" baked into the line name.
        special_rule: fromField !== "none" ? fromField : fromName,
        weight_pct: weight,
      });
      if (out.length >= 60) break;
    }
    return out;
  } catch {
    return [];
  }
}

function formatParameterPlaybookBlock(entries: ParameterPlaybookEntry[]) {
  if (!entries.length) return "";
  const lines = entries.map((row, index) => {
    const weight =
      row.weight_pct == null ? "weight not stated in file" : `weight ${row.weight_pct}%`;
    const special =
      row.special_rule === "auto_zero"
        ? "SPECIAL: Auto Zero / Auto-Fail for THIS line — if the fail condition happens, set this parameter to 0 and auto_zero_applied=true for the call when the company intends call-level zero."
        : row.special_rule === "auto_100"
          ? "SPECIAL: Auto 100 / Auto-Pass for THIS line — if the full-marks condition is fully met, score this parameter 100."
          : row.special_rule === "if_applicable"
            ? "SPECIAL: If applicable — if the situation did not arise, do not force a miss; note N/A in gap_note and score fairly."
            : "SPECIAL: none";
    return [
      `${index + 1}. ${row.name} (${weight})`,
      `   Meaning: ${row.meaning || "as written on the company scorecard"}`,
      `   Full marks requires: ${row.full_marks_requires || "meet this company line fully"}`,
      `   Deduct / fail when: ${row.deduction_or_fail_when || "this company line is missed"}`,
      `   ${special}`,
    ].join("\n");
  });
  return [
    "COMPANY PARAMETER PLAYBOOK (read this before scoring — built from the uploaded Standards):",
    "This explains what each company parameter means. Score ONLY against these meanings.",
    "Do not invent extra parameters. Do not mix deductions across lines.",
    ...lines,
  ].join("\n");
}

function normalizeParamMatchKey(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/auto[\s_-]*zero|auto[\s_-]*fail|auto[\s_-]*100|auto[\s_-]*pass|if\s*applicable/gi, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function nameMarksAutoZero(name: string) {
  return normalizeSpecialRule(name) === "auto_zero";
}

function findPlaybookGuide(
  name: string,
  playbook: ParameterPlaybookEntry[],
  byName: Map<string, ParameterPlaybookEntry>,
): ParameterPlaybookEntry | undefined {
  const exact = byName.get(name.trim().toLowerCase());
  if (exact) return exact;
  const key = normalizeParamMatchKey(name);
  if (!key) return undefined;
  return (
    playbook.find((row) => normalizeParamMatchKey(row.name) === key) ||
    playbook.find((row) => {
      const other = normalizeParamMatchKey(row.name);
      return Boolean(other && (other.includes(key) || key.includes(other)));
    })
  );
}

function applyPlaybookSpecialScores(
  parameters: ScoreParameter[],
  playbook: ParameterPlaybookEntry[],
): { parameters: ScoreParameter[]; autoZeroFromPlaybook: boolean } {
  if (!parameters.length) {
    return { parameters, autoZeroFromPlaybook: false };
  }
  const byName = new Map(playbook.map((row) => [row.name.trim().toLowerCase(), row]));
  let autoZeroFromPlaybook = false;
  const next = parameters.map((row) => {
    const guide = findPlaybookGuide(row.name, playbook, byName);
    const special =
      guide?.special_rule && guide.special_rule !== "none"
        ? guide.special_rule
        : nameMarksAutoZero(row.name)
          ? "auto_zero"
          : "none";
    const patched: ScoreParameter = {
      ...row,
      weight_pct: row.weight_pct ?? guide?.weight_pct ?? row.weight_pct,
    };
    if (special === "auto_100" && (row.result === "hit" || row.score >= 95)) {
      patched.score = 100;
      patched.result = "hit";
      if (!patched.gap_note) patched.gap_note = "Full marks — Auto 100 condition met.";
    }
    // Company Auto Zero / Auto-Fail: a clear miss on that line zeros the whole call.
    if (special === "auto_zero" && (row.result === "miss" || row.score < 50)) {
      patched.score = 0;
      patched.result = "miss";
      autoZeroFromPlaybook = true;
      if (!patched.gap_note) {
        patched.gap_note =
          "Auto Zero — company critical fail on this line; call overall forced to 0.";
      }
    }
    return patched;
  });
  return { parameters: next, autoZeroFromPlaybook };
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
    const gap_note = cleanScoreLine(String(item.gap_note || "")).slice(0, 280);
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
    const scoreValue = clamp(item.score);
    push({
      name,
      score: scoreValue,
      weight_pct: weight,
      result: normalizeEvidenceVerdict(item.result),
      utterance_index: fromUtterance ? index : null,
      start_s,
      ...(source_file ? { source_file } : {}),
      ...(note ? { note } : {}),
      ...(gap_note
        ? { gap_note }
        : scoreValue >= 100
          ? { gap_note: "Full marks — nothing deducted." }
          : {}),
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
    if (/\bseed\b/i.test(message) && "seed" in body) {
      const { seed: _s, ...withoutSeed } = body as typeof body & { seed?: number };
      return getOpenAI().chat.completions.create(withoutSeed);
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
  options: { stable?: boolean; seed?: number } = {},
) {
  const { aiTemperature } = getServerEnv();
  const models = modelsFor(mode);
  let lastError: unknown;
  const temperature = options.stable ? 0 : aiTemperature;

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
          body.temperature = temperature;
        }
        if (options.stable && typeof options.seed === "number") {
          (body as { seed?: number }).seed = options.seed;
        }
        if (isReasoningModel(model) && !noReasoningEffort.has(model)) {
          // Medium effort for careful standards reading on stable audits.
          body.reasoning_effort = options.stable ? "medium" : "low";
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
      // Drop seed if the model rejects it, then retry without seed once.
      if (
        options.stable &&
        options.seed != null &&
        error instanceof Error &&
        /seed/i.test(error.message)
      ) {
        options = { ...options, seed: undefined };
        continue;
      }
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
- If a HOLDING PROCEDURE file is provided AND hold/wait was heard, walk through THAT company's hold rules only. Missed hold rules go in hold_findings and ONLY on the Holding / Hold procedure scorecard parameter (if the company has one). Do NOT deduct Opening, Product knowledge, Further assistance, Empathy, Closing, or other unrelated parameters for a hold miss.
- If no hold/wait was heard, ignore the holding file even if it is uploaded. hold_detected=false, hold_findings=[]. Do not penalize holding.
- If no holding procedure file is provided, do not invent hold rules.`;

const HUMAN_JUDGMENT_BLOCK = `
HUMAN-LIKE UNDERSTANDING + CONSISTENT COMPANY AUDIT:
- The timed transcript was meaning-repaired from speech recognition so you can understand the call clearly. Treat CALL UNDERSTANDING as your listening notes from a careful human coach.
- First READ the company Standards carefully (scorecard, compliance, process docs, scripts). Those files are the only scoring law for this company.
- Then understand the full call arc: opening → customer issue → agent actions → outcome / closing.
- Score EACH company parameter independently against its own line in the scorecard — like a human QA who marks one box at a time without mixing boxes.
- Be wise and fair: weigh intent and context for THAT parameter only — not isolated keywords, and not other parameters' failures.
- CONSISTENCY: The same recording audited against the same company documents must yield nearly the same marks (±5) no matter which account audits it or how many times it is audited. If CONSISTENCY ANCHOR is present, stay inside that band.
- If the customer never needed a behaviour (and the scorecard says "if applicable"), do not force a miss on that line.
- If ASR was unclear (see unclear_parts), do not invent a severe miss from gibberish; be conservative and fair on that criterion.
- Closing and resolution often appear late — the transcript includes opening AND closing turns; read both.
- Sarcasm, cold dismissal, or empty promises still count on the parameters that actually measure tone / professionalism / empathy in the company file — not on unrelated lines.
- Only leave the consistency band for a newly applied company Auto-Zero.
- Scores must follow the company SCORECARD / CHECKLIST exactly — including each line's real weight. Do not invent a new rubric or default weight set.`;

const STANDARDS_READING_BLOCK = `
CAREFUL STANDARDS READING (required before any mark):
- Read FILE INDEX, COMPANY RULE CHECKLIST, COMPANY PARAMETER PLAYBOOK, then the full SCORECARD text, then COMPLIANCE, then PROCESS DOCUMENTS and scripts.
- The PARAMETER PLAYBOOK explains what each company line means in plain English — use it to understand awkward labels, Auto Zero, Auto 100, and If applicable.
- Extract every criterion EXACTLY as written, with its EXACT weight % from the file (companies differ — some use 3%, 7%, 12%, 15%, etc.; never assume 5/10/20/25).
- Extract Auto-Zero / Auto-100 / "if applicable" marks only as the company wrote them on each line.
- Apply the company's own definitions and examples from their files; do not substitute a generic Zetro rubric.
- Key terms, product names, and required phrases come only from those uploaded files.
- When a rule is ambiguous, prefer the company's wording + playbook meaning, and stay consistent with prior audits of this recording.
- Never transfer a deduction from one scorecard line to another.`;

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
1. READ the company Standards carefully (scorecard first, then compliance, process docs, scripts) — every criterion and weight.
2. READ CALL UNDERSTANDING and the timed transcript so you clearly understand what happened on this call (like a human who listened).
3. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
4. AUDIT the agent against EVERY rule / criterion / weight line in the uploaded company SCORECARD (and COMPANY RULE CHECKLIST). Not a fixed 6-box Zetro rubric.
5. Check every compliance rule from the uploaded files and list breaches.
6. Stay consistent with CONSISTENCY ANCHOR when present (±5) so repeated / multi-account audits of this recording agree.
7. WRITE THE WHOLE AUDIT IN ENGLISH:
   - The call may be Kiswahili, English, or mixed. Understand it in its own language, then report on it in professional English. QA analysts read English only.
   - EVERY written field is English: summary, strengths, improvements, compliance_findings, hold_findings, each parameter note and gap_note, and every metric_evidence note. Never write these in Kiswahili.
   - metric_evidence.quote is EVIDENCE, not analysis: keep it verbatim in the language the speaker used. Do not translate or rewrite a quote. When a Kiswahili quote needs explaining, add a short English gloss in square brackets after it, e.g. "Samahani kwa usumbufu" [Sorry for the trouble].
   - Evidence comes from the company SCORECARD and the CLEAN SCRIPT, checked against the meaning-repaired conversation.
   - NEVER put broken, fused, misspelled, or garbled speech-to-text words on the scorecard (quote, note, summary, strengths, improvements, compliance). If a word is not clean, omit it and make the point in clear English.
8. PRIVACY:
   - The full transcript stays internal. The scorecard may show only short clean evidence quotes, not whole turns.
9. AGENT & COMPANY NAMES:
   - Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.
10. SPEAKER ROLES IN TEXT:
   - When writing your notes, summaries, and findings, always refer to the speakers as 'Agent' (or their name) and 'Customer'. Do NOT use raw transcript labels like 'Speaker A' or 'Speaker 1' in your written analysis, though you must still output the exact speaker_label string in the speaker_assignments array.
11. DEEP TONE, SARCASM & ATTITUDE DETECTION:
   - You MUST analyze the subtle emotional, conversational, and behavioral tone of both the agent and customer beyond just volume or shouting. Detect sarcasm, frustration, mockery, and dismissiveness even when spoken in Kiswahili.
   - LOW-TONE SARCASM & MOCKERY: An agent does NOT need to yell to be rude. Quiet sarcasm, cynical rhetorical questions, or dismissive phrasing still count — including Kiswahili examples such as "Sasa unataka nikufanyie nini?", "Hata mtoto anajua hilo", "Si nilishakwambia?", "Huwezi kusoma?". Describe the issue in English in the scorecard.
   - DISMISSIVENESS & PASSIVE-AGGRESSION: Giving curt, indifferent, dismissive, or reluctant one-word answers, brushing off the customer's problem, sighing with irritation, or acting bored.
   - CONDESCENSION & SUPERIORITY: Belittling the customer, speaking down to them, or making them feel foolish for asking questions.
   - SCORING IMPACT OF NEGATIVE TONES:
     * Professionalism: Severe penalty (drop to 20-50/100). Sarcasm, mockery, or subtle insults completely violate professional contact center standards.
     * Empathy: Severe penalty (drop to 10-40/100). Cold, dismissive, or mocking responses to customer distress represent zero active empathy.
     * Resolution: Penalize if dismissive tone led to incomplete, careless, or unhelpful support.
     * Overall Score: A call with evident mockery, sarcasm, or contempt must NEVER receive a passing/high score.
   - COACHING & FEEDBACK: If low-tone mockery or sarcasm is detected, identify it in English in 'improvements' and the relevant metric_evidence notes (example: "Although the agent did not raise their voice, they used sarcastic or dismissive language when they said…").
12. AUDIO QUALITY, NETWORK & PRONUNCIATION ISSUES:
   - You MUST detect if the transcript indicates the agent is not speaking clearly, mispronouncing words, or if there is no sound/silence from the agent.
   - Detect network challenges, low volume, and static (including when the customer says they cannot hear, e.g. "Sikuskii vizuri" / "the network is poor"). Write the finding in English.
   - If the agent does not speak clearly or mispronounces words, note it on the scorecard and coach in English in 'improvements' (example: "The agent should pronounce words clearly and distinctly.").
   - If there are network issues or static, note it in English in 'improvements' or 'summary' so the manager is aware it affected call quality.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.
- Do NOT assume the first speaker is the agent — use CALL UNDERSTANDING speaker_guess and the cues above.

${STANDARDS_READING_BLOCK}

${HUMAN_JUDGMENT_BLOCK}

${SCRIPT_PROMPT_BLOCK}

Numeric fields:
- parameters: score EVERY company scorecard / checklist criterion (any count). This drives the scorecard UI.
- overall_score / raw_score: follow the company scorecard weighting across those parameters
- customer_sentiment + customer_voice: Listen to the CUSTOMER (not the agent). Set customer_sentiment and customer_voice.stance to one of: satisfied, frustrated, mixed, neutral, unknown.
  * satisfaction_themes: short English phrases for what the customer liked / appreciated about the service (empty array if none).
  * frustration_themes: short English phrases for what the customer complained about or disliked (empty array if none).
  * note: one short English sentence on how the customer felt about the service.
  * quote: a short customer quote that supports the stance (or empty string).
  This is for company dashboards — be honest even when the agent scored well.
- greeting, empathy, professionalism, resolution, communication, language_handling: optional closest roll-ups for analytics only — do not replace the company parameter list
- AUTO-ZERO / AUTO-100: Follow the company scorecard and PARAMETER PLAYBOOK. If a line marked Auto Zero / Auto-Fail is truly violated, set that parameter to 0 and set \`auto_zero_applied\` true when the company intends a call-level zero. If a line marked Auto 100 / Auto-Pass is fully met, score that parameter 100. Always calculate the normal weighted sum first and put it in BOTH \`overall_score\` and \`raw_score\`. The system then forces \`overall_score\` to 0 when Auto Zero applies, and keeps \`raw_score\` as the Favoured Score. Use extreme wisdom: only apply Auto Zero for a genuine, explicitly defined severe violation on that line. If no auto-zero occurred, set \`auto_zero_applied\` to false.
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
1. READ the company Standards carefully (scorecard first, then compliance, process docs, scripts) — every criterion and weight.
2. READ CALL UNDERSTANDING and the timed transcript so you clearly understand what happened on this call (like a human who listened).
3. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
4. AUDIT the agent against EVERY rule / criterion / weight line in the uploaded company SCORECARD (and COMPANY RULE CHECKLIST). Not a fixed 6-box Zetro rubric.
5. Check every compliance rule from the uploaded files and list breaches.
6. Stay consistent with CONSISTENCY ANCHOR when present (±5) so repeated / multi-account audits of this recording agree.
7. WRITE THE WHOLE AUDIT IN ENGLISH. Quotes may stay in the speaker's language with a short English gloss in square brackets. Never copy broken speech-to-text spellings into any scorecard field.
8. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.
9. DEEP TONE, SARCASM & ATTITUDE DETECTION:
   - Analyze the subtle emotional and behavioral tone of both the agent and customer. Agents do NOT need to shout or raise their voice to be rude or unprofessional. Use high discretion to check for sarcasm, frustrations, or other negative traits.
   - LOW-TONE SARCASM, MOCKERY & CONDESCENSION: If the agent speaks in a quiet, calm, or normal volume but uses sarcastic remarks, mockery, condescension, passive-aggressive phrasing, patronizing comments, or contempt (e.g., "What did you expect me to do?", "As I already told you multiple times", "Well, that's not my problem", "If you had bothered to read...", or sarcastic "Thanks for telling me how to do my job"), detect this and penalize severely.
   - DISMISSIVENESS & INDIFFERENCE: Giving curt, dismissive, reluctant, or unhelpful answers, brushing off customer issues, or acting bored and uncaring.
   - SCORING IMPACT:
     * Professionalism: Heavily penalize (drop to 20-50/100).
     * Empathy: Heavily penalize (drop to 10-40/100).
     * Resolution: Penalize if dismissiveness prevented genuine customer assistance.
     * Overall Score: A call with evident mockery, sarcasm, or contempt must not receive a high score.
   - FEEDBACK: Explicitly highlight the subtle tone issue in 'improvements' and 'metric_evidence' notes so managers can coach on attitude and tone.
10. AUDIO QUALITY, NETWORK & PRONUNCIATION ISSUES:
   - You MUST detect if the transcript indicates the agent is not speaking clearly, mispronouncing words, or if there is no sound/silence from the agent.
   - Detect network challenges, low volume from either the customer or agent, and static/noise in the background (e.g., if the transcript has markers for this, or if the customer says "I can't hear you", "The network is bad", etc).
   - If the agent does not speak clearly or mispronounces words, explicitly note this in the scorecard and provide educational coaching in the 'improvements' section (e.g., "The agent should pronounce words clearly and audibly").
   - If there are network issues or static, note it in the 'improvements' or 'summary' so the manager is aware it affected the call quality.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.
- Do NOT assume the first speaker is the agent — use CALL UNDERSTANDING speaker_guess and the cues above.

${STANDARDS_READING_BLOCK}

${HUMAN_JUDGMENT_BLOCK}

${SCRIPT_PROMPT_BLOCK}

Numeric fields:
- parameters: score EVERY company scorecard / checklist criterion (any count). This drives the scorecard UI.
- overall_score / raw_score: follow the company scorecard weighting across those parameters
- customer_sentiment + customer_voice: Listen to the CUSTOMER (not the agent). Set customer_sentiment and customer_voice.stance to one of: satisfied, frustrated, mixed, neutral, unknown.
  * satisfaction_themes: short English phrases for what the customer liked / appreciated about the service (empty array if none).
  * frustration_themes: short English phrases for what the customer complained about or disliked (empty array if none).
  * note: one short English sentence on how the customer felt about the service.
  * quote: a short customer quote that supports the stance (or empty string).
  This is for company dashboards — be honest even when the agent scored well.
- greeting, empathy, professionalism, resolution, communication, language_handling: optional closest roll-ups for analytics only — do not replace the company parameter list
- AUTO-ZERO / AUTO-100: Follow the company scorecard and PARAMETER PLAYBOOK. If a line marked Auto Zero / Auto-Fail is truly violated, set that parameter to 0 and set \`auto_zero_applied\` true when the company intends a call-level zero. If a line marked Auto 100 / Auto-Pass is fully met, score that parameter 100. Always calculate the normal weighted sum first and put it in BOTH \`overall_score\` and \`raw_score\`. The system then forces \`overall_score\` to 0 when Auto Zero applies, and keeps \`raw_score\` as the Favoured Score. Use extreme wisdom: only apply Auto Zero for a genuine, explicitly defined severe violation on that line. If no auto-zero occurred, set \`auto_zero_applied\` to false.
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
  previousScoreBlock = "",
  scoringSeed?: number,
): Promise<CallAnalysis> {
  const transcript = packTranscriptForAudit(utterances, 16000);
  const catalogForPlaybook = scriptDocs.length ? scriptDocs : standards;
  const [understanding, parameterPlaybook] = await Promise.all([
    understandCallBrief(utterances, bilingual, agentName, scoringSeed),
    mode === "documents"
      ? understandCompanyParameters(catalogForPlaybook, standardsText, scoringSeed)
      : Promise.resolve([] as ParameterPlaybookEntry[]),
  ]);
  const understandingBlock = formatCallUnderstandingBlock(understanding);
  const playbookBlock = formatParameterPlaybookBlock(parameterPlaybook);

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

  const rescoreBlock = previousScoreBlock.trim()
    ? `\n\n${previousScoreBlock.trim()}\n`
    : "";

  const userPrompt = `${agentName ? `Explicitly Submitted Agent Name: ${agentName}\n\n` : ""}READ THE CUSTOMER'S / WORKSPACE'S UPLOADED FILES FIRST.
1) FILE INDEX — which files exist
2) COMPANY RULE CHECKLIST — every rule to score (one parameters[] row each)
3) COMPANY PARAMETER PLAYBOOK — plain-English meaning of each line, including Auto Zero / Auto 100 / If applicable
4) SCORECARD / COMPLIANCE / PROCESS DOCUMENTS — full text behind those rules
Score only from those files and the playbook. Do not invent a Zetro rubric, company name, or key term.
If the checklist / playbook lists N rules, return about N parameters with matching names, exact weight_pct from the company file, a short note (why THIS parameter earned its score), a gap_note (why THIS parameter alone lost points — never blame another parameter), and a transcript quote for each (including 100% scores).

Then UNDERSTAND the call (CALL UNDERSTANDING + timed transcript) before you assign marks — like a wise human QA who listened carefully.
Read the company Standards and PARAMETER PLAYBOOK carefully. Score each parameter independently against its playbook meaning. Stay consistent with any CONSISTENCY ANCHOR (±5).
${rescoreBlock}
${clipKeepStart(standardsText, 56000)}${scriptsBlock}${keyTermsBlock}\n\n${playbookBlock}\n\n${understandingBlock}\n\n${holdBlock}${applyHoldingNow}\n\nTimed transcript, meaning-repaired for clear understanding (opening + closing preserved). Audit against the company checklist, PARAMETER PLAYBOOK, scorecard, scripts, and key terms. Write the scorecard in English. Quotes may stay in the speaker's language with an English gloss. If a word is still broken, do not mention it:\n${transcript}`;

  const parsed = (await completeJson(
    bilingual
      ? DOCUMENTS_PROMPT
      : DOCUMENTS_PROMPT_EN,
    userPrompt,
    "call_analysis",
    ANALYSIS_SCHEMA,
    "reasoning",
    { stable: true, seed: scoringSeed },
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
    customer_voice?: unknown;
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
  const parametersRaw = normalizeScoreParameters(
    parsed.parameters,
    catalogFiles,
    document_references,
    utterances,
  );
  const { parameters, autoZeroFromPlaybook } = applyPlaybookSpecialScores(
    parametersRaw,
    parameterPlaybook,
  );
  if (parameters.length) {
    metric_evidence.parameters = parameters;
  }
  delete metric_evidence.key_terms;

  const customerVoice = normalizeCustomerVoice(
    parsed.customer_voice,
    parsed.customer_sentiment,
  );
  metric_evidence.customer_voice = customerVoice;

  let final_overall_score = clamp(parsed.overall_score);
  const fromParams = overallFromParameters(parameters);
  if (fromParams != null) final_overall_score = fromParams;

  const parsedRaw = Number(parsed.raw_score);
  const applyAutoZero = Boolean(parsed.auto_zero_applied || autoZeroFromPlaybook);
  if (applyAutoZero) {
    // Favoured Score = weighted/parameter sum BEFORE call-level Auto Zero.
    let favoured =
      fromParams != null
        ? fromParams
        : Number.isFinite(parsedRaw) && parsedRaw > 0
          ? clamp(parsedRaw)
          : final_overall_score;
    // Model sometimes already zeros overall_score; recover favoured from raw_score.
    if (favoured === 0 && Number.isFinite(parsedRaw) && parsedRaw > 0) {
      favoured = clamp(parsedRaw);
    }
    metric_evidence.auto_zero_applied = true;
    metric_evidence.raw_score = favoured;
    final_overall_score = 0;
  } else {
    metric_evidence.auto_zero_applied = false;
    delete metric_evidence.raw_score;
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
    verdict: verdictFromOverall(final_overall_score),
    customer_sentiment: customerVoice.stance,
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
