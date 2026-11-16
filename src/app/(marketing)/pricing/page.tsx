import type { Metadata } from "next";
import Link from "next/link";
import { ZetroPublicCta } from "@/components/landing/zetro-public-chrome";
import { PricingPlans } from "@/components/pricing-quote";
import { MAX_TALK_MINUTES, TRIAL_CALLS } from "@/lib/billing";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Pricing & TZS Calculator | Zetro Quality Auditing & Customer Intelligence",
  description:
    "Transparent TZS pricing for calls analysed across quality auditing and customer intelligence, based on call length and monthly volume.",
};

const RULES = [
  {
    title: "Each call is billed by its own audio length.",
    body: "Zetro measures the audio file duration precisely. You never pay for wrap-up time or after-call work (ACW) that is not in the recording.",
  },
  {
    title: "Only successfully analysed calls are billed.",
    body: "Corrupted audio files or failed analyses are never charged. One physical recording audited more than once remains one customer contact in intelligence.",
  },
  {
    title: "Your volume tier is defined in the agreement.",
    body: "You commit to a predictable monthly call volume. Additional calls within the billing cycle are invoiced at the same agreed unit rate.",
  },
  {
    title: `Calls over ${MAX_TALK_MINUTES} minutes are quoted separately.`,
    body: "If your contact center handles extensive escalations or dispute calls exceeding 15 minutes, we create a custom rate card with you.",
  },
  {
    title: "The monthly minimum is a billing floor.",
    body: "Zetro compares scored-call usage with TZS 500,000 and bills whichever is higher. It is not added on top of usage.",
  },
  {
    title: "Free trial on your actual company scorecard.",
    body: `Each company can score ${TRIAL_CALLS} trial calls using its own scorecard before signing a paid contract.`,
  },
  {
    title: "Annual commitments are invoiced upfront.",
    body: "Each committed month is evaluated against the monthly minimum, then the 12 months are summed. Overage is invoiced monthly at the annual contracted rate.",
  },
  {
    title: "Duration boundaries use exact recording seconds.",
    body: "Exactly 3:00 stays in the first band; 3:01 enters the second. The same rule applies at 6, 9, 12 and 15 minutes.",
  },
] as const;

export default function PricingPage() {
  return (
    <div>
      {/* ── Subpage Hero ──────────────────────────────────────────────── */}
      <section className="z-subhero" aria-labelledby="pricing-page-heading">
        <div className="z-container">
          <span className="z-eyebrow">Tanzania tariff &amp; calculator · TZS</span>
          <h1 id="pricing-page-heading" className="z-subhero-h1">
            Transparent TZS pricing.{" "}
            <span className="z-h1-accent">Start with {TRIAL_CALLS} free calls.</span>
          </h1>
          <p className="z-subhero-lead">
            Pay only per successfully audited call based on exact recording duration and contracted monthly volume, with a 10% discount on annual commitments.
          </p>
          <div className="z-subhero-actions">
            <a
              href="#calculator"
              className="z-btn z-btn-solid"
              style={{ height: "44px", paddingInline: "20px" }}
            >
              Jump to TZS calculator ↓
            </a>
            <Link
              href="/signup"
              className="z-btn z-btn-outline"
              style={{ height: "44px", paddingInline: "20px" }}
            >
              Start {TRIAL_CALLS}-call free trial
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tariff Table & Interactive TZS Calculator (#plans / #calculator) */}
      <section id="plans" className="z-section" aria-label="Tariff schedule and estimator">
        <div className="z-container">
          <PricingPlans />
        </div>
      </section>

      {/* ── Contract Principles & Billing Rules (#terms) ──────────────── */}
      <section id="terms" className="z-section z-band-alt" aria-labelledby="terms-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">Contract terms</span>
            <h2 id="terms-heading" className="z-h2">
              How billing works in practice.
            </h2>
            <p className="z-lead">
              Clear rules written for finance directors and operations teams—invoiced in TZS with standard 30-day payment terms ({SALES_EMAIL}).
            </p>
          </div>

          <ul className="z-subgrid-2">
            {RULES.map((rule) => (
              <li key={rule.title} className="z-card" style={{ padding: "24px" }}>
                <h3 className="z-h3" style={{ fontSize: "16px" }}>
                  {rule.title}
                </h3>
                <p className="z-body" style={{ marginTop: "8px", fontSize: "14px" }}>
                  {rule.body}
                </p>
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: "36px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <Link href="/talk-sales" className="z-btn z-btn-solid">
              Request an official quote →
            </Link>
            <a
              href={salesMailto("Zetro — contract or sales deal")}
              className="z-btn z-btn-outline"
            >
              Email {SALES_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <ZetroPublicCta
        eyebrow="Enterprise agreements"
        title="Ready to score your first calls on your own rubric?"
        body={`Every workspace starts with ${TRIAL_CALLS} free audited calls—no credit card required.`}
        secondaryHref="/talk-sales"
        secondaryLabel="Or request a custom contract in TZS →"
      />
    </div>
  );
}
