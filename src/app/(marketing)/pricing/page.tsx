import Link from "next/link";
import { Metadata } from "next";
import { PricingQuote } from "@/components/pricing-quote";
import { BILLING_HONESTY, COACHING_CALLS_PER_AGENT_PER_DAY, WORKING_DAYS_PER_MONTH } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing | Zetro",
  description:
    "See what a Zetro coaching pack costs. Type daily calls, talk time, and how many agents are live.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
      <header className="text-center">
        <p className="page-kicker">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Price coaching, not every inbound call
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Type how many calls you take, how long they last, and how many agents are live. We score{" "}
          {COACHING_CALLS_PER_AGENT_PER_DAY} calls per agent each working day, across {WORKING_DAYS_PER_MONTH}{" "}
          days. That is the monthly estimate.
        </p>
      </header>

      <div className="mt-10">
        <PricingQuote />
      </div>

      <section className="mt-8 border border-line bg-white px-6 py-5">
        <h2 className="text-[15px] font-semibold text-ink">What you are paying for</h2>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted">
          <li>
            <span className="font-medium text-ink">A coaching pack. </span>
            Two scored calls per live agent per day. Human QA usually hears a handful per agent per
            month. This is daily proof for the huddle.
          </li>
          <li>
            <span className="font-medium text-ink">The work on each minute. </span>
            Turning speech into text, splitting speakers, and marking the call against your scorecard.
            The rate stays high enough to cover that work.
          </li>
          <li>
            <span className="font-medium text-ink">Notes coaches can use. </span>
            Scores, quotes, briefing, and a spreadsheet. Prices are in USD. VAT extra where it
            applies.
          </li>
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">{BILLING_HONESTY}</p>
      </section>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 border border-line bg-white px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[15px] font-semibold text-ink">Need every call scored?</p>
          <p className="mt-1 text-[13px] text-muted">
            That is a bigger invoice from the same minutes. Sales will quote it. The app does not
            charge your card.
          </p>
        </div>
        <Link href="/talk-sales" className="btn btn-blue shrink-0">
          Talk to sales
        </Link>
      </div>
    </div>
  );
}
