"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ANNUAL_DISCOUNT,
  DEFAULT_CALLS_PER_MONTH,
  DEFAULT_TALK_MINUTES,
  formatTzs,
  formatUsdFromTzs,
  bandLabel,
  quotePrice,
  TRIAL_CALLS,
  type BillingCycle,
} from "@/lib/billing";

export function LandingPricingCalculator() {
  const [calls, setCalls] = useState(DEFAULT_CALLS_PER_MONTH);
  const [minutes, setMinutes] = useState(DEFAULT_TALK_MINUTES);
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  const quote = useMemo(() => {
    return quotePrice({
      callsPerMonth: calls,
      talkMinutes: minutes,
      cycle,
    });
  }, [calls, minutes, cycle]);

  return (
    <div className="w-full">
      {/* Annual / Monthly Toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 p-1.5">
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 flex items-center gap-2 ${
              cycle === "annual"
                ? "bg-blue text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>Annual contract</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                cycle === "annual"
                  ? "bg-white text-blue"
                  : "bg-teal-soft text-teal"
              }`}
            >
              Save {Math.round(ANNUAL_DISCOUNT * 100)}%
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
              cycle === "monthly"
                ? "bg-blue text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Monthly billing
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl grid lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Interactive Estimator Controls */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-line bg-white p-8 sm:p-10 shadow-xs">
          <div>
            <h3 className="text-xl font-bold text-navy mb-1.5">
              Estimate your monthly volume
            </h3>
            <p className="text-sm text-muted mb-8">
              Quick single-duration preview. Use the full pricing page for a mixed-duration estimate.
            </p>

            {/* Slider 1: Monthly Calls */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between">
                <label htmlFor="calls-slider" className="text-sm font-semibold text-ink">
                  Monthly Calls Audited
                </label>
                <span className="font-mono text-base font-bold text-blue tabular-nums">
                  {calls.toLocaleString()} calls
                </span>
              </div>
              <input
                id="calls-slider"
                type="range"
                min="2000"
                max="100000"
                step="2000"
                value={calls}
                onChange={(e) => setCalls(Number(e.target.value))}
                className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-blue"
              />
              <div className="flex justify-between text-muted font-mono text-[11px]">
                <span>2,000 calls</span>
                <span>50,000 calls</span>
                <span>100,000 calls</span>
              </div>
            </div>

            {/* Slider 2: Average Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="minutes-slider" className="text-sm font-semibold text-ink">
                  Average Talk Minutes per Call
                </label>
                <span className="font-mono text-base font-bold text-blue tabular-nums">
                  {minutes} min · {bandLabel(quote.band)}
                </span>
              </div>
              <input
                id="minutes-slider"
                type="range"
                min="1"
                max="15"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-blue"
              />
              <div className="flex justify-between text-muted font-mono text-[11px]">
                <span>0–3m</span>
                <span>6–9m</span>
                <span>12–15m</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-line flex items-center justify-between text-xs font-medium text-muted">
            <span>Price per scored call:</span>
            <span className="font-mono font-bold text-ink tabular-nums">
              {formatTzs(quote.pricePerCallTzs)} / call
            </span>
          </div>
        </div>

        {/* Right Column: Pricing Summary Card */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-line bg-surface-2 p-8 sm:p-10 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                Commercial Estimate
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft border border-[#99F6E4] px-2.5 py-0.5 text-[11px] font-semibold text-teal">
                {TRIAL_CALLS} Free Calls Included
              </span>
            </div>

            <div className="mt-6">
              <span className="font-sans text-4xl sm:text-5xl font-bold tracking-tight text-navy tabular-nums">
                {formatTzs(quote.monthlyTzs)}
              </span>
              <span className="text-muted font-medium text-sm ml-2">/ month</span>
            </div>

            <p className="mt-2 text-xs text-muted font-mono">
              Approx. {formatUsdFromTzs(quote.monthlyTzs)} USD / month (excl. VAT)
            </p>

            <div className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Rate Tier:</span>
                <span className="font-mono font-semibold text-ink">{quote.tier.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Billing Period:</span>
                <span className="text-ink font-semibold capitalize">{quote.cycle}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed or Unscored:</span>
                <span className="text-green font-semibold">Free (Zero TZS)</span>
              </div>
              <div className="flex justify-between">
                <span>Setup Fee:</span>
                <span className="text-ink font-semibold">
                  {quote.setupTzs === 0 ? "Free (Waived on Annual)" : formatTzs(quote.setupTzs)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-line space-y-3">
            <Link
              href={`/talk-sales?calls=${calls}&minutes=${minutes}&billing=${cycle}`}
              className="btn-blue w-full rounded-lg px-6 py-3.5 text-center text-[14px]"
            >
              <span>Request official contract</span>
              <span>→</span>
            </Link>
            <p className="text-[11px] text-center text-muted">
              No online card checkout. Invoices are issued in TZS with 30-day payment terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
