"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ANNUAL_DISCOUNT,
  DEFAULT_CALLS_PER_MONTH,
  DEFAULT_TALK_MINUTES,
  formatTzs,
  formatUsdFromTzs,
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
        <div className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 p-1.5 shadow-xs backdrop-blur-md">
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${
              cycle === "annual"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <span>Annual contract</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Save {Math.round(ANNUAL_DISCOUNT * 100)}%
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 ${
              cycle === "monthly"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Monthly billing
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl grid lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Interactive Estimator Controls */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-black/[0.06] bg-white p-8 sm:p-10 shadow-xl shadow-indigo-500/5">
          <div>
            <h3 className="font-sans text-2xl font-normal text-[#0f172a] mb-2">
              Estimate your monthly volume
            </h3>
            <p className="text-[14px] text-neutral-500 mb-8">
              Adjust your average monthly call volume and recording length below.
            </p>

            {/* Slider 1: Monthly Calls */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between">
                <label htmlFor="calls-slider" className="text-sm font-medium text-[#0f172a]">
                  Monthly Calls Audited
                </label>
                <span className="font-mono text-base font-semibold text-blue">
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
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                <span>2,000 calls</span>
                <span>50,000 calls</span>
                <span>100,000 calls</span>
              </div>
            </div>

            {/* Slider 2: Average Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="minutes-slider" className="text-sm font-medium text-[#0f172a]">
                  Average Talk Minutes per Call
                </label>
                <span className="font-mono text-base font-semibold text-blue">
                  {minutes} min ({quote.band} band)
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
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                <span>Short (≤ 5m)</span>
                <span>Medium (5–10m)</span>
                <span>Long (10–15m)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-black/[0.05] flex items-center justify-between text-xs text-neutral-500">
            <span>Price per scored call:</span>
            <span className="font-mono font-semibold text-[#0f172a]">
              {formatTzs(quote.pricePerCallTzs)} / call
            </span>
          </div>
        </div>

        {/* Right Column: Pricing Summary Card */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-black/[0.08] bg-[#0c0d12] p-8 sm:p-10 text-white shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400">
                Commercial Estimate
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                {TRIAL_CALLS} Free Calls Included
              </span>
            </div>

            <div className="mt-6">
              <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
                {formatTzs(quote.monthlyTzs)}
              </span>
              <span className="text-neutral-400 text-sm ml-2">/ month</span>
            </div>

            <p className="mt-2 text-xs text-neutral-400">
              Approx. {formatUsdFromTzs(quote.monthlyTzs)} USD / month (excl. VAT)
            </p>

            <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm text-neutral-300">
              <div className="flex justify-between">
                <span>Rate Tier:</span>
                <span className="font-mono text-white">{quote.tier.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Billing Period:</span>
                <span className="text-white capitalize">{quote.cycle}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed or Unscored:</span>
                <span className="text-emerald-400 font-medium">Free (Zero TZS)</span>
              </div>
              <div className="flex justify-between">
                <span>Setup Fee:</span>
                <span className="text-white">{quote.setupTzs === 0 ? "Free (Waived on Annual)" : formatTzs(quote.setupTzs)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
            <Link
              href={`/talk-sales?calls=${calls}&minutes=${minutes}&billing=${cycle}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-center text-sm font-semibold text-black transition-all hover:bg-neutral-200 active:scale-[0.98]"
            >
              <span>Request official contract</span>
              <span>→</span>
            </Link>
            <p className="text-[11px] text-center text-neutral-400">
              No online card checkout. Invoices are issued in TZS with 30-day payment terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
