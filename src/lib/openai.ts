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
      required: [
        "greeting",
        "empathy",
        "professionalism",
        "resolution",
        "communication",
        "language_handling",
      ],
    },
    hold_detected: { type: "boolean" },
    hold_findings: {
      type: "array",
      items: { type: "string" },
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
You MUST output document_references. Inventing a score or a criterion that is not in the company files is forbidden.

document_references: one row per criterion you actually scored from the uploaded files.
- file_name: exact uploaded file name from FILE INDEX.
- criterion: the rule / line / weight you used from that file.
- result: hit, miss, or partial.

metric_evidence (required for every score dimension):
- source_file: the company file this mark came from (scorecard or script file name).
- criterion: the scorecard / script line this mark maps to.
- quote: a short clean Kiswahili or English phrase from the repaired conversation, or empty if the words are still broken.
- note: why the mark was given, citing the file. Do not mention broken ASR words.
- verdict: "hit" if the agent followed the document, "miss" if they skipped it, "partial" if mixed.
- utterance_index: the [i] index from the transcript lines.

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
    if (out.length >= 20) break;
  }
  return out;
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

const SWAHILI_MEANING_SYSTEM = `You repair East African contact-center speech-to-text for quality scoring.

The input is automatic speech recognition. Kiswahili is often fused, misspelled, or phonetic junk. Your output is the SAME conversation in real, readable Kiswahili and/or English so a QA scorecard can be written from it.

Rules:
- Fix broken words into the words the speaker likely said. Example: "habar zako namtaka kusadia" → "Habari yako, namtaka kukusaidia."
- Company names from the documents: if ASR produced a similar-sounding junk word, use the company spelling. Example: "karibu neskyryma" with TANESCO in the company files → "Karibu TANESCO, huduma kwa wateja" only if that greeting is in the script or clearly intended. Never invent a company that is not in the files.
- Keep the same dialogue: same speakers' turns, same questions, same answers, same numbers and names that the ASR supports.
- Do NOT write a new call. Do NOT add greetings, products, account numbers, amounts, or names that are not supported by the ASR, the company files, or the immediate neighbouring turns.
- Keep code-switching. Never translate Kiswahili into English or English into Kiswahili.
- Prefer company spellings and script phrases only when the speaker is clearly using that product or script.
- If a turn is already clean, return it unchanged.
- Do not drop or merge turns. Return the same index for every REPAIR turn.
- CONTEXT turns are already repaired. Do not rewrite them.`;

type IndexedTurn = { index: number; text: string };

