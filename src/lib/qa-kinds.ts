export const QA_KINDS = ["document", "scorecard", "compliance"] as const;

export type QaKind = (typeof QA_KINDS)[number];

export type QaDocument = {
  id: string;
  user_id: string;
  kind: QaKind;
  title: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  extracted_text: string;
  created_at: string;
};

export type StandardRef = {
  id: string;
  kind: QaKind;
  title: string;
  file_name: string;
};

export const QA_KIND_LABELS: Record<QaKind, string> = {
  document: "process document",
  scorecard: "scorecard",
  compliance: "compliance file",
};

export type QaReadiness = {
  ready: boolean;
  missing: QaKind[];
  counts: Record<QaKind, number>;
  documents: Array<Omit<QaDocument, "extracted_text" | "user_id" | "file_path" | "mime_type"> & {
    has_text: boolean;
  }>;
  setupRequired: boolean;
};

export const MIN_READABLE_CHARS = 20;

export function readinessErrorMessage(missing: QaKind[], setupRequired = false) {
  if (setupRequired) {
    return "Run supabase/qa-standards.sql in the Supabase SQL Editor, then go to Standards and upload a process document, scorecard, and compliance file.";
  }
  if (!missing.length) return "";
  return `Documents scoring reads your company files first. Go to Standards and upload a ${missing
    .map((kind) => QA_KIND_LABELS[kind])
    .join(", ")} before using that path. Automatic auditing does not need these files.`;
}
