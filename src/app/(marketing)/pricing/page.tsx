import Link from "next/link";
import { Metadata } from "next";
import { PricingPlans } from "@/components/pricing-quote";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import { MAX_TALK_MINUTES, TRIAL_CALLS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing | Zetro",
  description:
    "Pay per scored call, in Tanzanian shillings (TZS). Price set by call length and monthly volume, billed monthly or annually. Sold in Tanzania only.",
};

const RULES = [
  {
    title: "1. Each call is billed by its own recorded length.",
    body: "Zetro measures the recording, so you never pay for wrap-up time that is not in the audio.",
  },
  {
    title: "2. The volume level is set by the monthly commitment in the contract.",
    body: "Calls above the commitment are billed at the same rate. (This stops 10,001 calls from costing less than 10,000.)",
  },
  {
    title: "3. Only scored calls are billed.",
    body: "Failed or unscored uploads are completely free.",
  },
  {
    title: `4. Calls over ${MAX_TALK_MINUTES} minutes are quoted separately.`,
    body: "Tell us if your floor has many long calls and we will price them with you.",
  },
  {
    title: `5. Free trial: ${TRIAL_CALLS} calls.`,
    body: "Scored on your company's own scorecard and compliance playbook, one trial per company.",
  },
  {
    title: "6. Invoices are monthly in TZS, payable within 30 days.",
    body: "Late invoices pause new scoring after 15 days' notice.",
  },
  {
    title: "7. Prices are reviewed every 6 months.",
    body: "Or sooner if the shilling moves more than 10% against the US dollar, or if an AI provider changes its prices.",
  },
  {
    title: "8. Volume discounts are small on purpose.",
    body: "Our cost per call does not fall with volume: speech-to-text and AI providers charge the same per call, so large discounts would give away margin.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#061C52]">Zetro Price List — Tanzania (TZS)</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-[#061C52] sm:text-5xl">
          Pay per scored call
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[#334155]">
          Unit of sale: <strong>one scored call</strong>, priced by that call&apos;s recorded audio length, with a small discount for monthly volume.
          All prices exclude VAT (18% VAT is added on the invoice). Sold in Tanzania only for now. Start with {TRIAL_CALLS} free calls on your own scorecard.
        </p>
      </header>

      <div className="mt-10">
        <PricingPlans />
      </div>

      <section className="mt-12 border border-[#E3EBFB] bg-white p-6 sm:p-8 rounded-none shadow-xs">
        <h2 className="text-[18px] font-bold text-[#061C52]">Pricing Rules &amp; Terms</h2>
        <ul className="mt-4 grid gap-x-10 gap-y-4 text-[14px] leading-relaxed text-[#334155] md:grid-cols-2">
          {RULES.map((rule) => (
            <li key={rule.title} className="space-y-0.5">
              <span className="font-bold text-[#061C52] block">{rule.title}</span>
              <span>{rule.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 flex flex-col gap-6 p-6 sm:p-8 sm:flex-row sm:items-center sm:justify-between bg-[#04B6DA] text-white border border-[#039EBE] rounded-none shadow-md">
        <div className="max-w-xl">
          <h2 className="text-[20px] font-bold text-white">Ready to sign, pay, or talk contract terms?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#E3EBFB]">
            There is no online checkout. Contracts, invoices, and sales deals go through{" "}
            <a href={salesMailto("Zetro — contract or sales deal")} className="font-bold text-white underline hover:opacity-90">
              {SALES_EMAIL}
            </a>
            . We send invoices in TZS with 30-day payment terms — the website only shows estimates and never charges your card.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a href={salesMailto("Zetro — contract or sales deal")} className="btn btn-lg bg-white text-[#061C52] hover:bg-[#F3F6FD] font-bold shadow-sm">
            Email sales ({SALES_EMAIL})
          </a>
          <Link href="/signup" className="text-[13px] font-semibold text-white hover:underline">
            Or start {TRIAL_CALLS} free trial calls →
          </Link>
        </div>
      </section>
    </div>
  );
}
