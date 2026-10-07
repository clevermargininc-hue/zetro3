"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import {
  ANNUAL_DISCOUNT,
  AUDIO_DAYS_INCLUDED,
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
    <div role="radiogroup" aria-label="Billing period" className="inline-flex border border-[#E3EBFB] bg-[#F3F6FD] p-1 rounded-none">
      {options.map((option) => {
        const active = option.id === cycle;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-none transition-colors ${
              active ? "bg-[#061C52] text-white shadow-xs" : "text-[#334155] hover:text-[#061C52]"
            }`}
          >
            {option.label}
            {option.id === "annual" ? (
              <span
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded-none ${
                  active ? "bg-[#04B6DA] text-white" : "bg-[#E3EBFB] text-[#061C52]"
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

function BillingOverview({ cycle }: { cycle: BillingCycle }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Monthly Contract */}
      <div
        className={`p-6 flex flex-col justify-between border rounded-none transition-all ${
          cycle === "monthly"
            ? "border-[#061C52] bg-white shadow-sm ring-1 ring-[#061C52]"
            : "border-[#E3EBFB] bg-white"
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">Monthly Option</span>
            {cycle === "monthly" ? (
              <span className="bg-[#F3F6FD] text-[#061C52] text-[10px] font-bold uppercase px-2 py-0.5 border border-[#E3EBFB]">
                Selected
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-xl font-bold text-[#061C52]">Billed Monthly</h3>
          <p className="mt-1 text-[13px] text-[#334155] leading-relaxed">
            Month-to-month contract. Ideal for operations scaling flexibly.
          </p>

          <dl className="mt-5 space-y-2.5 border-t border-[#E3EBFB] pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-[#334155]">Contract length</dt>
              <dd className="font-semibold text-[#061C52]">Month to month</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Invoice schedule</dt>
              <dd className="font-semibold text-[#061C52]">Each month, for calls scored</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Price per call</dt>
              <dd className="font-semibold text-[#061C52]">From 160 – 175 TZS (short)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Setup & calibration</dt>
              <dd className="font-semibold text-[#061C52]">100,000 TZS once</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Monthly minimum</dt>
              <dd className="font-semibold text-[#061C52]">500,000 TZS</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 pt-4 border-t border-[#E3EBFB]">
          <Link
            href="/signup"
            className="btn w-full border border-[#E3EBFB] bg-[#F3F6FD] hover:bg-[#E3EBFB] text-[#061C52] font-semibold"
          >
            Start 50 Free Trial Calls
          </Link>
        </div>
      </div>

      {/* Annual Contract - Highlighted */}
      <div
        className={`p-6 flex flex-col justify-between border rounded-none transition-all ${
          cycle === "annual"
            ? "border-[#04B6DA] bg-[#F3F6FD] shadow-md ring-2 ring-[#04B6DA]"
            : "border-[#E3EBFB] bg-white"
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">Annual Agreement</span>
            <span className="bg-[#04B6DA] text-white text-[10px] font-bold uppercase px-2 py-0.5">
              10% Off + Free Setup
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold text-[#061C52]">Billed Annually</h3>
          <p className="mt-1 text-[13px] text-[#334155] leading-relaxed">
            12-month commitment. Best value for committed contact centers and BPOs.
          </p>

          <dl className="mt-5 space-y-2.5 border-t border-[#E3EBFB] pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-[#334155]">Contract length</dt>
              <dd className="font-semibold text-[#061C52]">12 months</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Invoice schedule</dt>
              <dd className="font-semibold text-[#061C52]">Once a year (committed volume)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Price per call</dt>
              <dd className="font-semibold text-[#061C52]">
                10% off table <span className="text-[#04B6DA] font-bold">(from 144 – 158 TZS)</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Setup & calibration</dt>
              <dd className="font-bold text-[#15803D]">Waived (Free)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#334155]">Monthly minimum</dt>
              <dd className="font-semibold text-[#061C52]">500,000 TZS (not discounted)</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 pt-4 border-t border-[#E3EBFB]">
          <a
            href={salesMailto("Zetro — 12-month annual contract deal")}
            className="btn w-full bg-[#04B6DA] hover:bg-[#039EBE] text-white font-bold shadow-sm"
          >
            Email Sales for Annual Terms
          </a>
        </div>
      </div>
    </div>
  );
}

function PriceTable({ cycle }: { cycle: BillingCycle }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-[#E3EBFB] bg-white rounded-none">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E3EBFB] bg-[#F3F6FD]">
              <th scope="col" className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-[#061C52]">
                Scored calls per month
              </th>
              {LENGTH_BANDS.map((band) => (
                <th key={band.id} scope="col" className="px-5 py-4">
                  <span className="block text-[14px] font-bold text-[#061C52]">{band.label}</span>
                  <span className="block text-[12px] font-normal text-[#334155]">{band.range}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VOLUME_TIERS.map((tier) => (
              <tr key={tier.id} className="border-b border-[#E3EBFB] last:border-b-0 hover:bg-[#F3F6FD]/50 transition-colors">
                <th scope="row" className="px-5 py-4 text-[14px] font-semibold text-[#061C52]">
                  {tier.label}
                </th>
                {LENGTH_BANDS.map((band) => {
                  const price = pricePerCall(tier, band.id, cycle);
                  return (
                    <td key={band.id} className="px-5 py-4 tabular-nums">
                      <span className="block text-[16px] font-bold text-[#061C52]">{formatTzs(price)}</span>
                      <span className="block text-[12px] text-[#475569]">
                        {formatUsdFromTzs(price)}
                        {cycle === "annual" ? (
                          <span className="ml-1.5 line-through text-[#64748B]">{formatTzs(tier.prices[band.id])}</span>
                        ) : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-5 py-4 text-[14px] font-semibold text-[#061C52]">
                Over {LARGE_VOLUME_CALLS.toLocaleString("en-US")}
              </th>
              <td colSpan={LENGTH_BANDS.length} className="px-5 py-4 text-[13px] text-[#334155]">
                Priced in your contract.{" "}
                <a href={salesMailto("Zetro — large volume quote")} className="font-semibold text-[#061C52] underline hover:text-[#04B6DA]">
                  Email us
                </a>{" "}
                for a custom quote.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-[#475569] leading-relaxed">
        * Volume discounts are small on purpose. Our cost per call does not fall with volume: speech-to-text and AI providers charge the same per call, so large discounts would give away margin.
      </p>
    </div>
  );
}

function Charges({ cycle }: { cycle: BillingCycle }) {
  const rows = [
    {
      label: "Setup and calibration",
      value: cycle === "annual" ? "Waived" : `${formatTzs(SETUP_FEE_TZS)} once`,
      usd: cycle === "annual" ? "Free on 12-month contract" : formatUsdFromTzs(SETUP_FEE_TZS),
      note: "Loading your scorecard, compliance files and scripts; scoring 20 calls with your QA lead and adjusting until marks agree. Waived on a 12-month contract.",
    },
    {
      label: "Monthly minimum",
      value: formatTzs(MONTHLY_MINIMUM_TZS),
      usd: formatUsdFromTzs(MONTHLY_MINIMUM_TZS),
      note: "Covers support, hosting share, and small accounts. If the scored calls cost less than this in a month, the invoice is the minimum.",
    },
    {
      label: "Free trial",
      value: `${TRIAL_CALLS} calls`,
      usd: "One trial per company",
      note: "Scored on your company's own scorecard and playbook before you sign anything.",
    },
    {
      label: "Re-scoring a call",
      value: "Half price",
      usd: "50% of call rate",
      note: `For example, after you change your scorecard. ${AUDIO_DAYS_INCLUDED} days of audio storage are included (storage beyond 90 days quoted separately).`,
    },
  ];
  return (
    <div className="grid gap-px border border-[#E3EBFB] bg-[#E3EBFB] rounded-none overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="bg-white px-5 py-5">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#061C52]">{row.label}</p>
          <p className="mt-2 text-[20px] font-bold tracking-tight text-[#061C52] tabular-nums">{row.value}</p>
          <p className="text-[12px] text-[#475569]">{row.usd}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-[#334155]">{row.note}</p>
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
    <section className="border border-[#E3EBFB] bg-white rounded-none overflow-hidden shadow-xs">
      <form
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="space-y-5 border-b border-[#E3EBFB] px-6 py-6 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-[15px] font-bold text-[#061C52]">Estimate your monthly bill</p>
            <p className="mt-1 text-[13px] text-[#334155]">
              Bill = scored calls × price for length band. Nothing else changes the price.
            </p>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">
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
              className="field mt-1.5 tabular-nums bg-white border-[#E3EBFB] text-[#061C52]"
            />
            <span className="mt-1 block text-[12px] text-[#475569]">
              Only the calls you want scored — not every call the floor takes.
            </span>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">
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
              className="field mt-1.5 tabular-nums bg-white border-[#E3EBFB] text-[#061C52]"
            />
            <span className="mt-1 block text-[12px] text-[#475569]">
              Use average talk time, not AHT. AHT includes after-call work, which is not in the audio.
            </span>
          </label>
        </div>

        <div className="bg-[#F3F6FD] px-6 py-6 border-t border-[#E3EBFB] lg:border-t-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">
            {cycle === "annual" ? "Estimated monthly charge (Annual contract)" : "Estimated monthly charge (Monthly billing)"}
          </p>
          <p className="mt-2 text-[36px] font-bold leading-tight tracking-tight text-[#061C52] tabular-nums sm:text-[40px]">
            {formatTzs(quote.monthlyTzs)}
          </p>
          <p className="text-[14px] text-[#475569] tabular-nums">
            {formatUsdFromTzs(quote.monthlyTzs)} / month · excludes 18% VAT
          </p>

          <dl className="mt-5 space-y-2 border-t border-[#E3EBFB] pt-4 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-[#334155]">Length band</dt>
              <dd className="text-right font-semibold text-[#061C52]">{bandLabel(quote.band)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#334155]">Price per scored call</dt>
              <dd className="text-right font-bold text-[#061C52] tabular-nums">
                {formatTzs(quote.pricePerCallTzs)}{" "}
                <span className="font-normal text-[#475569]">({formatUsdFromTzs(quote.pricePerCallTzs)})</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#334155]">{cycle === "annual" ? "Yearly invoice" : "Monthly invoice"}</dt>
              <dd className="text-right font-semibold text-[#061C52] tabular-nums">
                {formatTzs(quote.invoiceTzs)}{" "}
                <span className="font-normal text-[#475569]">({formatUsdFromTzs(quote.invoiceTzs)})</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#334155]">Setup and calibration</dt>
              <dd className="text-right font-bold text-[#061C52] tabular-nums">
                {quote.setupTzs ? `${formatTzs(quote.setupTzs)} once` : "Waived (Free)"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#334155]">VAT (18%) per month</dt>
              <dd className="text-right font-semibold text-[#061C52] tabular-nums">{formatTzs(quote.vatPerMonthTzs)}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-2 text-[12px] leading-relaxed text-[#334155]">
            {annualSaving > 0 ? (
              <p className="font-semibold text-[#15803D]">
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
              <p className="text-[#B45309] font-medium">
                Calls over {MAX_TALK_MINUTES} minutes are quoted separately. This estimate uses the long-call band.
              </p>
            ) : null}
            {quote.largeVolume ? (
              <p>
                Over {LARGE_VOLUME_CALLS.toLocaleString("en-US")} calls a month we agree a custom rate in the contract.
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a href={estimateEmail(quote)} className="btn bg-[#04B6DA] hover:bg-[#039EBE] text-white font-bold flex-1 shadow-sm">
              Email us for a contract
            </a>
            <Link href={salesHref(calls, minutes, cycle)} className="btn border border-[#E3EBFB] bg-white text-[#061C52] hover:bg-[#F3F6FD] font-semibold flex-1">
              Send estimate to sales
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}

function WorkedExamples() {
  const examples = [
    {
      title: "Example 1 — Replacing human QA team",
      calls: "20,000 calls / month, ~4 min",
      formula: "20,000 × 165 TZS",
      total: "3,300,000 TZS / month",
      comparison: "Human QA team salaries: ~5,000,000 TZS",
      saving: "Saves ~1,700,000 TZS (34%). Real savings reach ~2,400,000 TZS (42%) when counting NSSF, SDL, WCF, desks & supervision.",
    },
    {
      title: "Example 2 — Small floor",
      calls: "5,000 calls / month, ~3 min",
      formula: "5,000 × 175 TZS",
      total: "875,000 TZS / month",
      comparison: "Covers 100% of floor calls",
      saving: "Audits entire operation for less than the cost of one junior QA analyst.",
    },
    {
      title: "Example 3 — Bank with longer calls",
      calls: "15,000 calls / month, ~7 min",
      formula: "15,000 × 265 TZS",
      total: "3,975,000 TZS / month",
      comparison: "Complex banking & regulatory compliance",
      saving: "100% automated regulatory & script adherence checks on medium-length calls.",
    },
    {
      title: "Example 4 — Large floor (~500 agents)",
      calls: "55,000 calls / month, ~3 min",
      formula: "55,000 × 160 TZS",
      total: "8,800,000 TZS / month",
      comparison: "5 audited calls per agent per day",
      saving: "Enterprise volume tier covering multi-shift contact centers at 160 TZS per call.",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-[#061C52]">Worked Examples (Excluding VAT)</h3>
        <p className="mt-1 text-[13px] text-[#334155]">
          Real-world scenarios showing monthly bills and savings compared to human QA staffing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {examples.map((item) => (
          <div key={item.title} className="border border-[#E3EBFB] bg-white p-5 rounded-none space-y-2.5">
            <h4 className="text-[14px] font-bold text-[#061C52]">{item.title}</h4>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E3EBFB] pb-2">
              <span className="text-[12px] text-[#475569]">{item.calls}</span>
              <span className="text-[16px] font-bold text-[#061C52] tabular-nums">{item.total}</span>
            </div>
            <p className="text-[12px] font-medium text-[#061C52]">{item.formula}</p>
            <p className="text-[12px] text-[#15803D] font-medium leading-relaxed">{item.saving}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OtherMarkets() {
  return (
    <div className="border border-[#E3EBFB] bg-[#F3F6FD] p-6 rounded-none space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[#061C52]">Other Markets (USD)</h3>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
          Kenya, BPOs & International
        </span>
      </div>
      <p className="text-[13px] text-[#334155] leading-relaxed">
        For Kenya, BPOs serving foreign clients, and customers outside East Africa. Same rules, volume levels, and charges. Prices exclude VAT or local sales tax:
      </p>

      <div className="grid gap-3 sm:grid-cols-4 pt-2">
        <div className="border border-[#E3EBFB] bg-white p-3 rounded-none">
          <p className="text-[11px] font-semibold text-[#475569]">Short (up to 5 min)</p>
          <p className="text-[18px] font-bold text-[#061C52] tabular-nums">$0.12</p>
          <p className="text-[11px] text-[#475569]">per scored call</p>
        </div>
        <div className="border border-[#E3EBFB] bg-white p-3 rounded-none">
          <p className="text-[11px] font-semibold text-[#475569]">Medium (5–10 min)</p>
          <p className="text-[18px] font-bold text-[#061C52] tabular-nums">$0.20</p>
          <p className="text-[11px] text-[#475569]">per scored call</p>
        </div>
        <div className="border border-[#E3EBFB] bg-white p-3 rounded-none">
          <p className="text-[11px] font-semibold text-[#475569]">Long (10–15 min)</p>
          <p className="text-[18px] font-bold text-[#061C52] tabular-nums">$0.30</p>
          <p className="text-[11px] text-[#475569]">per scored call</p>
        </div>
        <div className="border border-[#E3EBFB] bg-white p-3 rounded-none">
          <p className="text-[11px] font-semibold text-[#475569]">Setup & calibration</p>
          <p className="text-[18px] font-bold text-[#061C52] tabular-nums">$300 once</p>
          <p className="text-[11px] text-[#15803D] font-medium">Waived on 12 months</p>
        </div>
      </div>
    </div>
  );
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center gap-3">
        <CycleToggle cycle={cycle} onChange={setCycle} />
        <p className="text-center text-[13px] text-[#334155]">
          {cycle === "annual"
            ? `12-month contract, invoiced once a year. ${DISCOUNT_PERCENT}% off every call and 100,000 TZS setup fee is WAIVED.`
            : "Invoiced each month for the calls we scored. 100,000 TZS one-time setup fee."}
        </p>
      </div>

      {/* Contract comparison: Monthly vs Annual */}
      <BillingOverview cycle={cycle} />

      {/* Official per-call rate matrix */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#061C52]">Price Per Scored Call (Excluding VAT)</h3>
          <p className="mt-1 text-[13px] text-[#334155]">
            Unit of sale: one scored call, priced by that call&apos;s recorded audio length.
          </p>
        </div>
        <PriceTable cycle={cycle} />
      </div>

      {/* One-time and monthly fees */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[#061C52]">One-Time & Monthly Charges</h3>
          <p className="mt-1 text-[13px] text-[#334155]">
            Clear, transparent policies with no hidden licensing or per-seat penalties.
          </p>
        </div>
        <Charges cycle={cycle} />
      </div>

      {/* Interactive Bill Estimator */}
      <Calculator cycle={cycle} />

      {/* Worked Examples from Price List */}
      <WorkedExamples />

      {/* Other Markets / USD */}
      <OtherMarkets />

      <p className="text-center text-[12px] leading-relaxed text-[#475569]">
        All prices exclude 18% VAT. Invoices are in Tanzanian shillings. Sold in Tanzania only for now. Contracts, invoices, and deals go through{" "}
        <a href={salesMailto("Zetro — pricing question")} className="font-semibold text-[#061C52] underline hover:text-[#04B6DA]">
          {SALES_EMAIL}
        </a>
        . The website only shows estimates; there is no online checkout.
      </p>
    </div>
  );
}
