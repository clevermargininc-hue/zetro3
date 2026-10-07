"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import {
  ANNUAL_DISCOUNT,
  DEFAULT_CALLS_PER_MONTH,
  DEFAULT_TALK_MINUTES,
  LARGE_VOLUME_CALLS,
  LENGTH_BANDS,
  MAX_CALLS_PER_MONTH,
  MAX_TALK_MINUTES,
  MONTHLY_MINIMUM_TZS,
  SETUP_FEE_TZS,
  TRIAL_CALLS,
  TZS_PER_USD,
  VOLUME_TIERS,
  bandLabel,
  formatTzs,
  formatUsdFromTzs,
  pricePerCall,
  quotePrice,
  type BillingCycle,
  type PriceQuote,
} from "@/lib/billing";

const DISCOUNT_PERCENT = Math.round(ANNUAL_DISCOUNT * 100);

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, Math.max(min, value));
}

function salesHref(calls: number, minutes: number, cycle: BillingCycle) {
  const params = new URLSearchParams({
    calls: String(calls),
    minutes: String(minutes),
    billing: cycle,
  });
  return `/talk-sales?${params.toString()}`;
}

function estimateEmail(quote: PriceQuote) {
  return salesMailto(
    "Zetro — contract request",
    [
      "Hello Zetro team,",
      "",
      "We would like a contract for:",
      `- Scored calls per month: ${quote.callsPerMonth.toLocaleString("en-US")}`,
      `- Average talk time: ${quote.talkMinutes} min`,
      `- Billing: ${quote.cycle === "annual" ? "annual" : "monthly"}`,
      `- Estimate: ${formatTzs(quote.monthlyTzs)} per month (excluding VAT)`,
      "",
      "Company:",
      "Contact person:",
    ].join("\n"),
  );
}

