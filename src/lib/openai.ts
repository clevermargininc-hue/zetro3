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
} from "@/lib/types";
import type { QaDocument } from "@/lib/qa-kinds";
import { SCRIPT_KINDS } from "@/lib/qa-kinds";
import { scriptsOf } from "@/lib/call-scripts";

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
  },
  required: ["verdict", "quote", "note", "utterance_index"],
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
  },
  required: [
    "speaker_assignments",
    "overall_score",
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
): MetricEvidence {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: MetricEvidence = {};

  for (const key of SCORE_DIMENSIONS) {
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
    const quote = String(item.quote || fromUtterance?.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
    const note = String(item.note || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
    if (!quote && !note) continue;
    out[key] = {
      verdict: normalizeEvidenceVerdict(item.verdict),
      quote,
      note,
      start_s,
    } satisfies MetricEvidenceItem;
  }

  return out;
}

const EVIDENCE_PROMPT_BLOCK = `
metric_evidence (required for every score dimension):
- For greeting, empathy, professionalism, resolution, communication, language_handling, pick ONE short moment from the transcript that best explains that score.
- verdict: "hit" if the agent did it well, "miss" if they failed or skipped it, "partial" if mixed.
- quote: exact short words from that moment (keep original language; do not invent).
- note: one short coaching sentence on why this raises or lowers the score.
- utterance_index: the [i] index from the transcript lines (required).
Do not dump the full transcript — only these short evidence snippets.`;


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

function supportsTemperature(model: string) {
  if (noTemperature.has(model)) return false;
  return !/^(gpt-5|o1|o3|o4)/i.test(model);
}

function tokenLimit(model: string) {
  if (/^(gpt-5|o1|o3|o4)/i.test(model)) return { max_completion_tokens: 1600 };
  return { max_tokens: 1600 };
}

function clipText(text: string, max: number) {
  if (text.length <= max) return text;
  const head = Math.floor(max * 0.55);
  const tail = max - head - 24;
  return `${text.slice(0, head)}\n\n[...truncated...]\n\n${text.slice(-tail)}`;
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
        const openai = getOpenAI();
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
        try {
          const completion = await openai.chat.completions.create(body);
          const raw = completion.choices[0]?.message?.content;
          if (!raw) throw new Error("OpenAI returned an empty response");
          return JSON.parse(raw);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.toLowerCase().includes("temperature")) {
            noTemperature.add(model);
            const { temperature: _t, ...withoutTemp } = body;
            const completion = await getOpenAI().chat.completions.create(withoutTemp);
            const raw = completion.choices[0]?.message?.content;
            if (!raw) throw new Error("OpenAI returned an empty response");
            return JSON.parse(raw);
          }
          if (/max_tokens|max_completion_tokens/i.test(message)) {
            const { max_tokens: _a, max_completion_tokens: _b, ...withoutLimit } = body;
            const completion = await getOpenAI().chat.completions.create(withoutLimit);
            const raw = completion.choices[0]?.message?.content;
            if (!raw) throw new Error("OpenAI returned an empty response");
            return JSON.parse(raw);
          }
          throw error;
        }
      });
      return parsed;
    } catch (error) {
      lastError = error;
      if (!isModelAccessError(error)) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI returned an empty response");
}

const DOCUMENTS_PROMPT = `You are a bilingual (Kiswahili + English) call-center quality analyst.

PATH: DOCUMENTS AUDIT.
You MUST read the retrieved SCORECARD, COMPLIANCE, and PROCESS DOCUMENT chunks before scoring.
Do not use a generic QA rubric. Do not invent criteria that are not in those files.
If a required behaviour is in the documents and the agent skipped it, mark it as a miss.
If a behaviour is not in the scorecard or process documents, do not penalize it unless it breaks compliance.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT using only the uploaded scorecard (0–100).
3. Check every compliance rule from the uploaded files and list breaches.
4. Keep original languages for quotes. Write your analysis (summary, strengths, improvements, notes) in the primary language spoken during the call (e.g. Swahili if they spoke Swahili).
5. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.

When an OPENING SCRIPT or CLOSING SCRIPT is provided, score greeting and closing against those org-wide scripts (shared by all agents). Note key terms the agent should have used.

Numeric fields (map the scorecard onto these names; use the closest match):
- greeting, empathy, professionalism, resolution, communication, language_handling, overall_score
- overall_score must follow the scorecard weighting when it is defined
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches with a short quote, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.
${EVIDENCE_PROMPT_BLOCK}`;

