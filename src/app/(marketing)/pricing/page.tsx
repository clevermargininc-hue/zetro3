import Link from "next/link";
import { Metadata } from "next";
import { PricingPlans } from "@/components/pricing-quote";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import { MAX_TALK_MINUTES, TRIAL_CALLS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing | Zetro",
  description:
    "Pay per scored call, in Tanzanian shillings. Price set by call length and monthly volume, billed monthly or annually.",
};

const RULES = [
  {
    title: "Each call is billed by its own length.",
    body: "Zetro measures the recording, so you never pay for wrap-up time that is not in the audio.",
  },
  {
    title: "Only scored calls are billed.",
    body: "Failed or unscored uploads are free.",
  },
  {
    title: "Your volume level is set in the contract.",
    body: "You commit to a monthly number of calls. Calls above it are billed at the same rate.",
  },
  {
    title: `Calls over ${MAX_TALK_MINUTES} minutes are quoted separately.`,
    body: "Tell us if your floor has many long calls and we will price them with you.",
  },
  {
    title: "Invoices are in TZS, payable within 30 days.",
    body: "Prices are reviewed every 6 months, or sooner if the shilling moves more than 10% against the US dollar.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
      <header className="mx-auto max-w-3xl text-center">
        <p className="page-kicker">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Pay per scored call
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          One price per call, set by how long your calls are and how many you score each month. Prices
          are in Tanzanian shillings, with US dollars as a guide. Start with {TRIAL_CALLS} free calls on
          your own scorecard.
        </p>
      </header>

      <div className="mt-10">
        <PricingPlans />
      </div>

      <section className="frame mt-12 px-6 py-8 lg:px-8">
        <h2 className="text-[18px] font-semibold text-ink">How billing works</h2>
        <ul className="mt-4 grid gap-x-10 gap-y-4 text-[14px] leading-relaxed text-muted md:grid-cols-2">
          {RULES.map((rule) => (
            <li key={rule.title}>
              <span className="font-medium text-ink">{rule.title} </span>
              {rule.body}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 flex flex-col gap-6 rounded-xl border border-blue/15 bg-blue-soft px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-[20px] font-semibold text-ink">Ready to sign, pay, or talk terms?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            We do not take online payments yet. Email{" "}
            <a href={salesMailto("Zetro — contract or sales deal")} className="font-semibold text-blue hover:underline">
              {SALES_EMAIL}
            </a>{" "}
            for contracts, invoices, and sales deals. We send the invoice in TZS — the app never
            charges your card.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a href={salesMailto("Zetro — contract or sales deal")} className="btn btn-lg btn-blue">
            Email sales
          </a>
          <Link href="/signup" className="text-[13px] font-semibold text-blue hover:underline">
            Or start the free trial →
          </Link>
        </div>
      </section>
    </div>
  );
}
