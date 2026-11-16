"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CompanyCatalogue } from "@/lib/company-catalogue";
import { PageHeader, Panel, StatTile, ScorePill, VerdictBadge } from "@/components/ui";
import {
  EvidenceTypeBadge,
  formatCategoryLabel,
  IssueStatusBadge,
  MatchClassificationBadge,
  ResolutionConfirmationBadge,
  RootCauseBadge,
} from "@/components/customer-intelligence-badges";
import {
  ISSUE_CATEGORIES,
  ISSUE_CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  RESOLUTION_CONFIRMATIONS,
  ROOT_CAUSE_CATEGORIES,
  ROOT_CAUSE_LABELS,
  type IssueCategory,
  type IssueLifecycleStatus,
  type ResolutionConfirmation,
  type RootCauseCategory,
  type RootCauseEvidenceType,
  type TranscriptEvidenceExcerpt,
} from "@/lib/ai/prompts/customer-journey";
import type {
  CustomerDirectoryItem,
  IssueSummaryItem,
  TimelineCallEntry,
} from "@/lib/customer-journey-service";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function IssueInvestigationView({
  initialDetail,
}: {
  initialDetail: {
    issue: IssueSummaryItem;
    customer: CustomerDirectoryItem | null;
    calls: TimelineCallEntry[];
    rootCauses: Array<{
      id: string;
      category: RootCauseCategory;
      subcategory: string;
      secondary_category: string | null;
      evidence_type: RootCauseEvidenceType;
      confidence: number;
      explanation: string;
      recommended_action: string;
      responsible_category: string;
      transcript_excerpts: TranscriptEvidenceExcerpt[];
      is_current: boolean;
      human_status: string | null;
      created_at: string;
    }>;
    statusHistory: Array<{
      id: string;
      previous_status: string | null;
      new_status: string;
      resolution_confirmation: string;
      changed_by_type: string;
      reason: string;
      created_at: string;
    }>;
    reviews: Array<{
      id: string;
      review_type: string;
      reviewer_name: string | null;
      notes: string;
      responsible_team: string | null;
      previous_value: Record<string, unknown>;
      new_value: Record<string, unknown>;
      created_at: string;
    }>;
    migrationRequired: boolean;
  };
}) {
  const [detail, setDetail] = useState(initialDetail);
  const { issue, customer, calls, statusHistory, reviews } = detail;

  // Human review form state
  const [statusInput, setStatusInput] = useState<IssueLifecycleStatus>(issue.status);
  const [resConfInput, setResConfInput] = useState<ResolutionConfirmation>(
    issue.resolution_confirmation,
  );
  const [categoryInput, setCategoryInput] = useState<IssueCategory>(
    (issue.category as IssueCategory) || "general_inquiry",
  );
  const [rootCauseInput, setRootCauseInput] = useState<RootCauseCategory>(
    issue.primary_root_cause,
  );
  const [teamInput, setTeamInput] = useState(issue.responsible_team || "");
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [catalogueContext, setCatalogueContext] = useState<{
    catalogue: CompanyCatalogue;
    issue: { catalogue_issue_category_id?: string | null };
    relationships: Array<{ product_id?: string | null; service_id?: string | null; service_area_id?: string | null }>;
    events: Array<{ id: string; method: string; classification_version: string; notes: string | null; created_at: string }>;
  } | null>(null);
  const [catalogueNote, setCatalogueNote] = useState("");
  const [catalogueSaving, setCatalogueSaving] = useState(false);
  const [catalogueFeedback, setCatalogueFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/company-intelligence/classifications/${issue.id}`)
      .then(async response => response.ok ? response.json() : null)
      .then(value => setCatalogueContext(value))
      .catch(() => setCatalogueContext(null));
  }, [issue.id]);

  function selectedIds(field: "product_id" | "service_id" | "service_area_id") {
    return new Set((catalogueContext?.relationships || []).map(item => item[field]).filter((value): value is string => typeof value === "string"));
  }

  async function saveCatalogueCorrection(form: HTMLFormElement) {
    setCatalogueSaving(true); setCatalogueFeedback(null);
    const values = new FormData(form);
    const pick = (name: string) => values.getAll(name).map(id => ({ id: String(id) }));
    try {
      const response = await fetch(`/api/company-intelligence/classifications/${issue.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: pick("products"), services: pick("services"), service_areas: pick("service_areas"), issue_category_id: values.get("issue_category_id") || null, notes: catalogueNote }) });
      const value = await response.json() as typeof catalogueContext & { error?: string };
      if (!response.ok) throw new Error(value.error || "Could not save catalogue classification.");
      setCatalogueContext(value); setCatalogueNote(""); setCatalogueFeedback("Company classification verified and recorded.");
    } catch (error) { setCatalogueFeedback(error instanceof Error ? error.message : "Could not save catalogue classification."); }
    finally { setCatalogueSaving(false); }
  }

  async function submitReviewAction(payload: {
    reviewType:
      | "confirm_match"
      | "reject_match"
      | "update_category"
      | "confirm_root_cause"
      | "reject_root_cause"
      | "update_status"
      | "confirm_resolution"
      | "assign_team"
      | "investigation_note";
    callId?: string;
    newStatus?: IssueLifecycleStatus;
    resolutionConfirmation?: ResolutionConfirmation;
    newCategory?: IssueCategory;
    newRootCause?: RootCauseCategory;
    responsibleTeam?: string;
    notes?: string;
  }) {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/customer-intelligence/issues/${issue.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: typeof detail;
      };
      if (!res.ok || !json.ok) {
        setFeedback({
          type: "err",
          text:
            json.error ||
            "Could not save review. Make sure supabase/customer-journey.sql has been applied.",
        });
      } else {
        if (json.detail && json.detail.issue) {
          setDetail(json.detail);
          setStatusInput(json.detail.issue.status);
          setResConfInput(json.detail.issue.resolution_confirmation);
          setCategoryInput(json.detail.issue.category as IssueCategory);
          setRootCauseInput(json.detail.issue.primary_root_cause);
          setTeamInput(json.detail.issue.responsible_team || "");
        }
        setNotesInput("");
        setFeedback({
          type: "ok",
          text: detail.migrationRequired ? "Review applied in temporary preview memory." : "Human review recorded in audit history and applied to issue.",
        });
      }
    } catch {
      setFeedback({ type: "err", text: "Network error while saving review." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {detail.migrationRequired ? <div role="status" className="alert-info text-sm">Preview mode: review changes are temporary until the customer-journey database migration is applied.</div> : null}
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <Link href="/customers" className="hover:text-blue hover:underline font-medium">
          ← Customer Intelligence
        </Link>
        {customer ? (
          <>
            <span>/</span>
            <Link
              href={`/customers/${customer.id}`}
              className="hover:text-blue hover:underline font-medium"
            >
              {customer.display_label}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-ink font-semibold font-mono">{issue.issue_code}</span>
      </div>

      <PageHeader
        eyebrow={`Issue Investigation · ${issue.issue_code}`}
        title={issue.title}
        subtitle={`Customer: ${issue.customer_label} · Category: ${formatCategoryLabel(
          issue.category,
        )} · First reported: ${formatDateTime(
          issue.first_reported_at,
        )} · Latest contact: ${formatDateTime(issue.latest_reported_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <IssueStatusBadge status={issue.status} />
            <ResolutionConfirmationBadge
              confirmation={issue.resolution_confirmation}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                submitReviewAction({
                  reviewType: "confirm_resolution",
                  newStatus: "resolved",
                  resolutionConfirmation: "operationally_verified",
                  notes: "Verified resolved by QA / Operations reviewer",
                })
              }
              className="rounded-md bg-green px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              ✓ Confirm Verified Resolution
            </button>
          </div>
        }
      />

      {feedback ? (
        <div
          className={
            feedback.type === "ok"
              ? "alert-ok text-[12px] font-medium"
              : "alert-bad text-[12px] font-medium"
          }
        >
          {feedback.text}
        </div>
      ) : null}

      {catalogueContext ? (
        <Panel className="p-5 border-l-4 border-l-teal">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-navy">Company product & service classification</h2>
              <p className="mt-0.5 text-[12px] text-muted">Use your company catalogue—not a generic industry list. A correction preserves the original AI output in the classification history.</p>
            </div>
            {catalogueContext.catalogue.migrationRequired ? <Link className="btn-ghost px-3 py-1.5 text-[12px]" href="/settings/company-intelligence">Set up catalogue</Link> : null}
          </div>
          {catalogueContext.catalogue.migrationRequired || catalogueContext.catalogue.upgradeRequired ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">Apply the catalogue database setup before verification is available. Existing issue history is unchanged.</p>
          ) : (
            <form key={catalogueContext.events[0]?.id || "initial"} className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void saveCatalogueCorrection(event.currentTarget); }}>
              <div className="grid gap-3 md:grid-cols-4">
                {([ ["Products", "products", catalogueContext.catalogue.products, "product_id"], ["Services", "services", catalogueContext.catalogue.services, "service_id"], ["Service areas", "service_areas", catalogueContext.catalogue.serviceAreas, "service_area_id"] ] as const).map(([label, field, rows, relationship]) => (
                  <label key={field} className="block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}
                    <select name={field} multiple defaultValue={[...selectedIds(relationship)]} className="field mt-1 min-h-24 text-[12px]">
                      {rows.filter(row => row.isActive).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                  </label>
                ))}
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">Issue category
                  <select name="issue_category_id" defaultValue={catalogueContext.issue.catalogue_issue_category_id || ""} className="field mt-1 text-[12px]"><option value="">Unclassified</option>{catalogueContext.catalogue.issueCategories.filter(row => row.isActive || row.id === catalogueContext.issue.catalogue_issue_category_id).map(row => <option key={row.id} value={row.id}>{row.name}{row.isActive ? "" : " (inactive; choose an active category to update)"}</option>)}</select>
                </label>
              </div>
              <div className="flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Verification note<textarea required value={catalogueNote} onChange={event => setCatalogueNote(event.target.value)} className="field mt-1 min-h-16 text-[12px]" placeholder="Why this classification is correct…" /></label><button disabled={catalogueSaving || !catalogueNote.trim()} className="btn-blue px-3.5 py-2 text-[12px]">{catalogueSaving ? "Saving…" : "Verify classification"}</button></div>
              {catalogueFeedback ? <p className="text-[12px] text-ink-soft">{catalogueFeedback}</p> : null}
            </form>
          )}
          {catalogueContext.events.length ? <div className="mt-4 border-t border-line pt-3 text-[12px] text-muted">Classification history: {catalogueContext.events.map(event => `${event.method.replace(/_/g, " ")} · ${formatDateTime(event.created_at)}`).join(" · ")}</div> : null}
        </Panel>
      ) : null}

      {/* Top KPI Summary */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile
          label="Linked Calls"
          value={issue.total_calls}
          hint={`${issue.repeat_interaction_count} repeat follow-up contact(s)`}
          tone={issue.total_calls > 1 ? "warn" : "default"}
        />
        <StatTile
          label="Lifecycle Status"
          value={(ISSUE_STATUS_LABELS[issue.status] || issue.status).toUpperCase()}
          hint={
            issue.reopened_count > 0
              ? `Reopened ${issue.reopened_count} time(s)`
              : "Independent of call completion"
          }
          tone={
            issue.status === "resolved"
              ? "good"
              : issue.status === "escalated" || issue.status === "reopened"
                ? "bad"
                : "warn"
          }
        />
        <StatTile
          label="Root-Cause Confidence"
          value={`${Math.round((issue.root_cause_confidence || 0.5) * 100)}%`}
          hint={ROOT_CAUSE_LABELS[issue.primary_root_cause] || issue.primary_root_cause}
        />
        <StatTile
          label="Responsible Team"
          value={issue.responsible_team || "Pending"}
          hint={issue.human_verified ? "Verified by human reviewer" : "AI assigned"}
        />
      </div>

      {/* PHASE 6: ROOT CAUSE & RESPONSIBILITY INTELLIGENCE CARD */}
      <Panel className="p-5 border-l-4 border-l-blue">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Root Cause & Responsibility Analysis:
              </span>
              <RootCauseBadge category={issue.primary_root_cause} />
              {issue.primary_root_cause_detail ? (
                <span className="rounded bg-surface-2 border border-line px-2 py-0.5 text-[11px] font-mono font-medium text-ink">
                  {issue.primary_root_cause_detail.replace(/_/g, " ")}
                </span>
              ) : null}
              {issue.secondary_root_cause ? (
                <>
                  <span className="text-[11px] font-medium text-muted">+ Secondary:</span>
                  <RootCauseBadge category={issue.secondary_root_cause} />
                </>
              ) : null}
              <EvidenceTypeBadge evidenceType={issue.root_cause_evidence_type} />
            </div>

            <p className="text-[13.5px] font-medium text-ink leading-relaxed">
              {issue.root_cause_explanation || issue.summary}
            </p>

            {issue.recommended_action ? (
              <div className="rounded-md bg-teal-soft border border-[#99F6E4] px-3.5 py-2.5 text-[12.5px] text-[#0F766E]">
                <strong>Recommended Operational Action:</strong>{" "}
                {issue.recommended_action}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                submitReviewAction({
                  reviewType: "confirm_root_cause",
                  newRootCause: issue.primary_root_cause,
                  notes: "Confirmed AI root-cause classification based on call evidence.",
                })
              }
              className="btn-blue px-3 py-1.5 text-[12px]"
            >
              ✓ Confirm Root Cause
            </button>
          </div>
        </div>

        {/* Structured Issue Attributes */}
        <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
          <div>
            <span className="text-muted font-medium block text-[11px]">Product / Service</span>
            <span className="font-semibold text-ink">
              {issue.product_service || "General"}
            </span>
          </div>
          <div>
            <span className="text-muted font-medium block text-[11px]">Location</span>
            <span className="font-semibold text-ink">
              {issue.location || "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-muted font-medium block text-[11px]">
              Service Provider / Field Team
            </span>
            <span className="font-semibold text-ink">
              {issue.service_provider || "Internal"}
            </span>
          </div>
          <div>
            <span className="text-muted font-medium block text-[11px]">Reported Symptoms</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {issue.symptoms.map((sym) => (
                <span
                  key={sym}
                  className="rounded bg-surface-2 border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-soft"
                >
                  {sym}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* ALL LINKED CALLS IN SEQUENCE + TRANSCRIPT EVIDENCE */}
      <Panel className="overflow-hidden">
        <div className="p-5 border-b border-line">
          <h3 className="text-[15px] font-semibold text-navy">
            Linked Call Interactions & Transcript Evidence ({calls.length})
          </h3>
          <p className="text-[12px] text-muted mt-0.5">
            Complete sequence of calls associated with this issue, including match confidence, call vs. issue resolution state, and verbatim transcript excerpts.
          </p>
        </div>

        <div className="divide-y divide-line">
          {calls.map((c) => (
            <div key={c.id} className="p-5 space-y-3 hover:bg-surface-2/60 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-md bg-blue-soft border border-[#BFDBFE] px-2.5 py-1 font-mono text-[12px] font-semibold text-blue">
                    Contact #{c.interaction_number}
                  </span>
                  <span className="font-semibold text-[14px] text-ink">
                    {c.call_title}
                  </span>
                  <span className="text-[12px] text-muted font-mono">
                    {formatDateTime(c.call_date)}
                  </span>
                  <MatchClassificationBadge
                    classification={c.match_classification}
                  />
                  <span className="text-[11px] font-mono text-muted">
                    ({Math.round(c.match_confidence * 100)}% confidence)
                  </span>
                  {c.human_review_status ? (
                    <span className="rounded bg-green-soft border border-[#BBF7D0] px-2 py-0.5 text-[11px] font-semibold text-green capitalize">
                      Match {c.human_review_status}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/upload/prepare/${c.call_id}`}
                    className="btn-ghost px-2.5 py-1 text-[12px]"
                  >
                    Open Transcript
                  </Link>
                  <Link
                    href={`/upload/score/${c.call_id}`}
                    className="btn-ghost px-2.5 py-1 text-[12px]"
                  >
                    Open QA Scorecard
                  </Link>
                  {c.interaction_number > 1 ? (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          submitReviewAction({
                            reviewType: "confirm_match",
                            callId: c.call_id,
                            notes: `Confirmed call ${c.call_title} belongs to issue ${issue.issue_code}`,
                          })
                        }
                        className="btn-blue px-2.5 py-1 text-[11px]"
                      >
                        Confirm Match
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          submitReviewAction({
                            reviewType: "reject_match",
                            callId: c.call_id,
                            notes: `Rejected match for call ${c.call_title} and split into separate issue`,
                          })
                        }
                        className="rounded-md border border-[#FECACA] bg-red-soft px-2.5 py-1 text-[11px] font-semibold text-red hover:opacity-90"
                      >
                        Reject Match & Split
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-2">
                  <p className="text-[13px] text-ink leading-relaxed">
                    <strong className="text-navy">Extracted Issue Summary:</strong>{" "}
                    {c.extracted_issue_summary}
                  </p>
                  <p className="text-[12px] text-muted">
                    <strong className="text-ink-soft">Match Decision Reasoning:</strong> {c.match_reason}
                  </p>

                  {c.transcript_evidence.length > 0 ? (
                    <div className="mt-2 space-y-1.5 rounded-md border border-line bg-surface-2 p-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                        Supporting Transcript Evidence Excerpts:
                      </span>
                      {c.transcript_evidence.map((ex, i) => (
                        <blockquote
                          key={i}
                          className="border-l-2 border-blue pl-2.5 text-[12px] text-ink italic"
                        >
                          &ldquo;{ex.quote}&rdquo;{" "}
                          <span className="not-italic font-semibold text-[11px] text-muted">
                            — {ex.speaker}
                          </span>
                        </blockquote>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="lg:col-span-4 rounded-md border border-line bg-surface-2 p-3.5 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">Handling Agent:</span>
                    <span className="font-semibold text-ink">{c.agent_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">QA Evaluation:</span>
                    <div className="flex items-center gap-1.5">
                      <ScorePill score={c.qa_score} />
                      <VerdictBadge
                        verdict={c.qa_verdict as "pass" | "review" | "fail" | null}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">Call Status:</span>
                    <span className="font-mono font-semibold text-ink capitalize">
                      {c.call_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">Call Resolution State:</span>
                    <span className="font-mono text-[11px] font-semibold text-ink">
                      {c.call_resolution_state.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* PHASE 11: HUMAN REVIEW & CORRECTION WORKBENCH + STATUS HISTORY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-7 p-5 space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold text-navy">
              Human Review, Root-Cause Override & Lifecycle Correction
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              All human corrections are stored separately from original AI outputs in the audit log below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Issue Lifecycle Status
              </label>
              <select
                value={statusInput}
                onChange={(e) =>
                  setStatusInput(e.target.value as IssueLifecycleStatus)
                }
                className="field text-[13px]"
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ISSUE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Resolution Verification State
              </label>
              <select
                value={resConfInput}
                onChange={(e) =>
                  setResConfInput(e.target.value as ResolutionConfirmation)
                }
                className="field text-[13px]"
              >
                {RESOLUTION_CONFIRMATIONS.map((rc) => (
                  <option key={rc} value={rc}>
                    {rc.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Root Cause Category Override
              </label>
              <select
                value={rootCauseInput}
                onChange={(e) =>
                  setRootCauseInput(e.target.value as RootCauseCategory)
                }
                className="field text-[13px]"
              >
                {ROOT_CAUSE_CATEGORIES.map((rc) => (
                  <option key={rc} value={rc}>
                    {ROOT_CAUSE_LABELS[rc]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Issue Category
              </label>
              <select
                value={categoryInput}
                onChange={(e) =>
                  setCategoryInput(e.target.value as IssueCategory)
                }
                className="field text-[13px]"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {ISSUE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Responsible Team / Escalation Owner
              </label>
              <input
                type="text"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                placeholder="e.g. Field Technician Dispatch, NOC, Billing Assurance, Contact Center QA"
                className="field text-[13px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Investigation Notes / Evidence Rationale
              </label>
              <textarea
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Document findings, ticket references, or why AI classification was confirmed/updated…"
                className="field text-[13px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                submitReviewAction({
                  reviewType: "update_status",
                  newStatus: statusInput,
                  resolutionConfirmation: resConfInput,
                  responsibleTeam: teamInput,
                  notes:
                    notesInput ||
                    `Updated status to ${statusInput} (${resConfInput})`,
                })
              }
              className="btn-blue px-3.5 py-2 text-[12px]"
            >
              Save Status & Resolution State
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                submitReviewAction({
                  reviewType: "reject_root_cause",
                  newRootCause: rootCauseInput,
                  responsibleTeam: teamInput,
                  notes:
                    notesInput ||
                    `Updated root cause to ${ROOT_CAUSE_LABELS[rootCauseInput]}`,
                })
              }
              className="btn-ghost px-3.5 py-2 text-[12px]"
            >
              Update Root Cause & Owner
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                submitReviewAction({
                  reviewType: "update_category",
                  newCategory: categoryInput,
                  notes:
                    notesInput ||
                    `Changed issue category to ${ISSUE_CATEGORY_LABELS[categoryInput]}`,
                })
              }
              className="btn-ghost px-3.5 py-2 text-[12px]"
            >
              Update Category
            </button>

            <button
              type="button"
              disabled={submitting || !notesInput.trim()}
              onClick={() =>
                submitReviewAction({
                  reviewType: "investigation_note",
                  responsibleTeam: teamInput,
                  notes: notesInput.trim(),
                })
              }
              className="btn-ghost px-3.5 py-2 text-[12px]"
            >
              Add Investigation Note Only
            </button>
          </div>
        </Panel>

        {/* Lifecycle Status History & Human Audit Trail */}
        <Panel className="lg:col-span-5 p-5 space-y-5">
          <div>
            <h3 className="text-[15px] font-semibold text-navy mb-2">
              Issue Lifecycle Status History
            </h3>
            {statusHistory.length === 0 ? (
              <p className="text-[12px] text-muted">No status transitions logged.</p>
            ) : (
              <div className="space-y-2.5">
                {statusHistory.map((sh) => (
                  <div
                    key={sh.id}
                    className="rounded-md border border-line bg-surface-2 p-3 text-[12px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {sh.previous_status ? (
                          <>
                            <span className="font-mono font-medium text-muted">
                              {sh.previous_status}
                            </span>
                            <span className="text-muted">→</span>
                          </>
                        ) : null}
                        <IssueStatusBadge
                          status={sh.new_status as IssueLifecycleStatus}
                        />
                      </div>
                      <span className="rounded bg-white border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                        {sh.changed_by_type}
                      </span>
                    </div>
                    <p className="mt-1.5 text-ink">{sh.reason}</p>
                    <div className="mt-1 text-[11px] text-muted font-mono">
                      {formatDateTime(sh.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-[15px] font-semibold text-navy mb-2">
              Human Review & Override Audit Log ({reviews.length})
            </h3>
            {reviews.length === 0 ? (
              <p className="text-[12px] text-muted">
                No human overrides or investigation notes recorded yet. Original AI outputs are active.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-md border border-line bg-surface-2 p-3 text-[12px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink capitalize">
                        {rev.review_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-muted">
                        by {rev.reviewer_name || "Reviewer"}
                      </span>
                    </div>
                    {rev.notes ? (
                      <p className="mt-1 text-ink-soft">{rev.notes}</p>
                    ) : null}
                    <div className="mt-1 text-[10px] font-mono text-muted">
                      {formatDateTime(rev.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