function meaningRestoreBatches(turns: IndexedTurn[], maxChars: number) {
  const contextTurns = 3;
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

/** Repair broken ASR into readable Kiswahili/English for scoring. Never shown to the user. */
export async function restoreSwahiliMeaning<T extends { text: string }>(
  turns: T[],
  options: SwahiliRestoreOptions = {},
): Promise<T[]> {
  if (!turns.length) return turns;

  const keyed = turns.map((turn, index) => ({
    index,
    text: turn.text,
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
          `REPAIR these turns into readable speech for QA scoring. Same conversation. Do not invent.\n${JSON.stringify(batch.repair)}`,
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

const DOCUMENTS_PROMPT = `You are a bilingual (Kiswahili + English) call-center quality assurance analyst.

PATH: DOCUMENTS AUDIT FROM COMPANY FILES.
You MUST read FILE INDEX and COMPANY FILE CONTENTS before assigning any score.
Those files are this organization's uploaded SCORECARD, COMPLIANCE, PROCESS DOCUMENTS, and scripts.
They are the only REFERENCE for criteria, required phrases, product names, and key terms.
Do not invent a score, a criterion, a company name, or a key term.
If a required behaviour is in the documents and the agent skipped it, mark it as a miss.
If a behaviour is not in the scorecard or process documents, do not penalize it unless it breaks compliance.
Cite the exact file name and criterion in document_references and in metric_evidence.source_file / criterion.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT using only the uploaded scorecard (0–100).
3. Check every compliance rule from the uploaded files and list breaches.
4. CLEAN LANGUAGE ON THE SCORECARD:
   - Evidence comes from the company SCORECARD and the CLEAN SCRIPT, checked against the meaning-repaired conversation.
   - If a Kiswahili or English phrase is clean and readable, put that short phrase in metric_evidence.quote so it appears on the scorecard.
   - NEVER put broken, fused, misspelled, or garbled speech-to-text words on the scorecard (quote, note, summary, strengths, improvements, compliance). If a word is not clean, omit it and write the point in correct Kiswahili or English.
   - Never translate Kiswahili into English. Write analysis in the primary language spoken on the call (Kiswahili or English).
5. PRIVACY:
   - The full transcript stays internal. The scorecard may show only short clean evidence quotes, not whole turns.
6. AGENT & COMPANY NAMES:
   - Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.
7. SPEAKER ROLES IN TEXT:
   - When writing your notes, summaries, and findings, always refer to the speakers as 'Agent' (or their name) and 'Customer' (or 'Mteja'). Do NOT use raw transcript labels like 'Speaker A' or 'Speaker 1' in your written analysis, though you must still output the exact speaker_label string in the speaker_assignments array.
8. DEEP TONE, SARCASM & ATTITUDE DETECTION (UTAMBUZI WA DHIHAKA, KEJELI NA DHARAU YA CHINICHINI):
   - You MUST analyze the subtle emotional, conversational, and behavioral tone of both the agent and customer beyond just volume or shouting.
   - LOW-TONE SARCASM & MOCKERY (Kejeli na dhihaka ya chinichini): An agent does NOT need to yell or raise their voice to be rude. If the agent speaks in a quiet, soft, flat, or normal voice but uses words, phrases, or rhetorical questions that are sarcastic, cynical, mocking, patronizing, or dismissive (mfano: "Sasa unataka nikufanyie nini?", "Hata mtoto anajua hilo", "Si nilishakwambia?", "Huwezi kusoma?", "Haya bwana wewe ndio unajua", "Ulitaka niseme nini sasa?", "Ndio hivyo huwezi kubadilisha", "Hapo sina msaada wowote", au kejeli kama "Haya asante sana kwa kutufundisha kazi"), you MUST detect and penalize this severely.
   - DISMISSIVENESS & PASSIVE-AGGRESSION (Kupuuza na dharau): Giving curt, indifferent, dismissive, or reluctant one-word answers, brushing off the customer's problem without attempting genuine resolution, sighing with irritation, or acting bored/uninterested.
   - CONDESCENSION & SUPERIORITY (Kujiona na kumdharau mteja): Belittling the customer, speaking down to them, or making them feel foolish for asking questions or not understanding technical details.
   - SCORING IMPACT OF NEGATIVE TONES:
     * Professionalism: Severe penalty (drop to 20-50/100). Sarcasm, mockery, or subtle insults completely violate professional contact center standards.
     * Empathy: Severe penalty (drop to 10-40/100). Cold, dismissive, or mocking responses to customer distress represent zero active empathy.
     * Resolution: Penalize if dismissive tone led to incomplete, careless, or unhelpful support.
     * Overall Score: A call with evident mockery, sarcasm, or contempt must NEVER receive a passing/high score.
   - COACHING & FEEDBACK: If low-tone mockery or sarcasm is detected, clearly identify it in 'improvements' and 'metric_evidence.professionalism.note' / 'metric_evidence.empathy.note' (mfano: "Ingawa mhudumu hakuinua sauti, alitumia maneno yenye dhihaka, kejeli au kupuuza maelezo ya mteja aliposema...").

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.

${SCRIPT_PROMPT_BLOCK}

Numeric fields (map the scorecard onto these names; use the closest match):
- greeting, empathy, professionalism, resolution, communication, language_handling, overall_score, raw_score
- overall_score must follow the scorecard weighting when it is defined
- AUTO-ZERO (AUTO-FAIL): If the scorecard explicitly defines an "Auto-Zero" or "Auto-Fail" for a specific severe violation, and the agent commits it, you MUST set overall_score to 0. Use extreme wisdom: only apply this if it is a genuine, explicitly defined severe violation, to prevent unfair zeroes. If you apply an Auto-Zero, you MUST STILL return the raw calculated score (the sum of all other scores) in the \`raw_score\` field. If there is no Auto-Zero, \`raw_score\` and \`overall_score\` should be the same.
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches explained in clean professional language, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.
${DOCUMENTS_EVIDENCE_BLOCK}`;

const DOCUMENTS_PROMPT_EN = `You are an English-language call-center quality analyst.

PATH: DOCUMENTS AUDIT FROM COMPANY FILES.
You MUST read FILE INDEX and COMPANY FILE CONTENTS before assigning any score.
Those files are this organization's uploaded SCORECARD, COMPLIANCE, PROCESS DOCUMENTS, and scripts.
They are the only REFERENCE for criteria, required phrases, product names, and key terms.
Do not invent a score, a criterion, a company name, or a key term.
If a required behaviour is in the documents and the agent skipped it, mark it as a miss.
If a behaviour is not in the scorecard or process documents, do not penalize it unless it breaks compliance.
Cite the exact file name and criterion in document_references and in metric_evidence.source_file / criterion.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT using only the uploaded scorecard (0–100).
3. Check every compliance rule from the uploaded files and list breaches.
4. Keep English as spoken. Never translate. If a phrase is clean, put it on the scorecard as evidence. Never copy broken speech-to-text spellings into any scorecard field.
5. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.
7. DEEP TONE, SARCASM & ATTITUDE DETECTION:
   - Analyze the subtle emotional and behavioral tone of both the agent and customer. Agents do NOT need to shout or raise their voice to be rude or unprofessional.
   - LOW-TONE SARCASM, MOCKERY & CONDESCENSION: If the agent speaks in a quiet, calm, or normal volume but uses sarcastic remarks, mockery, condescension, passive-aggressive phrasing, patronizing comments, or contempt (e.g., "What did you expect me to do?", "As I already told you multiple times", "Well, that's not my problem", "If you had bothered to read...", or sarcastic "Thanks for telling me how to do my job"), detect this and penalize severely.
   - DISMISSIVENESS & INDIFFERENCE: Giving curt, dismissive, reluctant, or unhelpful answers, brushing off customer issues, or acting bored and uncaring.
   - SCORING IMPACT:
     * Professionalism: Heavily penalize (drop to 20-50/100).
     * Empathy: Heavily penalize (drop to 10-40/100).
     * Resolution: Penalize if dismissiveness prevented genuine customer assistance.
     * Overall Score: A call with evident mockery, sarcasm, or contempt must not receive a high score.
   - FEEDBACK: Explicitly highlight the subtle tone issue in 'improvements' and 'metric_evidence' notes so managers can coach on attitude and tone.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.

${SCRIPT_PROMPT_BLOCK}

Numeric fields (map the scorecard onto these names; use the closest match):
- greeting, empathy, professionalism, resolution, communication, language_handling, overall_score, raw_score
- overall_score must follow the scorecard weighting when it is defined
- AUTO-ZERO (AUTO-FAIL): If the scorecard explicitly defines an "Auto-Zero" or "Auto-Fail" for a specific severe violation, and the agent commits it, you MUST set overall_score to 0. Use extreme wisdom: only apply this if it is a genuine, explicitly defined severe violation, to prevent unfair zeroes. If you apply an Auto-Zero, you MUST STILL return the raw calculated score (the sum of all other scores) in the \`raw_score\` field. If there is no Auto-Zero, \`raw_score\` and \`overall_score\` should be the same.
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
  const transcript = clipText(
    utterances
      .map((u, i) => {
        const start = Math.floor(u.start / 1000);
        return `[${i}] Speaker ${u.speaker} (${start}s): ${u.text}`;
      })
      .join("\n"),
    12000,
  );

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

  const userPrompt = `${agentName ? `Explicitly Submitted Agent Name: ${agentName}\n\n` : ""}READ THE COMPANY FILES FIRST. Score only from them. Do not invent a rubric, a company name, or a key term.\n\n${clipKeepStart(standardsText, 52000)}${scriptsBlock}${keyTermsBlock}\n\n${holdBlock}${applyHoldingNow}\n\nTimed transcript, meaning-repaired for QA (check it against the company scorecard, scripts, and key terms above. Put CLEAN Kiswahili/English on the scorecard. If a word is still broken, do not mention it):\n${transcript}`;

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
    speaker_assignments?: { speaker_label: string; role: SpeakerRole }[];
    compliance_findings?: string[];
    metric_evidence?: unknown;
    hold_detected?: unknown;
    hold_findings?: unknown;
    document_references?: unknown;
  };
  const speakerMap: Record<string, SpeakerRole> = {
    ...(parsed.speaker_map || {}),
  };
  for (const row of parsed.speaker_assignments || []) {
    speakerMap[row.speaker_label] = row.role === "agent" ? "agent" : "customer";
  }

  if (!Object.values(speakerMap).includes("agent") && utterances.length) {
    speakerMap[utterances[0].speaker] = "agent";
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
  delete metric_evidence.key_terms;
  if (parsed.raw_score != null) {
    metric_evidence.raw_score = clamp(parsed.raw_score);
  }

  return {
    speaker_map: speakerMap,
    overall_score: clamp(parsed.overall_score),
    greeting: clamp(parsed.greeting),
    empathy: clamp(parsed.empathy),
    professionalism: clamp(parsed.professionalism),
    resolution: clamp(parsed.resolution),
    communication: clamp(parsed.communication),
    language_handling: clamp(parsed.language_handling),
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
