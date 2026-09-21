"use client";

import { useState, type FormEvent } from "react";
import { DEFAULT_AHT_MINUTES, DEFAULT_AGENT_COUNT, DEFAULT_CALLS_PER_DAY } from "@/lib/billing";

export function SalesForm({
  initialCalls,
  initialAht,
  initialAgents,
}: {
  initialCalls?: string | null;
  initialAht?: string | null;
  initialAgents?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedCalls = Number(initialCalls);
  const parsedAht = Number(initialAht);
  const parsedAgents = Number(initialAgents);

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
      callsPerDay: formData.get("callsPerDay") as string,
      ahtMinutes: formData.get("ahtMinutes") as string,
      agents: formData.get("agents") as string,
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
          We will match this coaching pack to audited minutes and reply with a quote.
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Calls per day</span>
          <input
            name="callsPerDay"
            type="number"
            min={1}
            max={500000}
            defaultValue={Number.isFinite(parsedCalls) && parsedCalls > 0 ? Math.round(parsedCalls) : DEFAULT_CALLS_PER_DAY}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">AHT (minutes)</span>
          <input
            name="ahtMinutes"
            type="number"
            min={0.5}
            max={60}
            step={0.5}
            defaultValue={Number.isFinite(parsedAht) && parsedAht > 0 ? parsedAht : DEFAULT_AHT_MINUTES}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Live agents</span>
          <input
            name="agents"
            type="number"
            min={1}
            max={20000}
            defaultValue={Number.isFinite(parsedAgents) && parsedAgents > 0 ? Math.round(parsedAgents) : DEFAULT_AGENT_COUNT}
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
        Quoted as a coaching pack (scored calls per agent). This form does not charge you.
      </p>
    </form>
  );
}
