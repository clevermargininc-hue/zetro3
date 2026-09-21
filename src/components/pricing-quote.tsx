"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COACHING_CALLS_PER_AGENT_PER_DAY,
  DEFAULT_AHT_MINUTES,
  DEFAULT_AGENT_COUNT,
  DEFAULT_CALLS_PER_DAY,
  QUOTE_MINIMUM_USD,
  WORKING_DAYS_PER_MONTH,
  estimateLiveAgents,
  formatMinutes,
  formatUsd,
  formatUsdRate,
  quoteCallVolume,
} from "@/lib/billing";

function salesHref(calls: number, aht: number, agents: number) {
  const params = new URLSearchParams({
    calls: String(calls),
    aht: String(aht),
    agents: String(agents),
  });
  return `/talk-sales?${params.toString()}`;
}

export function PricingQuote() {
  const [calls, setCalls] = useState(DEFAULT_CALLS_PER_DAY);
  const [aht, setAht] = useState(DEFAULT_AHT_MINUTES);
  const [agents, setAgents] = useState(DEFAULT_AGENT_COUNT);
  const [agentsTouched, setAgentsTouched] = useState(false);

  function applyCalls(nextCalls: number) {
    setCalls(nextCalls);
    if (!agentsTouched) setAgents(estimateLiveAgents(nextCalls, aht));
  }

  function applyAht(nextAht: number) {
    setAht(nextAht);
    if (!agentsTouched) setAgents(estimateLiveAgents(calls, nextAht));
  }

  const quote = useMemo(
    () =>
      quoteCallVolume({
        callsPerDay: calls,
        ahtMinutes: aht,
        agents,
      }),
    [calls, aht, agents],
  );

  return (
    <section className="border border-line bg-white">
      <form className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-5 border-b border-line px-6 py-6 lg:border-b-0 lg:border-r">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Calls per day
            </span>
            <input
              type="number"
              min={1}
              max={500000}
              step={1}
              value={calls}
              onChange={(event) =>
                applyCalls(Math.min(500000, Math.max(1, Math.round(Number(event.target.value) || 1))))
              }
              className="field mt-1.5 tabular-nums"
            />
            <span className="mt-1 block text-[12px] text-muted">How many calls the floor takes in a day.</span>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Average handling time (minutes)
            </span>
            <input
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              value={aht}
              onChange={(event) =>
                applyAht(Math.min(60, Math.max(0.5, Number(event.target.value) || 0.5)))
              }
              className="field mt-1.5 tabular-nums"
            />
            <span className="mt-1 block text-[12px] text-muted">How long a typical call lasts. That is the audio we work on.</span>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Live agents
            </span>
            <input
              type="number"
              min={1}
              max={20000}
              step={1}
              value={agents}
              onChange={(event) => {
                setAgentsTouched(true);
                setAgents(Math.min(20000, Math.max(1, Math.round(Number(event.target.value) || 1))));
              }}
              className="field mt-1.5 tabular-nums"
            />
            <span className="mt-1 block text-[12px] text-muted">
              People on the headset. Talk time like this is about {quote.estimatedAgents.toLocaleString("en-US")}{" "}
              live agents.
            </span>
          </label>
        </div>

        <div className="bg-bg px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Coaching pack / month</p>
          <p className="mt-2 text-[40px] font-semibold tracking-tight text-ink tabular-nums">
            {formatUsd(quote.monthlyUsd)}
          </p>
          <p className="text-[13px] text-muted">
            USD / month · {COACHING_CALLS_PER_AGENT_PER_DAY} scored calls per agent per day · {WORKING_DAYS_PER_MONTH}{" "}
            working days
          </p>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Scored calls / day</dt>
              <dd className="tabular-nums font-medium text-ink">
                {Math.round(quote.scoredCallsPerDay).toLocaleString("en-US")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Audited minutes / month</dt>
              <dd className="tabular-nums font-medium text-ink">{formatMinutes(quote.auditedMinutes)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Rate per audited minute</dt>
              <dd className="tabular-nums font-medium text-ink">{formatUsdRate(quote.ratePerMinuteUsd)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            You are not buying a slice of every inbound call. We score{" "}
            {COACHING_CALLS_PER_AGENT_PER_DAY} conversations per live agent each working day — enough
            to brief the floor. You pay for those minutes: speech to text, who spoke, and a mark
            against your scorecard.
            {quote.cappedToFloor
              ? " On this mix, that already covers every call the floor takes."
              : ""}
            {quote.minimumApplied
              ? ` Small floors still quote ${formatUsd(QUOTE_MINIMUM_USD)} so the workspace is covered.`
              : ""}
          </p>

          <Link href={salesHref(calls, aht, agents)} className="btn btn-blue mt-5 w-full">
            Send this estimate to sales
          </Link>
        </div>
      </form>
    </section>
  );
}
