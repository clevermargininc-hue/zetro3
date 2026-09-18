import Link from "next/link";
import { Metadata } from "next";
import { PricingQuote } from "@/components/pricing-quote";
import {
  BILLING_HONESTY,
  COMMERCIAL_PLANS,
  LIST_PLANS,
  WORKED_EXAMPLES,
  formatMinutes,
  formatUsd,
  quoteVolume,
} from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing | Zetro",
  description:
    "Zetro charges for audited minutes — prepare plus documents score — not an unlimited $99 seat. Sampling, Coverage, and Floor quotes from your call volume.",
};

function Check() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  const examples = WORKED_EXAMPLES.map((example) => ({
    ...example,
    quote: quoteVolume({
      agents: example.agents,
      talkHoursPerDay: example.talkHoursPerDay,
      auditPercent: example.auditPercent,
    }),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="page-kicker">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Pay for audited minutes, not a fake unlimited seat
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          An audited minute is prepare (speakers + transcript) plus a documents score against your
          scorecard. Sampling a slice is a few hundred dollars. Scoring every call on a 20-agent floor
          is a volume contract.
        </p>
      </header>

      <div className="mt-12 grid border border-line bg-white lg:grid-cols-3">
        {LIST_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col border-b border-line p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 ${
              plan.featured ? "bg-blue-soft ring-2 ring-inset ring-blue" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[16px] font-semibold text-ink">{plan.name}</h2>
              {plan.featured ? <span className="chip chip-ok">Most queues</span> : null}
            </div>
            <p className="mt-2 min-h-[40px] text-[13px] leading-relaxed text-muted">{plan.blurb}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-[32px] font-semibold tracking-tight text-ink">{plan.priceLabel}</span>
              <span className="text-[13px] text-muted">{plan.periodLabel}</span>
            </p>
            <p className="mt-1 text-[12px] text-muted">
              {formatMinutes(plan.includedAuditedMinutes)} audited included
              {plan.agentCap ? ` · ${plan.agentCap} agents` : ""}
            </p>
            <Link href={plan.ctaHref} className={`btn mt-5 w-full ${plan.featured ? "btn-blue" : "btn-ghost"}`}>
              {plan.ctaLabel}
            </Link>
            <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
              {plan.features.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="mt-10 border border-line bg-white p-6 sm:flex sm:items-start sm:justify-between sm:gap-8">
        <div className="max-w-xl">
          <p className="page-kicker">Floor</p>
          <h2 className="mt-2 font-display text-[22px] font-semibold text-ink">{COMMERCIAL_PLANS.floor.name}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{COMMERCIAL_PLANS.floor.blurb}</p>
          <ul className="mt-4 space-y-2">
            {COMMERCIAL_PLANS.floor.features.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink">
                <Check />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 shrink-0 sm:mt-0 sm:text-right">
          <p className="text-[32px] font-semibold tracking-tight text-ink">{COMMERCIAL_PLANS.floor.priceLabel}</p>
          <p className="text-[13px] text-muted">{COMMERCIAL_PLANS.floor.periodLabel}</p>
          <Link href={COMMERCIAL_PLANS.floor.ctaHref} className="btn btn-blue mt-5">
            {COMMERCIAL_PLANS.floor.ctaLabel}
          </Link>
        </div>
      </section>

      <PricingQuote />

      <section className="mt-10 border border-line bg-white">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Worked examples</h2>
          <p className="mt-1 text-[13px] text-muted">
            Same 5 talk-hours per agent, 22 working days. The bill changes with how much audio you actually
            score.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Floor</th>
                <th className="text-right">Talk / month</th>
                <th className="text-right">Audited</th>
                <th>Best fit</th>
                <th className="text-right">Est. monthly</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((example) => (
                <tr key={example.id}>
                  <td>
                    <p className="font-medium text-ink">{example.title}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{example.detail}</p>
                  </td>
                  <td className="text-right tabular-nums text-ink">{formatMinutes(example.quote.talkMinutes)}</td>
                  <td className="text-right tabular-nums text-ink">{formatMinutes(example.quote.auditedMinutes)}</td>
                  <td className="font-medium text-ink">{example.quote.recommended.plan.name}</td>
                  <td className="text-right tabular-nums font-medium text-ink">
                    {formatUsd(example.quote.recommended.totalUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          [
            "Audited minute",
            "Prepare + documents score on that audio. That is the expensive unit (speech-to-text and the GPT scorecard pass). Plans include a bucket of it.",
          ],
          [
            "Prepare-only",
            "Transcript and speakers, no score. Use it when you need the script without burning an audit. Overage is listed on Sampling, Coverage, and Floor.",
          ],
          [
            "USD list, local invoice",
            "Prices are USD. Paid workspaces can be invoiced in USD, TZS, or KES. VAT extra where it applies. Solo vs Team in the app is who can log in, not this bill.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="bg-white px-6 py-5">
            <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 border border-line bg-white px-6 py-5">
        <h2 className="text-[15px] font-semibold text-ink">How we sell this</h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{BILLING_HONESTY}</p>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">
          Trial is 120 audited minutes and 3 agents. After that, sales turns on the Sampling, Coverage, or
          Floor terms above — including the included bucket and overage rates. We do not run an unmetered
          $99 “unlimited QA” plan; that price cannot cover bilingual transcription plus a documents audit.
        </p>
      </section>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border border-line bg-white px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[15px] font-semibold text-ink">Send volume, get a quote</p>
          <p className="mt-1 text-[13px] text-muted">
            Agents, talk hours, and how much you want scored. We map that to a plan and an invoice currency.
          </p>
        </div>
        <Link href="/talk-sales?plan=coverage" className="btn btn-blue shrink-0">
          Talk to sales
        </Link>
      </div>
    </div>
  );
}
