"use client";

import { useState, type FormEvent } from "react";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import {
  ANNUAL_DISCOUNT,
  DEFAULT_CALLS_PER_MONTH,
  DEFAULT_TALK_MINUTES,
  MAX_CALLS_PER_MONTH,
  isBillingCycle,
  type BillingCycle,
} from "@/lib/billing";

export function SalesForm({
  initialCalls,
  initialMinutes,
  initialBilling,
}: {
  initialCalls?: string | null;
  initialMinutes?: string | null;
  initialBilling?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedCalls = Number(initialCalls);
  const parsedMinutes = Number(initialMinutes);
  const billing: BillingCycle = isBillingCycle(initialBilling) ? initialBilling : "monthly";

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
      callsPerMonth: formData.get("callsPerMonth") as string,
      talkMinutes: formData.get("talkMinutes") as string,
      billing: formData.get("billing") as string,
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
      <div className="border border-line bg-surface-2 p-8 text-center animate-in fade-in duration-300">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-good/15 text-good">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="mb-2 text-[17px] font-semibold text-ink">Quote request received</h3>
        <p className="text-[13px] leading-relaxed text-muted">
          We will reply by email with a price per call in TZS within 1 business day. For urgent contract terms, email{" "}
          <a href={salesMailto("Zetro — contract or sales deal")} className="font-semibold text-blue hover:underline">
            {SALES_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Full name</span>
          <input name="fullName" required type="text" className="field mt-1.5" placeholder="Jane Doe" />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Company name</span>
          <input name="companyName" required type="text" className="field mt-1.5" placeholder="Acme Corp" />
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Work email</span>
        <input name="workEmail" required type="email" className="field mt-1.5" placeholder="jane@acmecorp.com" />
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Calls / month</span>
          <input
            name="callsPerMonth"
            type="number"
            min={1}
            max={MAX_CALLS_PER_MONTH}
            defaultValue={
              Number.isFinite(parsedCalls) && parsedCalls > 0 ? Math.round(parsedCalls) : DEFAULT_CALLS_PER_MONTH
            }
            className="field mt-1.5 tabular-nums"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Talk time (min)</span>
          <input
            name="talkMinutes"
            type="number"
            min={0.5}
            max={60}
            step={0.5}
            defaultValue={Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : DEFAULT_TALK_MINUTES}
            className="field mt-1.5 tabular-nums"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Billing</span>
          <select name="billing" defaultValue={billing} className="field mt-1.5">
            <option value="monthly">Monthly</option>
            <option value="annual">Annual (Save {Math.round(ANNUAL_DISCOUNT * 100)}%)</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Anything else (optional)</span>
        <textarea
          name="message"
          rows={3}
          className="field mt-1.5 resize-none"
          placeholder="Languages, telephony system, number of agents, target start date…"
        />
      </label>

      {error ? <p className="alert-error text-[13px]">{error}</p> : null}

      <button type="submit" disabled={loading} className="btn btn-lg btn-blue w-full mt-2 font-semibold">
        {loading ? "Sending request…" : "Request quote in TZS"}
      </button>

      <p className="mt-1 text-center text-[12px] text-muted">
        Priced per scored call in TZS, excluding VAT. This form does not charge your card.
      </p>
    </form>
  );
}
