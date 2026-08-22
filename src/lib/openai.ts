import OpenAI from "openai";
import { getOpenAI, isModelAccessError, withRetries } from "@/lib/ai-client";
import { getServerEnv } from "@/lib/env";
import type { AssemblyUtterance, CallAnalysis, SpeakerRole, AuditMode } from "@/lib/types";
import type { QaDocument } from "@/lib/qa-kinds";

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
  ],
} as const;

function clamp(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

const FALLBACK_REASONING = ["gpt-5", "gpt-5-mini", "gpt-4o"];
const FALLBACK_FAST = ["gpt-5-mini", "gpt-5", "gpt-4o-mini"];

type ModelMode = "reasoning" | "fast";

function modelsFor(mode: ModelMode) {
  const { aiReasoningModel, aiFastModel } = getServerEnv();
  const primary = mode === "fast" ? aiFastModel : aiReasoningModel;
  const fallbacks = mode === "fast" ? FALLBACK_FAST : FALLBACK_REASONING;
  return [primary, ...fallbacks.filter((model) => model !== primary)];
}

async function completeJson(
  system: string,
  user: string,
  schemaName: string,
  schema: object,
  mode: ModelMode,
) {
  const { aiTemperature } = getServerEnv();
  const openai = getOpenAI();
  const models = modelsFor(mode);
  let lastError: unknown;

  for (const model of models) {
    try {
      const parsed = await withRetries(async () => {
        const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
          model,
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
        try {
          const completion = await openai.chat.completions.create({
            ...body,
            temperature: aiTemperature,
          });
          const raw = completion.choices[0]?.message?.content;
          if (!raw) throw new Error("OpenAI returned an empty response");
          return JSON.parse(raw);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.toLowerCase().includes("temperature")) throw error;
          const completion = await openai.chat.completions.create(body);
          const raw = completion.choices[0]?.message?.content;
          if (!raw) throw new Error("OpenAI returned an empty response");
          return JSON.parse(raw);
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
4. Keep original languages. Never translate.

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- If an agent name is provided, use it only as context — do not invent names.

Numeric fields (map the scorecard onto these names; use the closest match):
- greeting, empathy, professionalism, resolution, communication, language_handling, overall_score
- overall_score must follow the scorecard weighting when it is defined
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches with a short quote, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.`;

const AUTOMATIC_PROMPT = `You are a bilingual (Kiswahili + English) call-center quality analyst.

PATH: AUTOMATIC AUDIT.
Score from your own professional judgment of contact-center quality. Do not wait for company documents. Do not invent that you read a scorecard or compliance file.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT from 0–100 using standard service-quality practice.
3. Keep original languages. Never translate.

How to identify speakers:
- Agent cues: company greeting, offering solutions, verifying account details.
- Customer cues: stating a problem, complaining, giving personal details.
- If an agent name is provided, use it only as context — do not invent names.

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
speaker_assignments must cover every speaker label.`;

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

How to identify speakers:
- Agent cues: company greeting, scripted opening from the process documents, offering solutions.
- Customer cues: stating a problem, complaining, giving personal details.
- If an agent name is provided, use it only as context — do not invent names.

Numeric fields (map the scorecard onto these names; use the closest match):
- greeting, empathy, professionalism, resolution, communication, language_handling, overall_score
- overall_score must follow the scorecard weighting when it is defined
- A serious compliance breach should cap overall_score at 49 unless the scorecard says otherwise

Verdict: excellent 85–100, good 70–84, needs_improvement 50–69, poor 0–49.
compliance_findings: specific breaches with a short quote, or ["None identified"].
Cite the company file by name in summary, strengths, and improvements.
speaker_assignments must cover every speaker label.`;

const AUTOMATIC_PROMPT_EN = `You are an English-language call-center quality analyst.

PATH: AUTOMATIC AUDIT.
Score from your own professional judgment of contact-center quality. Do not wait for company documents. Do not invent that you read a scorecard or compliance file.

Your job:
1. Decide which speaker label is the CALL CENTER AGENT and which is the CUSTOMER.
2. Score the AGENT from 0–100 using standard service-quality practice.
3. Keep the transcript in English. Never translate.

How to identify speakers:
- Agent cues: company greeting, offering solutions, verifying account details.
- Customer cues: stating a problem, complaining, giving personal details.
- If an agent name is provided, use it only as context — do not invent names.

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
speaker_assignments must cover every speaker label.`;

export async function analyzeCall(
  utterances: AssemblyUtterance[],
  agentName: string | null | undefined,
  standardsText: string,
  standards: QaDocument[],
  mode: AuditMode,
  bilingual = true,
): Promise<CallAnalysis> {
  const transcript = utterances
    .map((u, i) => {
      const start = Math.floor(u.start / 1000);
      return `[${i}] Speaker ${u.speaker} (${start}s): ${u.text}`;
    })
    .join("\n");

  const userPrompt =
    mode === "documents"
      ? `${agentName ? `Named agent (may or may not be spoken): ${agentName}\n\n` : ""}WORKSPACE STANDARDS (you have read these files; score only from them):\n${standardsText}\n\nTranscript:\n${transcript}`
      : `${agentName ? `Named agent (may or may not be spoken): ${agentName}\n\n` : ""}Automatic audit — no company documents. Score from the transcript only.\n\nTranscript:\n${transcript}`;

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
    "reasoning",
  )) as CallAnalysis & {
    speaker_assignments?: { speaker_label: string; role: SpeakerRole }[];
    compliance_findings?: string[];
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
    standards_used:
      mode === "documents"
        ? standards.map((doc) => ({
            id: doc.id,
            kind: doc.kind,
            title: doc.title,
            file_name: doc.file_name,
          }))
        : [],
    audit_mode: mode,
  };
}
