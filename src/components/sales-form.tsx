"use client";

import { useState, type FormEvent } from "react";
import {
  COMMERCIAL_PLANS,
  DEFAULT_AGENT_COUNT,
  DEFAULT_AUDIT_PERCENT,
  DEFAULT_TALK_HOURS_PER_DAY,
  isCommercialPlanId,
  type CommercialPlanId,
} from "@/lib/billing";

const PLAN_OPTIONS: { id: CommercialPlanId; label: string }[] = [
  { id: "trial", label: COMMERCIAL_PLANS.trial.name },
  { id: "sampling", label: `${COMMERCIAL_PLANS.sampling.name} · ${COMMERCIAL_PLANS.sampling.priceLabel}/mo` },
  { id: "coverage", label: `${COMMERCIAL_PLANS.coverage.name} · ${COMMERCIAL_PLANS.coverage.priceLabel}/mo` },
  { id: "floor", label: `${COMMERCIAL_PLANS.floor.name} · custom commit` },
];

export function SalesForm({
  initialPlan,
  initialAgents,
  initialHours,
  initialAudit,
}: {
  initialPlan?: string | null;
  initialAgents?: string | null;
  initialHours?: string | null;
  initialAudit?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultPlan = isCommercialPlanId(initialPlan) ? initialPlan : "coverage";
  const defaultAgents = Number(initialAgents);
  const defaultHours = Number(initialHours);
  const defaultAudit = Number(initialAudit);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      workEmail: formData.get("workEmail") as string,
      companyName: formData.get("companyName") as string,
      message: formData.get("message") as string,
      plan: formData.get("plan") as string,
      agents: formData.get("agents") as string,
      talkHoursPerDay: formData.get("talkHoursPerDay") as string,
      auditPercent: formData.get("auditPercent") as string,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit request.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-500">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-good/10 text-good">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-bold text-ink">Request received</h3>
        <p className="text-[14px] text-muted">
          We will map your minutes to Sampling, Coverage, or Floor and reply with a quote.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Full name</span>
          <input name="fullName" required type="text" className="field" placeholder="Jane Doe" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Company name</span>
          <input name="companyName" required type="text" className="field" placeholder="Acme Corp" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Work email</span>
        <input name="workEmail" required type="email" className="field" placeholder="jane@acmecorp.com" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Plan of interest</span>
        <select name="plan" defaultValue={defaultPlan} className="field">
          {PLAN_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Agents</span>
          <input
            name="agents"
            type="number"
            min={1}
            max={500}
            defaultValue={Number.isFinite(defaultAgents) && defaultAgents > 0 ? defaultAgents : DEFAULT_AGENT_COUNT}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Talk hours / day</span>
          <input
            name="talkHoursPerDay"
            type="number"
            min={1}
            max={12}
            step={0.5}
            defaultValue={Number.isFinite(defaultHours) && defaultHours > 0 ? defaultHours : DEFAULT_TALK_HOURS_PER_DAY}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">% to audit</span>
          <input
            name="auditPercent"
            type="number"
            min={1}
            max={100}
            defaultValue={Number.isFinite(defaultAudit) && defaultAudit > 0 ? defaultAudit : DEFAULT_AUDIT_PERCENT}
            className="field"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Anything else (optional)</span>
        <textarea
          name="message"
          rows={3}
          className="field resize-none"
          placeholder="Languages, PBX, invoice currency (USD / TZS / KES)…"
        />
      </label>

      {error ? <p className="alert-error text-[13px]">{error}</p> : null}

      <button type="submit" disabled={loading} className="btn btn-lg btn-blue mt-2">
        {loading ? "Sending request…" : "Request a quote"}
      </button>

      <p className="mt-2 text-center text-[12px] text-muted">
        Volume is used to quote audited minutes. Billing is not charged from this form.
      </p>
    </form>
  );
}
