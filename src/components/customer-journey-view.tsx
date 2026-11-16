"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, Panel, StatTile, ScorePill, VerdictBadge } from "@/components/ui";
import {
  EvidenceTypeBadge,
  formatCategoryLabel,
  IssueStatusBadge,
  MatchClassificationBadge,
  ResolutionConfirmationBadge,
  RiskLevelBadge,
  RootCauseBadge,
} from "@/components/customer-intelligence-badges";
import { formatPhoneReadable, maskPhoneNumber } from "@/lib/customer-identity";
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

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}

export function CustomerJourneyView({
  initialDetail,
}: {
  initialDetail: {
    customer: CustomerDirectoryItem;
    identifiers: Array<{
      id: string;
      id_type: string;
      raw_value: string;
      normalized_value: string;
      source: string;
      confidence: number;
      verified_by_human: boolean;
    }>;
    issues: IssueSummaryItem[];
    timeline: TimelineCallEntry[];
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
  const [maskPii, setMaskPii] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [phoneInput, setPhoneInput] = useState(
    detail.customer.normalized_phone || "",
  );
  const [extIdInput, setExtIdInput] = useState(
    detail.customer.external_customer_id || "",
  );
  const [labelInput, setLabelInput] = useState(detail.customer.display_label);
  const [notesInput, setNotesInput] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityMsg, setIdentityMsg] = useState<string | null>(null);

  const { customer, identifiers, issues, timeline } = detail;

  const displayPhone = customer.normalized_phone
    ? maskPii
      ? maskPhoneNumber(customer.normalized_phone)
      : formatPhoneReadable(customer.normalized_phone)
    : customer.display_label;

  const recurringIssues = issues.filter((i) => i.total_calls > 1);
  const singleContactIssues = issues.filter((i) => i.total_calls <= 1);

  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setSavingIdentity(true);
    setIdentityMsg(null);
    try {
      const res = await fetch(
        `/api/customer-intelligence/customers/${customer.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneInput: phoneInput.trim() || null,
            externalCustomerId: extIdInput.trim() || null,
            displayLabel: labelInput.trim() || null,
            verifyIdentity: true,
            notes: notesInput.trim() || "Verified customer identity",
          }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: typeof detail;
      };
      if (!res.ok || !json.ok) {
        setIdentityMsg(json.error || "Could not update customer identity.");
      } else {
        if (json.detail) setDetail(json.detail);
        setIdentityMsg(detail.migrationRequired ? "Identity updated in temporary preview memory." : "Customer identity verified and saved.");
        setEditingIdentity(false);
      }
    } catch {
      setIdentityMsg("Network error while saving customer identity.");
    } finally {
      setSavingIdentity(false);
    }
  }

  return (
    <div className="space-y-6">
      {detail.migrationRequired ? <div role="status" className="alert-info text-sm">Preview mode: review changes are temporary until the customer-journey database migration is applied.</div> : null}
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Link href="/customers" className="hover:text-blue hover:underline font-medium">
          ← Back to Customer Intelligence
        </Link>
        <span>/</span>
        <span className="text-ink font-semibold">{displayPhone}</span>
      </div>

      <PageHeader
        eyebrow="Customer Journey & Interaction History"
        title={displayPhone}
        subtitle={`Primary ID: ${maskPii && customer.primary_identifier === customer.normalized_phone ? maskPhoneNumber(customer.primary_identifier) : customer.primary_identifier} · First interaction: ${formatDateTime(
          customer.first_interaction_at,
        )} · Most recent: ${formatDateTime(customer.last_interaction_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RiskLevelBadge risk={customer.risk_level} />
            <button
              type="button"
              onClick={() => setMaskPii((v) => !v)}
              className="btn-ghost px-3 py-1.5 text-[12px]"
            >
              {maskPii ? "Unmask MSISDN" : "Mask MSISDN"}
            </button>
            <button
              type="button"
              onClick={() => setEditingIdentity((v) => !v)}
              className="btn-blue px-3 py-1.5 text-[12px]"
            >
              {editingIdentity ? "Close Identity Review" : "Review / Edit Identity"}
            </button>
          </div>
        }
      />

      {identityMsg ? (
        <div className="alert-info text-[12px] font-medium">
          {identityMsg}
        </div>
      ) : null}

      {/* Identity Review Panel (Phase 2 & 11) */}
      {editingIdentity ? (
        <Panel className="p-5">
          <h3 className="text-[14px] font-semibold text-navy mb-1">
            Customer Identity Verification & Correction
          </h3>
          <p className="text-[12px] text-muted mb-4">
            Phone numbers are automatically normalized using country-aware rules (e.g., 0712345678 → +255712345678).
          </p>
          <form
            onSubmit={handleSaveIdentity}
            className="grid grid-cols-1 gap-4 sm:grid-cols-4"
          >
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Phone / MSISDN
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 0712345678 or +255712345678"
                className="field text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Customer / CRM ID
              </label>
              <input
                type="text"
                value={extIdInput}
                onChange={(e) => setExtIdInput(e.target.value)}
                placeholder="e.g. CUST-10042"
                className="field text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Display Label
              </label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                className="field text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                Review Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="field text-[13px]"
                />
                <button
                  type="submit"
                  disabled={savingIdentity}
                  className="btn-blue shrink-0 px-3.5 py-1.5 text-[12px]"
                >
                  {savingIdentity ? "Saving…" : "Verify & Save"}
                </button>
              </div>
            </div>
          </form>
        </Panel>
      ) : null}

      {/* Phase 3 Required Customer Metrics Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Total Calls"
          value={customer.total_calls}
          hint={`First: ${formatShortDate(customer.first_interaction_at)} · Latest: ${formatShortDate(customer.last_interaction_at)}`}
        />
        <StatTile
          label="Repeated Calls"
          value={customer.repeat_call_count}
          hint="Follow-up calls on existing issues"
          tone={customer.repeat_call_count > 0 ? "warn" : "default"}
        />
        <StatTile
          label="Recurring Issues"
          value={customer.recurring_issue_count}
          hint={`${customer.new_issue_count} total distinct issue(s)`}
          tone={customer.recurring_issue_count > 0 ? "warn" : "default"}
        />
        <StatTile
          label="Unresolved Issues"
          value={customer.unresolved_issue_count}
          hint={
            customer.reopened_issue_count > 0
              ? `${customer.reopened_issue_count} reopened after resolution`
              : "Currently open or pending"
          }
          tone={customer.unresolved_issue_count > 0 ? "bad" : "good"}
        />
        <StatTile
          label="Resolved Issues"
          value={customer.resolved_issue_count}
          hint="Completed lifecycle issues"
          tone="good"
        />
        <StatTile
          label="Avg Time Between Calls"
          value={
            customer.avg_hours_between_calls != null
              ? customer.avg_hours_between_calls < 48
                ? `${customer.avg_hours_between_calls}h`
                : `${(customer.avg_hours_between_calls / 24).toFixed(1)}d`
              : "—"
          }
          hint={
            customer.top_issue_categories.length
              ? `Top: ${formatCategoryLabel(customer.top_issue_categories[0])}`
              : "Single interaction"
          }
        />
      </div>

      {/* Matched Identifiers & Top Reported Problems Bar */}
      <Panel className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Matched Identifiers:
          </span>
          {identifiers.map((idRow) => (
            <span
              key={idRow.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-mono text-ink"
            >
              <strong className="font-sans text-[10px] uppercase text-muted">
                {idRow.id_type}:
              </strong>
              {idRow.id_type === "msisdn" && maskPii
                ? maskPhoneNumber(idRow.normalized_value)
                : idRow.normalized_value}
              <span className="text-[10px] text-muted">
                ({Math.round(idRow.confidence * 100)}%)
              </span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Most Frequent Problems:
          </span>
          {customer.top_issue_categories.map((cat) => (
            <span
              key={cat}
              className="rounded-md bg-teal-soft border border-[#99F6E4] px-2.5 py-1 text-[12px] font-semibold text-teal"
            >
              {formatCategoryLabel(cat)}
            </span>
          ))}
        </div>
        {/* Products and Services Involved */}
        {(() => {
          const products = Array.from(
            new Set(issues.flatMap(i => [i.product_name,...(i.catalogue_products||[]).map(p=>p.name)]).filter(Boolean)),
          );
          const services = Array.from(
            new Set(issues.flatMap(i => [i.service_name,...(i.catalogue_services||[]).map(s=>s.name)]).filter(Boolean)),
          );
          if (products.length === 0 && services.length === 0) return null;
          return (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line w-full">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Products & Services Involved:
              </span>
              {services.map((svc) => (
                <span
                  key={svc}
                  className="rounded-md bg-blue-soft border border-[#BFDBFE] px-2.5 py-0.5 text-[12px] font-semibold text-blue"
                >
                  {svc}
                </span>
              ))}
              {products.map((prod) => (
                <span
                  key={prod}
                  className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[12px] font-semibold text-ink"
                >
                  {prod}
                </span>
              ))}
            </div>
          );
        })()}
      </Panel>

      {/* PHASE 3: CHRONOLOGICAL CUSTOMER INTERACTION TIMELINE */}
      <Panel className="overflow-hidden">
        <div className="p-5 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold text-navy">
              Chronological Customer Interaction Timeline
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Every call linked in sequence, distinguishing new issues from recurring unresolved issues, with direct links to transcripts, QA scores, and root-cause evidence.
            </p>
          </div>
          <span className="rounded-md bg-blue-soft border border-[#BFDBFE] px-2.5 py-1 font-mono text-[12px] font-semibold text-blue">
            {timeline.length} interaction{timeline.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Contact #</th>
                <th>Issue Reported</th>
                <th>Issue Classification</th>
                <th>Lifecycle Status</th>
                <th>Root Cause & Evidence</th>
                <th>Agent & QA Audit</th>
                <th className="text-right">Call / QA / Issue Links</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((entry, idx) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap">
                    <div className="font-semibold text-ink">
                      {formatShortDate(entry.call_date)}
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      {new Date(entry.call_date).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="font-mono text-[12px]">
                    <span className="rounded bg-surface-2 border border-line px-2 py-0.5 font-semibold text-ink">
                      Call #{idx + 1}
                    </span>
                    {entry.interaction_number > 1 ? (
                      <div className="mt-1 text-[11px] font-semibold text-blue">
                        Issue contact #{entry.interaction_number}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/customers/issues/${entry.issue_id}`}
                        className="font-mono text-[11px] font-semibold text-blue hover:underline"
                      >
                        {entry.issue_code}
                      </Link>
                      <span className="text-[11px] text-muted">
                        · {formatCategoryLabel(entry.extracted_category)}
                      </span>
                    </div>
                    <div className="font-semibold text-ink mt-0.5 line-clamp-1">
                      {entry.issue_title}
                    </div>
                    <p className="text-[12px] text-muted line-clamp-2 mt-0.5">
                      {entry.extracted_issue_summary}
                    </p>
                  </td>
                  <td>
                    <MatchClassificationBadge
                      classification={entry.match_classification}
                    />
                    <div className="mt-1 text-[11px] text-muted max-w-[210px] line-clamp-2">
                      {entry.match_reason}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <IssueStatusBadge status={entry.issue_status} />
                      <ResolutionConfirmationBadge
                        confirmation={entry.resolution_confirmation}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <RootCauseBadge category={entry.primary_root_cause} />
                      <EvidenceTypeBadge
                        evidenceType={entry.root_cause_evidence_type}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="text-[12px] font-semibold text-ink mb-1">
                      {entry.agent_name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ScorePill score={entry.qa_score} />
                      <VerdictBadge verdict={entry.qa_verdict as "pass" | "review" | "fail" | null} />
                    </div>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <div className="inline-flex flex-col items-end gap-1.5">
                      <Link
                        href={`/customers/issues/${entry.issue_id}`}
                        className="btn-blue px-2.5 py-1 text-[11px]"
                      >
                        Investigate Issue →
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] font-medium">
                        <Link
                          href={`/upload/prepare/${entry.call_id}`}
                          className="text-blue hover:underline"
                        >
                          Transcript
                        </Link>
                        <span className="text-line">|</span>
                        <Link
                          href={`/upload/score/${entry.call_id}`}
                          className="text-blue hover:underline"
                        >
                          QA Audit
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Recurring Issue Groups vs Standalone New Issues */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold text-navy mb-1">
            Recurring Issue Groups ({recurringIssues.length})
          </h3>
          <p className="text-[12px] text-muted mb-4">
            Issues where the customer contacted support multiple times for the same underlying problem
          </p>
          {recurringIssues.length === 0 ? (
            <p className="text-[13px] text-muted py-4">
              No recurring multi-call issues recorded for this customer.
            </p>
          ) : (
            <div className="space-y-3">
              {recurringIssues.map((iss) => (
                <div
                  key={iss.id}
                  className="rounded-lg border border-line bg-surface-2 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold text-blue">
                        {iss.issue_code}
                      </span>
                      <span className="rounded bg-blue-soft border border-[#BFDBFE] px-2 py-0.5 text-[11px] font-semibold text-blue">
                        {iss.total_calls} Contacts
                      </span>
                      <IssueStatusBadge status={iss.status} />
                    </div>
                    <Link
                      href={`/customers/issues/${iss.id}`}
                      className="btn-blue px-2.5 py-1 text-[12px]"
                    >
                      Open Investigation →
                    </Link>
                  </div>
                  <h4 className="text-[14px] font-semibold text-ink">
                    {iss.title}
                  </h4>
                  <p className="text-[12px] text-muted">{iss.summary}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <RootCauseBadge category={iss.primary_root_cause} />
                    <EvidenceTypeBadge
                      evidenceType={iss.root_cause_evidence_type}
                    />
                    <ResolutionConfirmationBadge
                      confirmation={iss.resolution_confirmation}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold text-navy mb-1">
            Single-Contact / Distinct Issues ({singleContactIssues.length})
          </h3>
          <p className="text-[12px] text-muted mb-4">
            Separate issues handled in a single interaction without repeat follow-up calls
          </p>
          {singleContactIssues.length === 0 ? (
            <p className="text-[13px] text-muted py-4">
              No single-contact issues recorded.
            </p>
          ) : (
            <div className="space-y-3">
              {singleContactIssues.map((iss) => (
                <div
                  key={iss.id}
                  className="rounded-lg border border-line bg-surface-2 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold text-teal">
                        {iss.issue_code}
                      </span>
                      <span className="rounded bg-white border border-line px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                        {formatCategoryLabel(iss.category)}
                      </span>
                      <IssueStatusBadge status={iss.status} />
                    </div>
                    <Link
                      href={`/customers/issues/${iss.id}`}
                      className="btn-ghost px-2.5 py-1 text-[12px]"
                    >
                      Inspect →
                    </Link>
                  </div>
                  <h4 className="text-[14px] font-semibold text-ink">
                    {iss.title}
                  </h4>
                  <p className="text-[12px] text-muted">{iss.summary}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
