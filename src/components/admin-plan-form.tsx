"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { BILLING_PLANS, BILLING_PLAN_LABELS, type BillingPlan } from "@/lib/billing";

const PLAN_HINTS: Record<BillingPlan, string> = {
  trial: "Can score up to the trial allowance, then scoring stops until you pick a paid plan.",
  monthly: "Scores without limit. Invoice each month; setup fee applies.",
  annual: "Scores without limit. 12-month contract, 10% off calls, setup waived.",
  paused: "Scoring and preparing are blocked. Use for unpaid invoices or ended contracts.",
};

export function AdminPlanForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: {
    plan: BillingPlan;
    trialCalls: number;
    committedCalls: number | null;
    contractStart: string | null;
    contractEnd: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<BillingPlan>(initial.plan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await authFetch(`/api/admin/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          trialCalls: form.get("trialCalls"),
          committedCalls: form.get("committedCalls"),
          contractStart: form.get("contractStart"),
          contractEnd: form.get("contractEnd"),
          notes: form.get("notes"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not save the plan.");
      setInfo(`Saved. This workspace is now on ${BILLING_PLAN_LABELS[plan].toLowerCase()}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the plan.");
    } finally {
      setSaving(false);
    }
  }

  const paid = plan === "monthly" || plan === "annual";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset>
        <legend className="text-[13px] font-semibold text-ink">Plan</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {BILLING_PLANS.map((id) => (
            <label
              key={id}
              className={`flex cursor-pointer flex-col gap-1 border px-4 py-3 ${
                plan === id ? "border-blue bg-blue-soft" : "border-line bg-white hover:border-slate-300"
              }`}
            >
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <input
                  type="radio"
                  name="plan"
                  value={id}
                  checked={plan === id}
                  onChange={() => setPlan(id)}
                />
                {BILLING_PLAN_LABELS[id]}
              </span>
              <span className="text-[12px] leading-relaxed text-muted">{PLAN_HINTS[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Trial calls allowed</span>
          <input
            name="trialCalls"
            type="number"
            min={0}
            step={1}
            defaultValue={initial.trialCalls}
            className="field"
          />
          <span className="text-[12px] text-muted">Used only on the free trial. Default 50.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Committed calls per month</span>
          <input
            name="committedCalls"
            type="number"
            min={0}
            step={1}
            defaultValue={initial.committedCalls ?? ""}
            placeholder={paid ? "From the contract" : "Optional"}
            className="field"
          />
          <span className="text-[12px] text-muted">Sets the volume level (price per call) on the invoice.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Contract start</span>
          <input name="contractStart" type="date" defaultValue={initial.contractStart ?? ""} className="field" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Contract end</span>
          <input name="contractEnd" type="date" defaultValue={initial.contractEnd ?? ""} className="field" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Notes</span>
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={initial.notes ?? ""}
          placeholder="Invoice number, contact person, what was agreed…"
          className="field resize-none"
        />
      </label>

      {error ? <p className="alert-error text-[13px]">{error}</p> : null}
      {info ? <p className="alert-ok text-[13px]">{info}</p> : null}

      <button type="submit" disabled={saving} className="btn btn-blue">
        {saving ? "Saving…" : "Save plan"}
      </button>
    </form>
  );
}