const AUTOMATIC_PROMPT = `You are a bilingual (Kiswahili + English) call-center quality analyst.

PATH: AUTOMATIC AUDIT.
Score from your own professional judgment of contact-center quality. Do not wait for company documents. Do not invent that you read a scorecard or compliance file.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT from 0–100 using standard service-quality practice.
3. Keep original languages for quotes. Write your analysis (summary, strengths, improvements, notes) in the primary language spoken during the call.
4. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. Only use the Customer's name if clearly spoken. Do not invent names.

How to identify speakers:
- Agent cues: company greeting, offering solutions, verifying account details.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker.

When an OPENING SCRIPT or CLOSING SCRIPT is provided, use it as the expected greeting/closing for this organization and score adherence (including key terms).

Scoring (each 0–100):
- greeting: prompt, polite opening and identity
- empathy: acknowledgement of the customer's issue and feelings
- professionalism: courtesy, calm tone, no talking-over
- resolution: actually helping / next steps / ownership
- communication: clear answers in the language the customer is using
- language_handling: follows the customer's language mix
- overall_score: weighted blend; resolution and empathy count most

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: obvious legal/ethical issues only, or ["None identified"].
Write summary, strengths, and improvements from the call itself.
speaker_assignments must cover every speaker label.
${EVIDENCE_PROMPT_BLOCK}`;

const DOCUMENTS_PROMPT_EN = `You are an English-language call-center quality analyst.

PATH: DOCUMENTS AUDIT.
You MUST read the retrieved SCORECARD, COMPLIANCE, and PROCESS DOCUMENT chunks before scoring.
Do not use a generic QA rubric. Do not invent criteria that are not in those files.
If a required behaviour is in the documents and the agent skipped it, mark it as a miss.
If a behaviour is not in the scorecard or process documents, do not penalize it unless it breaks compliance.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT using only the uploaded scorecard (0–100).
3. Check every compliance rule from the uploaded files and list breaches.
4. Keep the transcript in English. Never translate.
5. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. For the Company Name and key terms, rely strictly on the provided company documents. Only use the Customer's name if clearly spoken.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents or opening script, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker. Do not invent names.

When an OPENING SCRIPT or CLOSING SCRIPT is provided, score greeting and closing against those org-wide scripts (shared by all agents). Note key terms the agent should have used.

Numeric fields (map the scorecard onto these names; use the closest match):
- greeting, empathy, professionalism, resolution, communication, language_handling, overall_score
- overall_score must follow the scorecard weighting when it is defined
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches with a short quote, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.
${EVIDENCE_PROMPT_BLOCK}`;

const AUTOMATIC_PROMPT_EN = `You are an English-language call-center quality analyst.

PATH: AUTOMATIC AUDIT.
Score from your own professional judgment of contact-center quality. Do not wait for company documents. Do not invent that you read a scorecard or compliance file.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT from 0–100 using standard service-quality practice.
3. Keep the transcript in English. Never translate.
4. Do NOT guess the Agent's name or the Company's name. Use the explicitly provided Agent Name from the prompt. Only use the Customer's name if clearly spoken. Do not invent names.

How to identify speakers:
- Agent cues: company greeting, offering solutions, verifying account details.
- Customer cues: stating a problem, complaining, giving personal details.
- Always assume the submitted agent name belongs to the Agent speaker.

When an OPENING SCRIPT or CLOSING SCRIPT is provided, use it as the expected greeting/closing for this organization and score adherence (including key terms).

Scoring (each 0–100):
- greeting: prompt, polite opening and identity
- empathy: acknowledgement of the customer's issue and feelings
- professionalism: courtesy, calm tone, no talking-over
- resolution: actually helping / next steps / ownership
- communication: clear answers in English
- language_handling: clear, professional English
- overall_score: weighted blend; resolution and empathy count most

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: obvious legal/ethical issues only, or ["None identified"].
Write summary, strengths, and improvements from the call itself.
speaker_assignments must cover every speaker label.
${EVIDENCE_PROMPT_BLOCK}`;

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

  const scriptsBlock = scriptsText.trim()
    ? `\n\nORGANIZATION CALL SCRIPTS (shared by all agents):\n${clipText(scriptsText.trim(), 2500)}`
    : "";

  const userPrompt =
    mode === "documents"
      ? `${agentName ? `Explicitly Submitted Agent Name: ${agentName}\n\n` : ""}WORKSPACE STANDARDS (you have read these files; score only from them; use company names/key terms from here):\n${clipText(standardsText, 8000)}${scriptsBlock}\n\nTranscript:\n${transcript}`
      : `${agentName ? `Explicitly Submitted Agent Name: ${agentName}\n\n` : ""}Automatic audit — no company scorecard required.${scriptsBlock}\n\nTranscript:\n${transcript}`;

  const parsed = (await completeJson(
    mode === "documents"
      ? bilingual
        ? DOCUMENTS_PROMPT
        : DOCUMENTS_PROMPT_EN
      : bilingual
        ? AUTOMATIC_PROMPT
        : AUTOMATIC_PROMPT_EN,
    userPrompt,
    "call_analysis",
    ANALYSIS_SCHEMA,
    "fast",
  )) as CallAnalysis & {
    speaker_assignments?: { speaker_label: string; role: SpeakerRole }[];
    compliance_findings?: string[];
    metric_evidence?: unknown;
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
    summary: parsed.summary || "",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    compliance_findings: Array.isArray(parsed.compliance_findings)
      ? parsed.compliance_findings
      : [],
    metric_evidence: normalizeMetricEvidence(parsed.metric_evidence, utterances),
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
