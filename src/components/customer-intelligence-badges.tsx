import {
  EVIDENCE_TYPE_LABELS,
  ISSUE_CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  MATCH_CLASSIFICATION_LABELS,
  RESOLUTION_CONFIRMATION_LABELS,
  ROOT_CAUSE_LABELS,
  type IssueCategory,
  type IssueLifecycleStatus,
  type MatchClassification,
  type ResolutionConfirmation,
  type RootCauseCategory,
  type RootCauseEvidenceType,
} from "@/lib/ai/prompts/customer-journey";

export function IssueStatusBadge({ status }: { status: IssueLifecycleStatus | string }) {
  const label = ISSUE_STATUS_LABELS[status as IssueLifecycleStatus] || status;
  const styles: Record<string, string> = {
    new: "bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]",
    open: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    in_progress: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    pending_external: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    pending_external_action: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    escalated: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    resolved: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    reopened: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    closed: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
  };
  const cls = styles[status] || styles.open;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight ${cls}`}
    >
      {label}
    </span>
  );
}

export function ResolutionConfirmationBadge({
  confirmation,
}: {
  confirmation: ResolutionConfirmation | string;
}) {
  const label =
    RESOLUTION_CONFIRMATION_LABELS[confirmation as ResolutionConfirmation] ||
    confirmation;
  const styles: Record<string, string> = {
    unconfirmed: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    agent_reported: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    customer_confirmed: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    operationally_verified: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
  };
  const cls = styles[confirmation] || styles.unconfirmed;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export function MatchClassificationBadge({
  classification,
}: {
  classification: MatchClassification | string;
}) {
  const label =
    MATCH_CLASSIFICATION_LABELS[classification as MatchClassification] ||
    classification;
  const styles: Record<string, string> = {
    same_issue: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    related_issue: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    new_issue: "bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]",
    reopened_issue: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    needs_review: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
  };
  const cls = styles[classification] || styles.new_issue;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export function RootCauseBadge({
  category,
}: {
  category: RootCauseCategory | string;
}) {
  const label = ROOT_CAUSE_LABELS[category as RootCauseCategory] || category;
  const styles: Record<string, string> = {
    agent: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    agent_related: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    service_provider: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    service_provider_technician: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    network_technical: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    operational_process: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    product_service: "bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]",
    customer: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]",
    customer_related: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]",
    unknown: "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]",
    unknown_insufficient_evidence: "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]",
  };
  const cls = styles[category] || styles.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

export function EvidenceTypeBadge({
  evidenceType,
}: {
  evidenceType: RootCauseEvidenceType | string;
}) {
  const label =
    EVIDENCE_TYPE_LABELS[evidenceType as RootCauseEvidenceType] || evidenceType;
  const styles: Record<string, string> = {
    confirmed_evidence: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    confirmed_transcript_evidence: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    ai_inference: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    strong_operational_inference: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    possible_contributing_factor: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    insufficient_evidence: "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]",
  };
  const cls = styles[evidenceType] || styles.insufficient_evidence;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export function RiskLevelBadge({
  risk,
}: {
  risk: "low" | "medium" | "high" | "critical" | string;
}) {
  const styles: Record<string, string> = {
    low: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    medium: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    high: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    critical: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
  };
  const cls = styles[risk] || styles.low;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${cls}`}
    >
      {risk} risk
    </span>
  );
}

export function formatCategoryLabel(category?: IssueCategory | string | null) {
  if (!category) return "General";
  return (
    ISSUE_CATEGORY_LABELS[category as IssueCategory] ||
    category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}
