import type { StandardRef } from "@/lib/qa-kinds";

export type LanguageMode = "auto" | "en" | "sw" | "mixed";

export type CallStatus =
  | "queued"
  | "transcribing"
  | "transcribed"
  | "analyzing"
  | "completed"
  | "failed";

export type SpeakerRole = "agent" | "customer" | "unknown";

export type AuditMode = "documents";

export type Verdict = "excellent" | "good" | "needs_improvement" | "poor";

export type ScoreDimension =
  | "greeting"
  | "empathy"
  | "professionalism"
  | "resolution"
  | "communication"
  | "language_handling";

export type MetricEvidenceVerdict = "hit" | "miss" | "partial";

export type MetricEvidenceItem = {
  verdict: MetricEvidenceVerdict;
  quote: string;
  note: string;
  start_s: number | null;
  findings?: string[];
  source_file?: string;
  criterion?: string;
  key_terms?: string[];
};

export type DocumentReference = {
  file_name: string;
  criterion: string;
  result: MetricEvidenceVerdict;
};

export type ComplianceSeverity = "critical" | "major" | "minor";
export type ComplianceResult = "pass" | "fail" | "n/a";

/** One company-file rule checked on a call. */
export type ComplianceCheck = {
  rule: string;
  file_name: string;
  result: ComplianceResult;
  severity: ComplianceSeverity;
  note: string;
  quote: string;
  start_s?: number | null;
};

/** One scored line from the company's own scorecard / standards files. */
export type ScoreParameter = {
  name: string;
  score: number;
  weight_pct?: number | null;
  result?: MetricEvidenceVerdict;
  source_file?: string;
  /** Short reason this parameter scored as it did. */
  note?: string;
  /** Why the remaining points (100 − score) were held back. */
  gap_note?: string;
  /** Clean transcript snippet that backs the score (even for 100%). */
  quote?: string;
  utterance_index?: number | null;
  start_s?: number | null;
};

export type KeyTermFinding = {
  term: string;
  status: "said" | "missed";
  file_name?: string;
};

export type CustomerStance =
  | "satisfied"
  | "frustrated"
  | "mixed"
  | "neutral"
  | "unknown";

/** What the customer liked or complained about on the call. */
export type CustomerVoiceInsight = {
  stance: CustomerStance;
  satisfaction_themes: string[];
  frustration_themes: string[];
  note: string;
  quote: string;
};

/** How one uploaded Standards file was read for an audit. */
export type StandardsCoverageDoc = {
  id: string;
  file_name: string;
  kind: string;
  /** Characters of extracted text stored for the file. */
  chars: number;
  /** full = sent verbatim; digest = every section read into a rule digest (file larger than budget). */
  mode: "full" | "digest";
  sections: number;
};

/** Proof that the audit read every company file and scored every company line. */
export type StandardsCoverage = {
  budget_chars: number;
  total_chars: number;
  documents: StandardsCoverageDoc[];
  parameters_expected?: number;
  parameters_scored?: number;
  /** Lines the first pass skipped that a follow-up pass scored. */
  parameters_recovered?: number;
  parameters_unscored?: string[];
  compliance_expected?: number;
  compliance_checked?: number;
  compliance_recovered?: number;
};

export type MetricEvidence = Partial<Record<ScoreDimension, MetricEvidenceItem>> & {
  holding?: MetricEvidenceItem;
  document_references?: DocumentReference[];
  /** Checks against uploaded compliance files. */
  compliance_checks?: ComplianceCheck[];
  /** Company-specific scorecard lines (any count). Preferred for the UI scorecard. */
  parameters?: ScoreParameter[];
  key_terms?: KeyTermFinding[];
  raw_score?: number;
  /** True only when a company Auto-Zero / Auto-Fail rule was applied. */
  auto_zero_applied?: boolean;
  /** Customer likes / complaints extracted from the conversation. */
  customer_voice?: CustomerVoiceInsight;
  /** Hash of Standards content used for this audit (invalidates ±5 clamp when files change). */
  standards_fingerprint?: string;
  /** Which company files were read and whether every company line was scored. */
  standards_coverage?: StandardsCoverage;
  /** Present when a re-audit was compared to a previous score. */
  rescore_variance?: {
    previous_overall: number;
    max_delta: number;
    applied: boolean;
    source?: "same_call" | "team_same_recording";
  };
};

export type Agent = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Call = {
  id: string;
  user_id: string;
  agent_id: string | null;
  title: string | null;
  file_name: string | null;
  audio_path: string;
  duration_seconds: number | null;
  language_mode: LanguageMode;
  detected_language: string | null;
  detected_languages: unknown;
  status: CallStatus;
  error_message: string | null;
  assembly_id: string | null;
  created_at: string;
  completed_at: string | null;
  agents?: Agent | null;
};

export type Utterance = {
  id: string;
  call_id: string;
  sequence: number;
  speaker_label: string;
  role: SpeakerRole;
  text: string;
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | null;
};

export type CallScore = {
  id: string;
  call_id: string;
  overall_score: number;
  greeting: number | null;
  empathy: number | null;
  professionalism: number | null;
  resolution: number | null;
  communication: number | null;
  language_handling: number | null;
  verdict: Verdict;
  customer_sentiment: string | null;
  summary: string | null;
  strengths: string[];
  improvements: string[];
  compliance_findings: string[];
  hold_findings?: string[];
  standards_used: StandardRef[];
  metric_evidence?: MetricEvidence | null;
  audit_mode?: AuditMode | null;
  created_at: string;
};

export type AgentPerformance = {
  id: string;
  name: string;
  call_count: number;
  avg_score: number | null;
  excellent_count: number;
  poor_count: number;
};

export type GenericUtterance = {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
};

export type AssemblyUtterance = GenericUtterance;

export type CallAnalysis = {
  speaker_map: Record<string, SpeakerRole>;
  overall_score: number;
  greeting: number;
  empathy: number;
  professionalism: number;
  resolution: number;
  communication: number;
  language_handling: number;
  verdict: Verdict;
  customer_sentiment: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  compliance_findings: string[];
  hold_findings: string[];
  standards_used: StandardRef[];
  metric_evidence: MetricEvidence;
  audit_mode: AuditMode;
};
