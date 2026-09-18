"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COMMERCIAL_PLANS,
  DEFAULT_AGENT_COUNT,
  DEFAULT_AUDIT_PERCENT,
  DEFAULT_TALK_HOURS_PER_DAY,
  formatMinutes,
  formatUsd,
  quoteVolume,
  type CommercialPlanId,
} from "@/lib/billing";

const AUDIT_PRESETS = [
  { label: "5% sample", value: 5 },
  { label: "25%", value: 25 },
  { label: "70% queue", value: 70 },
  { label: "100% floor", value: 100 },
] as const;

function planHref(planId: CommercialPlanId, quote: ReturnType<typeof quoteVolume>) {
  const params = new URLSearchParams({
    plan: planId,
    agents: String(quote.agents),
    hours: String(quote.talkHoursPerDay),
    audit: String(quote.auditPercent),
  });
  return `/talk-sales?${params.toString()}`;
}

export function PricingQuote() {
  const [agents, setAgents] = useState(DEFAULT_AGENT_COUNT);
  const [hours, setHours] = useState(DEFAULT_TALK_HOURS_PER_DAY);
  const [percent, setPercent] = useState(DEFAULT_AUDIT_PERCENT);

  const quote = useMemo(
    () =>
      quoteVolume({
        agents,
        talkHoursPerDay: hours,
        auditPercent: percent,
      }),
    [agents, hours, percent],
  );

  const paidRows = quote.quotes.filter((row) => row.plan.id !== "trial");
  const recommendedId = quote.recommended.plan.id;

  return (
    <section className="mt-10 border border-line bg-white">
      <div className="border-b border-line px-6 py-5">
        <h2 className="font-display text-[18px] font-semibold text-ink">Estimate from your floor</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
          Talk minutes are agents × hours on the phone per day × 22 working days. You only pay for the
          share you send to Zetro to audit — sampling 5% is a different bill from scoring everything.
        </p>
      </div>

      <div className="grid gap-6 border-b border-line px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Named agents
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={80}
                value={agents}
                onChange={(event) => setAgents(Number(event.target.value))}
                className="w-full accent-blue"
              />
              <input
                type="number"
                min={1}
                max={200}
                value={agents}
                onChange={(event) =>
                  setAgents(Math.min(200, Math.max(1, Number(event.target.value) || 1)))
                }
                className="field w-20 text-right tabular-nums"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Talk hours per agent per day
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                className="w-full accent-blue"
              />
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={hours}
                onChange={(event) =>
                  setHours(Math.min(10, Math.max(1, Number(event.target.value) || 1)))
                }
                className="field w-20 text-right tabular-nums"
              />
            </div>
          </label>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Share of talk to audit
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {AUDIT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setPercent(preset.value)}
                  className={`btn px-3 py-1.5 text-[12px] ${
                    percent === preset.value ? "btn-blue" : "btn-ghost"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={percent}
                onChange={(event) => setPercent(Number(event.target.value))}
                className="w-full accent-blue"
              />
              <span className="w-14 text-right text-[13px] tabular-nums text-ink">{percent}%</span>
            </label>
          </div>
        </div>

        <div className="border border-line bg-bg px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">This mix</p>
          <dl className="mt-3 space-y-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Talk time / month</dt>
              <dd className="tabular-nums font-medium text-ink">{formatMinutes(quote.talkMinutes)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Minutes sent to audit</dt>
              <dd className="tabular-nums font-medium text-ink">{formatMinutes(quote.auditedMinutes)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-2">
              <dt className="text-muted">Best list price</dt>
              <dd className="text-right">
                <p className="font-semibold text-ink">{quote.recommended.plan.name}</p>
                <p className="tabular-nums text-ink">
                  {Number.isFinite(quote.recommended.totalUsd)
                    ? `${formatUsd(quote.recommended.totalUsd)} / mo`
                    : "Talk to sales"}
                </p>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            {recommendedId === "trial"
              ? "This volume fits the trial. After 120 audited minutes, Sampling is the next paid step."
              : recommendedId === "floor"
                ? "At this volume a Floor commit is cheaper than list overage. Sales will quote from your minutes."
                : `Includes the ${quote.recommended.plan.name} platform fee${
                    quote.recommended.auditedOverageMinutes > 0
                      ? ` plus ${formatMinutes(quote.recommended.auditedOverageMinutes)} overage`
                      : ", with room inside the included bucket"
                  }.`}
          </p>
          <Link href={planHref(recommendedId, quote)} className="btn btn-blue mt-4 w-full">
            Send this mix to sales
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th className="text-right">Platform</th>
              <th className="text-right">Overage</th>
              <th className="text-right">Est. monthly</th>
              <th className="text-right">Per audited min</th>
            </tr>
          </thead>
          <tbody>
            {paidRows.map((row) => {
              const active = row.plan.id === recommendedId;
              return (
                <tr key={row.plan.id} className={active ? "bg-blue-soft" : undefined}>
                  <td className="font-medium text-ink">
                    {row.plan.name}
                    {active ? <span className="ml-2 text-[11px] font-medium text-blue">Best fit</span> : null}
                  </td>
                  <td className="text-right tabular-nums text-ink">
                    {row.plan.monthlyUsd == null ? COMMERCIAL_PLANS.floor.periodLabel : formatUsd(row.platformUsd)}
                  </td>
                  <td className="text-right tabular-nums text-muted">
                    {row.auditedOverageMinutes > 0 ? formatMinutes(row.auditedOverageMinutes) : "—"}
                  </td>
                  <td className="text-right tabular-nums font-medium text-ink">{formatUsd(row.totalUsd)}</td>
                  <td className="text-right tabular-nums text-muted">
                    {row.blendedPerAuditedMinuteUsd != null
                      ? `${formatUsd(row.blendedPerAuditedMinuteUsd)} / min`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
