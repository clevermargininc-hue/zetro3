function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type ReasoningEffortSetting = "minimal" | "low" | "medium" | "high";

function reasoningEffort(value: string | undefined, fallback: ReasoningEffortSetting) {
  const v = (value || "").trim().toLowerCase();
  return v === "minimal" || v === "low" || v === "medium" || v === "high"
    ? (v as ReasoningEffortSetting)
    : fallback;
}

export function getPublicEnv() {
  return {
    supabaseUrl: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabaseAnonKey: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

export function getServerEnv() {
  const llmProvider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const embeddingProvider = (process.env.EMBEDDING_PROVIDER || "openai").toLowerCase();

  return {
    ...getPublicEnv(),
    supabaseServiceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    assemblyAiKey: required(
      "ASSEMBLYAI_API_KEY",
      process.env.ASSEMBLYAI_API_KEY,
    ),
    openaiKey: required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    openaiProject: process.env.OPENAI_PROJECT || undefined,
    llmProvider,
    embeddingProvider,
    aiReasoningModel:
      process.env.AI_REASONING_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
    aiFastModel: process.env.AI_FAST_MODEL || "gpt-4o-mini",
    aiEmbeddingModel: process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small",
    aiTemperature: Number.parseFloat(process.env.AI_TEMPERATURE || "0.1") || 0.1,
    aiMaxRetries: Math.max(1, Math.round(optionalNumber(process.env.AI_MAX_RETRIES, 3))),
    // Documents audits run playbook + full scorecard JSON; allow several minutes per LLM call.
    aiTimeoutMs: optionalNumber(process.env.AI_TIMEOUT, 240_000),
    /** Reasoning effort for the main call-scoring pass (gpt-5 / o-series only). */
    aiReasoningEffort: reasoningEffort(process.env.AI_REASONING_EFFORT, "low"),
    /** Reasoning effort when READING company Standards (playbooks + section digests). */
    aiStandardsReasoningEffort: reasoningEffort(
      process.env.AI_STANDARDS_REASONING_EFFORT,
      "medium",
    ),
    /**
     * Characters of company Standards sent verbatim per audit. Files beyond this are
     * read section-by-section into a full rule digest instead of being cut off.
     * ~240k chars ≈ 60k tokens — safe for 128k-context models with the transcript.
     */
    standardsCharBudget: Math.round(
      optionalNumber(process.env.STANDARDS_CHAR_BUDGET, 240_000),
    ),
  };
}
