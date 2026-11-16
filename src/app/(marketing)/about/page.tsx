import type { Metadata } from "next";
import Link from "next/link";
import { ZetroPublicCta } from "@/components/landing/zetro-public-chrome";
import { TRIAL_CALLS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "About Zetro | Quality Auditing & Customer Intelligence",
  description:
    "Zetro connects quality auditing with customer intelligence, built in Dar es Salaam for East African contact centers.",
};

const PILLARS = [
  {
    kicker: "The Sampling Reality",
    title: "Ending the 2% manual sampling trap",
    body: "Hand-auditing lets teams inspect only 1% to 2% of recordings. Risk goes unnoticed, great de-escalations go unrecognized, and coaching relies on chance instead of full floor truth.",
  },
  {
    kicker: "Linguistic Accuracy",
    title: "Two languages in one natural conversation",
    body: "Across East Africa, callers and agents shift smoothly between Kiswahili and English mid-sentence. Zetro was built from day one for bilingual East African speech rather than bolted-on translations.",
  },
  {
    kicker: "Customer Outcome Clarity",
    title: "A high QA score is only half the picture",
    body: "An agent can recite every script item while a billing outage or delayed ticket still brings the customer back three times. Zetro measures call adherence and repeat-customer resolution together.",
  },
] as const;

const STANDARDS = [
  {
    num: "01",
    title: "Standards Fidelity",
    body: "We apply your existing multi-sheet Excel, Word, or PDF QA rubric with exact section weights and Auto-Zero clauses.",
  },
  {
    num: "02",
    title: "Tenant Isolation & Security",
    body: "Recordings and transcripts are encrypted in transit and at rest, scoped strictly by tenant permissions, and never used to train public models.",
  },
  {
    num: "03",
    title: "Timestamped Evidence",
    body: "Every deduction, pass, or compliance flag links directly to the exact transcript turn and audio offset for transparent coaching.",
  },
  {
    num: "04",
    title: "Honest Root-Cause Attribution",
    body: "When audio lacks proof of why a customer called back, Zetro surfaces insufficient evidence cleanly rather than guessing.",
  },
] as const;

export default function AboutPage() {
  return (
    <div>
      {/* ── Subpage Hero ──────────────────────────────────────────────── */}
      <section className="z-subhero" aria-labelledby="about-heading">
        <div className="z-container">
          <span className="z-eyebrow">About Zetro · Dar es Salaam, Tanzania</span>
          <h1 id="about-heading" className="z-subhero-h1">
            Built in East Africa for{" "}
            <span className="z-h1-accent">high-trust contact centers.</span>
          </h1>
          <p className="z-subhero-lead">
            Developed by Clevermargins Software Business Solutions (CSBS), Zetro bridges bilingual call auditing and repeat-customer intelligence—built to give QA managers, compliance officers, and executives evidence they can stand behind.
          </p>
          <div className="z-subhero-actions">
            <Link href="/signup" className="z-btn z-btn-solid" style={{ height: "44px", paddingInline: "20px" }}>
              Start {TRIAL_CALLS}-call free trial
            </Link>
            <Link href="/talk-sales" className="z-btn z-btn-outline" style={{ height: "44px", paddingInline: "20px" }}>
              Contact our team →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mission Pillars ───────────────────────────────────────────── */}
      <section className="z-section" aria-labelledby="mission-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">Why Zetro exists</span>
            <h2 id="mission-heading" className="z-h2">
              Fairer coaching for agents. Faster clarity for leaders.
            </h2>
          </div>

          <div className="z-subgrid-3">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="z-card" style={{ padding: "28px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--z-blue-ink)" }}>
                  {pillar.kicker}
                </span>
                <h3 className="z-h3" style={{ marginTop: "10px", fontSize: "20px" }}>
                  {pillar.title}
                </h3>
                <p className="z-body" style={{ marginTop: "10px" }}>
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security & Engineering Principles (#security) ──────────────── */}
      <section id="security" className="z-section z-band-alt" aria-labelledby="security-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">Trust &amp; Governance</span>
            <h2 id="security-heading" className="z-h2">
              Four commitments baked into our platform.
            </h2>
            <p className="z-lead">
              Enterprise audio, PII, and QA governance designed for banks, mobile-money operators, hospitals, insurers, and public agencies.
            </p>
          </div>

          <div className="z-subgrid-4">
            {STANDARDS.map((item) => (
              <article key={item.num} className="z-card" style={{ padding: "24px" }}>
                <span
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: "34px",
                    height: "34px",
                    borderRadius: "9px",
                    background: "var(--z-tint)",
                    color: "var(--z-blue-ink)",
                    fontFamily: "var(--z-display)",
                    fontWeight: 700,
                    fontSize: "13px",
                  }}
                >
                  {item.num}
                </span>
                <h3 className="z-h3" style={{ marginTop: "16px" }}>
                  {item.title}
                </h3>
                <p className="z-body" style={{ marginTop: "8px", fontSize: "14px" }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          <div style={{ marginTop: "40px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            <Link href="/solutions#banks" className="z-btn z-btn-outline">
              Explore sectors we serve →
            </Link>
            <Link href="/pricing#calculator" className="z-btn z-btn-solid">
              View TZS pricing calculator →
            </Link>
          </div>
        </div>
      </section>

      <ZetroPublicCta
        eyebrow="Work with us"
        title="Ready to see quality and repeat-caller intelligence together?"
        body={`Start with ${TRIAL_CALLS} free recordings on your actual company scorecard or book a live session with our Dar es Salaam team.`}
      />
    </div>
  );
}