function CycleToggle({ cycle, onChange }: { cycle: BillingCycle; onChange: (cycle: BillingCycle) => void }) {
  const options: { id: BillingCycle; label: string }[] = [
    { id: "monthly", label: "Billed monthly" },
    { id: "annual", label: "Billed annually" },
  ];
  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex border border-line bg-white p-1">
      {options.map((option) => {
        const active = option.id === cycle;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold transition-colors ${
              active ? "bg-blue text-white" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
            {option.id === "annual" ? (
              <span
                className={`px-1.5 py-0.5 text-[11px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-blue-soft text-blue"
                }`}
              >
                Save {DISCOUNT_PERCENT}%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PriceTable({ cycle }: { cycle: BillingCycle }) {
  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-bg">
            <th scope="col" className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-muted">
              Scored calls per month
            </th>
            {LENGTH_BANDS.map((band) => (
              <th key={band.id} scope="col" className="px-5 py-4">
                <span className="block text-[14px] font-semibold text-ink">{band.label}</span>
                <span className="block text-[12px] font-normal text-muted">{band.range}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {VOLUME_TIERS.map((tier) => (
            <tr key={tier.id} className="border-b border-line last:border-b-0">
              <th scope="row" className="px-5 py-4 text-[14px] font-medium text-ink">
                {tier.label}
              </th>
              {LENGTH_BANDS.map((band) => {
                const price = pricePerCall(tier, band.id, cycle);
                return (
                  <td key={band.id} className="px-5 py-4 tabular-nums">
                    <span className="block text-[16px] font-semibold text-ink">{formatTzs(price)}</span>
                    <span className="block text-[12px] text-muted">
                      {formatUsdFromTzs(price)}
                      {cycle === "annual" ? (
                        <span className="ml-1.5 line-through">{formatTzs(tier.prices[band.id])}</span>
                      ) : null}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className="px-5 py-4 text-[14px] font-medium text-ink">
              Over {LARGE_VOLUME_CALLS.toLocaleString("en-US")}
            </th>
            <td colSpan={LENGTH_BANDS.length} className="px-5 py-4 text-[14px] text-muted">
              Priced in your contract.{" "}
              <a href={salesMailto("Zetro — large volume quote")} className="font-semibold text-blue hover:underline">
                Email us
              </a>{" "}
              for a quote.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Charges({ cycle }: { cycle: BillingCycle }) {
  const rows = [
    {
      label: "Setup and calibration",
      value: cycle === "annual" ? "Free" : `${formatTzs(SETUP_FEE_TZS)} once`,
      usd: cycle === "annual" ? `Waived on annual billing (normally ${formatTzs(SETUP_FEE_TZS)})` : formatUsdFromTzs(SETUP_FEE_TZS),
      note: "We load your scorecard and scripts, then score 20 calls with your QA lead until the marks agree.",
    },
    {
      label: "Monthly minimum",
      value: formatTzs(MONTHLY_MINIMUM_TZS),
      usd: formatUsdFromTzs(MONTHLY_MINIMUM_TZS),
      note: "If your calls cost less in a month, the invoice is the minimum.",
    },
    {
      label: "Free trial",
      value: `${TRIAL_CALLS} calls`,
      usd: "One trial per company",
      note: "Scored on your own scorecard before you sign anything.",
    },
    {
      label: "Re-scoring a call",
      value: "Half price",
      usd: "Of that call's price",
      note: "For example, after you change your scorecard. Audio stays in your workspace; longer storage can be quoted with sales.",
    },
  ];
  return (
    <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="bg-white px-5 py-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{row.label}</p>
          <p className="mt-2 text-[20px] font-semibold tracking-tight text-ink tabular-nums">{row.value}</p>
          <p className="text-[12px] text-muted">{row.usd}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{row.note}</p>
        </div>
      ))}
    </div>
  );
}

function Calculator({ cycle }: { cycle: BillingCycle }) {
  const [callsText, setCallsText] = useState(String(DEFAULT_CALLS_PER_MONTH));
  const [minutesText, setMinutesText] = useState(String(DEFAULT_TALK_MINUTES));
  const calls = clampNumber(Math.round(Number(callsText)), 1, MAX_CALLS_PER_MONTH, 1);
  const minutes = clampNumber(Number(minutesText), 0.5, 60, 0.5);

  const quote = useMemo(() => quotePrice({ callsPerMonth: calls, talkMinutes: minutes, cycle }), [calls, minutes, cycle]);
  const annualSaving = useMemo(() => {
    const monthly = quotePrice({ callsPerMonth: calls, talkMinutes: minutes, cycle: "monthly" });
    const annual = quotePrice({ callsPerMonth: calls, talkMinutes: minutes, cycle: "annual" });
    return monthly.firstYearTzs - annual.firstYearTzs;
  }, [calls, minutes]);

  return (
    <section className="border border-line bg-white">
      <form
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="space-y-5 border-b border-line px-6 py-6 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-[15px] font-semibold text-ink">Estimate your bill</p>
            <p className="mt-1 text-[13px] text-muted">Two numbers. Nothing else changes the price.</p>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Scored calls per month
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_CALLS_PER_MONTH}
              step={1}
              value={callsText}
              onChange={(event) => setCallsText(event.target.value)}
              onBlur={() => setCallsText(String(calls))}
              className="field mt-1.5 tabular-nums"
            />
            <span className="mt-1 block text-[12px] text-muted">
              Only the calls you want scored — not every call the floor takes.
            </span>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Average talk time (minutes)
            </span>
            <input
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              inputMode="decimal"
              value={minutesText}
              onChange={(event) => setMinutesText(event.target.value)}
              onBlur={() => setMinutesText(String(minutes))}
              className="field mt-1.5 tabular-nums"
            />
            <span className="mt-1 block text-[12px] text-muted">
              Use talk time, not AHT. After-call work is not in the recording, so you do not pay for it.
            </span>
          </label>
        </div>

        <div className="bg-bg px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {cycle === "annual" ? "Per month, billed annually" : "Per month, billed monthly"}
          </p>
          <p className="mt-2 text-[36px] font-semibold leading-tight tracking-tight text-ink tabular-nums sm:text-[40px]">
            {formatTzs(quote.monthlyTzs)}
          </p>
          <p className="text-[14px] text-muted tabular-nums">
            {formatUsdFromTzs(quote.monthlyTzs)} / month · excludes 18% VAT
          </p>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Length band</dt>
              <dd className="text-right font-medium text-ink">{bandLabel(quote.band)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Price per call</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {formatTzs(quote.pricePerCallTzs)}{" "}
                <span className="font-normal text-muted">({formatUsdFromTzs(quote.pricePerCallTzs)})</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{cycle === "annual" ? "Yearly invoice" : "Monthly invoice"}</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {formatTzs(quote.invoiceTzs)}{" "}
                <span className="font-normal text-muted">({formatUsdFromTzs(quote.invoiceTzs)})</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Setup and calibration</dt>
              <dd className="text-right font-medium text-ink tabular-nums">
                {quote.setupTzs ? `${formatTzs(quote.setupTzs)} once` : "Free"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">VAT (18%) per month</dt>
              <dd className="text-right font-medium text-ink tabular-nums">{formatTzs(quote.vatPerMonthTzs)}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-2 text-[12px] leading-relaxed text-muted">
            {annualSaving > 0 ? (
              <p className="font-semibold text-good">
                {cycle === "annual"
                  ? `Saves ${formatTzs(annualSaving)} in the first year compared with monthly billing.`
                  : `Annual billing would save ${formatTzs(annualSaving)} in the first year.`}
              </p>
            ) : null}
            {quote.minimumApplied ? (
              <p>
                {quote.callsPerMonth.toLocaleString("en-US")} calls × {formatTzs(quote.pricePerCallTzs)} is{" "}
                {formatTzs(quote.usageTzs)}, so the {formatTzs(MONTHLY_MINIMUM_TZS)} monthly minimum applies.
              </p>
            ) : (
              <p>
                {quote.callsPerMonth.toLocaleString("en-US")} calls × {formatTzs(quote.pricePerCallTzs)} ={" "}
                {formatTzs(quote.usageTzs)} a month.
              </p>
            )}
            {quote.overLength ? (
              <p className="text-warn">
                Calls over {MAX_TALK_MINUTES} minutes are quoted separately. This shows the long-call price as a guide.
              </p>
            ) : null}
            {quote.largeVolume ? (
              <p>
                Over {LARGE_VOLUME_CALLS.toLocaleString("en-US")} calls a month we agree a lower rate in the contract.
                This uses the 30,001 – 100,000 price as a ceiling.
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a href={estimateEmail(quote)} className="btn btn-blue flex-1">
              Email us for a contract
            </a>
            <Link href={salesHref(calls, minutes, cycle)} className="btn btn-outline flex-1">
              Send estimate to sales
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <CycleToggle cycle={cycle} onChange={setCycle} />
        <p className="text-center text-[13px] text-muted">
          {cycle === "annual"
            ? `12-month contract, invoiced once a year. ${DISCOUNT_PERCENT}% off every call and no setup fee.`
            : "Invoiced each month for the calls we scored. One-time setup fee."}
        </p>
      </div>

      <PriceTable cycle={cycle} />
      <Charges cycle={cycle} />
      <Calculator cycle={cycle} />

      <p className="text-center text-[12px] leading-relaxed text-muted">
        All prices exclude 18% VAT. Invoices are in Tanzanian shillings. US dollar amounts are a guide
        only, at 1 USD = {TZS_PER_USD.toLocaleString("en-US")} TZS. Questions? Email{" "}
        <a href={salesMailto("Zetro — pricing question")} className="font-semibold text-blue hover:underline">
          {SALES_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
