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

export type AuditMode = "documents" | "automatic";

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
};

export type MetricEvidence = Partial<Record<ScoreDimension, MetricEvidenceItem>> & {
  holding?: MetricEvidenceItem;
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
