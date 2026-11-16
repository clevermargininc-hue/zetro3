"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import {
  ANNUAL_DISCOUNT,
  AUDIO_DAYS_INCLUDED,
  HIGH_VOLUME_PRICING_ENABLED,
  LENGTH_BANDS,
  MAX_CALLS_PER_MONTH,
  MONTHLY_MINIMUM_TZS,
  SETUP_FEE_TZS,
  TRIAL_CALLS,
  VAT_RATE,
  VOLUME_TIERS,
  emptyBandCounts,
  formatTzs,
  pricePerCall,
  quoteMixedUsage,
  totalBandCalls,
  type BandCounts,
  type BillingCycle,
  type LengthBand,
} from "@/lib/billing";

const percentage = Math.round(ANNUAL_DISCOUNT * 100);

function CycleToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (value: BillingCycle) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Contract option"
      className="inline-flex rounded-full border border-[#E3E9F5] bg-white p-1.5 shadow-[0_1px_2px_rgb(10_26_63/0.04)]"
    >
      {(
        [
          ["monthly", "Monthly"],
          ["annual", `Annual · save ${percentage}%`],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={cycle === value}
          onClick={() => onChange(value)}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            cycle === value
              ? "bg-[#0A1A3F] text-white"
              : "text-[#5A6882] hover:text-[#0A1A3F]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PriceTable({ cycle }: { cycle: BillingCycle }) {
  return (
    <div
      className="z-card overflow-x-auto"
      tabIndex={0}
      aria-label="Tanzania price table"
    >
      <table className="w-full min-w-[920px] border-collapse text-left">
        <caption className="sr-only">TZS per successfully scored call, excluding VAT</caption>
        <thead>
          <tr className="border-b border-[#E3E9F5] bg-[#F8FAFF]">
            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#5A6882]">
              Contracted calls / month
            </th>
            {LENGTH_BANDS.map((b) => (
              <th key={b.id} className="border-l border-[#E3E9F5] px-5 py-4">
                <span className="block text-sm font-semibold text-[#0A1A3F]">{b.label}</span>
                <span className="text-xs font-normal text-[#5A6882]">{b.range}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {VOLUME_TIERS.map((tier) => (
            <tr
              key={tier.id}
              className="border-b border-[#E3E9F5] last:border-0 hover:bg-[#F8FAFF]/80 transition-colors"
            >
              <th className="px-5 py-4 text-sm font-semibold text-[#0A1A3F]">{tier.label}</th>
              {tier.conditional && !HIGH_VOLUME_PRICING_ENABLED ? (
                <td
                  colSpan={5}
                  className="border-l border-[#E3E9F5] px-5 py-4 text-sm text-[#5A6882]"
                >
                  Custom contract pricing —{" "}
                  <Link
                    className="font-semibold text-[#2459E8] hover:underline"
                    href="/talk-sales"
                  >
                    talk to sales
                  </Link>
                </td>
              ) : (
                LENGTH_BANDS.map((b) => {
                  const rate = pricePerCall(tier, b.id, cycle);
                  return (
                    <td
                      key={b.id}
                      className="border-l border-[#E3E9F5] px-5 py-4 font-bold text-[#0A1A3F] tabular-nums"
                    >
                      {rate === null ? "Custom" : formatTzs(rate)}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberField({
  band,
  value,
  onChange,
}: {
  band: (typeof LENGTH_BANDS)[number];
  value: number;
  onChange: (id: LengthBand, value: number) => void;
}) {
  return (
    <label className="rounded-[14px] border border-[#E3E9F5] bg-[#F8FAFF]/50 p-4">
      <span className="block text-sm font-semibold text-[#0A1A3F]">{band.label}</span>
      <span className="block text-xs text-[#5A6882]">{band.range}</span>
      <input
        aria-label={`Estimated scored calls ${band.label}`}
        type="number"
        min={0}
        max={MAX_CALLS_PER_MONTH}
        step={1}
        value={value}
        onChange={(e) =>
          onChange(
            band.id,
            Math.min(MAX_CALLS_PER_MONTH, Math.max(0, Math.trunc(Number(e.target.value) || 0))),
          )
        }
        className="field mt-3 tabular-nums font-semibold"
      />
    </label>
  );
}

function Estimate({ cycle }: { cycle: BillingCycle }) {
  const [contractedCalls, setContractedCalls] = useState(20_000);
  const [counts, setCounts] = useState<BandCounts>({ ...emptyBandCounts(), upTo6: 20_000 });
  const quote = useMemo(
    () => quoteMixedUsage({ contractedCalls, bandCounts: counts, cycle }),
    [contractedCalls, counts, cycle],
  );
  const update = (id: LengthBand, value: number) =>
    setCounts((current) => ({ ...current, [id]: value }));
  const estimatedCalls = totalBandCalls(counts);
  const money = (value: number | null) => (value === null ? "Custom quote" : formatTzs(value));

  const talkSalesHref = `/talk-sales?calls=${encodeURIComponent(String(contractedCalls))}&billing=${encodeURIComponent(cycle)}`;

  return (
    <section id="calculator" className="z-card overflow-hidden">
      <div className="grid lg:grid-cols-[1.05fr_.95fr]">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border-b border-[#E3E9F5] p-7 sm:p-9 lg:border-b-0 lg:border-r"
        >
          <span className="z-eyebrow">Interactive TZS estimator</span>
          <h3 className="font-display mt-4 text-2xl font-bold tracking-tight text-[#0A1A3F]">
            Build your monthly estimate
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5A6882]">
            Enter the monthly commitment in your contract, then estimate scored calls in each
            duration band. Mixed recordings are priced independently.
          </p>

          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6882]">
              Contracted calls per month
            </span>
            <input
              type="number"
              min={0}
              max={MAX_CALLS_PER_MONTH}
              step={1}
              value={contractedCalls}
              onChange={(e) =>
                setContractedCalls(
                  Math.min(MAX_CALLS_PER_MONTH, Math.max(0, Math.trunc(Number(e.target.value) || 0))),
                )
              }
              className="field mt-2 text-lg font-bold tabular-nums"
            />
            <span className="mt-1.5 block text-xs text-[#5A6882]">
              Actual overage keeps this contracted tier; it does not move you to another tier.
            </span>
          </label>

          <fieldset className="mt-6">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[#5A6882]">
              Estimated successfully scored calls by recording length
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {LENGTH_BANDS.map((b) => (
                <NumberField key={b.id} band={b} value={counts[b.id]} onChange={update} />
              ))}
            </div>
          </fieldset>

          <p className="mt-4 text-xs text-[#5A6882]">
            Estimated scored calls: {estimatedCalls.toLocaleString("en-US")}. Empty, failed,
            unscored, and over-15-minute recordings are not included here.
          </p>
        </form>

        <div className="bg-[#F8FAFF] p-7 sm:p-9" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#5A6882]">
            {cycle === "annual"
              ? "Annual commitment · invoiced upfront"
              : "Monthly estimate · first invoice"}
          </p>
          <p className="font-display mt-3 text-3xl font-bold tracking-tight text-[#0A1A3F] tabular-nums">
            {quote.requiresContactSales
              ? "Contact sales"
              : money(cycle === "annual" ? quote.annualUpfrontTotalTzs : quote.monthlyTotalTzs)}
          </p>
          <p className="mt-1 text-xs text-[#5A6882]">
            Estimate including {Math.round(VAT_RATE * 100)}% VAT · selected tier {quote.tier.label}
          </p>

          {quote.requiresContactSales ? (
            <div className="mt-6 rounded-[12px] border border-[#DCE6FF] bg-[#EEF3FF] p-5 text-sm leading-relaxed text-[#16233F]">
              Firm pricing above 100,000 contracted calls is quoted individually by our enterprise
              team.{" "}
              <Link href="/talk-sales" className="font-semibold text-[#2459E8] hover:underline">
                Request a custom high-volume contract.
              </Link>
            </div>
          ) : (
            <dl className="mt-6 space-y-3 border-t border-[#E3E9F5] pt-6 text-sm">
              {LENGTH_BANDS.map((b) => (
                <div key={b.id} className="flex justify-between gap-4">
                  <dt className="text-[#5A6882]">
                    {counts[b.id].toLocaleString("en-US")} × {b.label} @ {money(quote.rates[b.id])}
                  </dt>
                  <dd className="font-semibold text-[#0A1A3F] tabular-nums">
                    {money(counts[b.id] * (quote.rates[b.id] || 0))}
                  </dd>
                </div>
              ))}
              <Row label="Usage subtotal" value={money(quote.usageTzs)} />
              <Row label="Minimum adjustment" value={money(quote.minimumAdjustmentTzs)} />
              <Row label="Recurring monthly subtotal" value={money(quote.recurringMonthlyTzs)} />
              {cycle === "monthly" ? (
                <>
                  <Row label="Setup & calibration · once" value={money(quote.setupTzs)} />
                  <Row
                    label="First invoice subtotal · excl. VAT"
                    value={money(quote.monthlySubtotalExVatTzs)}
                  />
                  <Row label="VAT estimate" value={money(quote.monthlyVatTzs)} />
                  <Row
                    strong
                    label="First invoice total estimate"
                    value={money(quote.monthlyTotalTzs)}
                  />
                </>
              ) : (
                <>
                  <Row label="Monthly minimum evaluated" value="For each of 12 months" />
                  <Row label="Setup & calibration" value="Waived" />
                  <Row
                    label="Annual committed usage · excl. VAT"
                    value={money(quote.annualUpfrontExVatTzs)}
                  />
                  <Row label="VAT estimate" value={money(quote.annualUpfrontVatTzs)} />
                  <Row
                    strong
                    label="Annual upfront total estimate"
                    value={money(quote.annualUpfrontTotalTzs)}
                  />
                </>
              )}
            </dl>
          )}

          <div className="mt-7 flex flex-col gap-3">
            <Link
              href={talkSalesHref}
              className="z-btn z-btn-solid w-full"
              style={{ height: "46px" }}
            >
              Request official TZS quote →
            </Link>
            <a
              href={salesMailto(
                "Zetro — Tanzania pricing estimate",
                `Contracted monthly calls: ${contractedCalls}\nEstimated scored calls: ${estimatedCalls}\nBilling: ${cycle}`,
              )}
              className="text-center text-xs font-semibold text-[#2459E8] hover:underline"
            >
              Or email {SALES_EMAIL} directly
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 border-t border-[#E3E9F5] pt-3 ${
        strong ? "text-base font-bold text-[#0A1A3F]" : ""
      }`}
    >
      <dt className={strong ? "text-[#0A1A3F]" : "text-[#5A6882]"}>{label}</dt>
      <dd className="text-right font-semibold text-[#0A1A3F] tabular-nums">{value}</dd>
    </div>
  );
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-3">
        <CycleToggle cycle={cycle} onChange={setCycle} />
        <p className="max-w-2xl text-center text-sm text-[#5A6882]">
          {cycle === "annual"
            ? "12-month contract. Per-call rates are discounted 10%, setup is waived, and committed usage is invoiced upfront. Overage is invoiced monthly at the annual contracted rate."
            : "Month-to-month at standard per-call rates, with a one-time setup fee and monthly billing floor."}
        </p>
      </div>

      <PriceTable cycle={cycle} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Info
          title="Setup & calibration"
          value={cycle === "annual" ? "Waived" : `${formatTzs(SETUP_FEE_TZS)} once`}
          copy="Waived on a 12-month contract."
        />
        <Info
          title="Monthly minimum"
          value={formatTzs(MONTHLY_MINIMUM_TZS)}
          copy="A billing floor, not an extra fee."
        />
        <Info
          title="Free trial"
          value={`${TRIAL_CALLS} calls`}
          copy="One trial per company, using your scorecard."
        />
        <Info
          title="Storage & re-scoring"
          value={`${AUDIO_DAYS_INCLUDED} days included`}
          copy="Longer retention is quoted separately. Re-scoring is 50% of the original call price."
        />
      </div>

      <Estimate cycle={cycle} />

      <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-[#5A6882]">
        All results are estimates in TZS. Prices exclude VAT; the calculator shows the current
        configurable {Math.round(VAT_RATE * 100)}% estimate separately. Only successfully scored
        recordings are charged. Contracts and invoices are handled through{" "}
        <a className="font-semibold text-[#2459E8] hover:underline" href={`mailto:${SALES_EMAIL}`}>
          {SALES_EMAIL}
        </a>
        . No online checkout is available.
      </p>
    </div>
  );
}

function Info({ title, value, copy }: { title: string; value: string; copy: string }) {
  return (
    <div className="z-card p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#5A6882]">{title}</p>
      <p className="font-display mt-2 text-xl font-bold text-[#0A1A3F] tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#5A6882]">{copy}</p>
    </div>
  );
}
