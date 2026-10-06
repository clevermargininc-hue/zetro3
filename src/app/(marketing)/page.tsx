import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroProductPreview } from "@/components/hero-product-preview";
import { FaqAccordion } from "@/components/faq-accordion";

const STATS = [
  { label: "Call coverage", value: "100%", hint: "Audit every conversation, not a 2% sample" },
  { label: "Audit turnaround", value: "< 60s", hint: "From upload to full weighted scorecard" },
  { label: "Languages", value: "Bilingual", hint: "Native English & Kiswahili code-switching" },
  { label: "Standards fidelity", value: "100%", hint: "All scorecard categories, weights & rules" },
];

const COMPARISON_ROWS = [
  {
    feature: "Floor Coverage Rate",
    manual: "1% – 3% random sampling",
    zetro: "100% of all calls audited",
    highlight: true,
  },
  {
    feature: "Scorecard Adherence",
    manual: "Subjective & prone to auditor fatigue",
    zetro: "Strictly bound to your uploaded document weights",
    highlight: false,
  },
  {
    feature: "Turnaround Time",
    manual: "48 – 72 hours coaching lag",
    zetro: "Under 60 seconds after call completion",
    highlight: true,
  },
  {
    feature: "Code-Switching (SWA + ENG)",
    manual: "Translators needed, context often lost",
    zetro: "Native dual-language transcript & sentiment",
    highlight: false,
  },
  {
    feature: "Compliance Risk Alerts",
    manual: "98% of violations go unspotted",
    zetro: "Instant auto-zero trigger with audio proof",
    highlight: true,
  },
  {
    feature: "Coaching Evidence",
    manual: "Vague recollections from memory",
    zetro: "Exact timestamped quotes from call audio",
    highlight: false,
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Upload & Ingest",
    desc: "Drop in call recordings (.mp3, .wav, .m4a) or stream from your contact center telephony.",
  },
  {
    step: "02",
    title: "Extract Company Rules",
    desc: "Zetro reads your uploaded Excel, Word, or PDF scorecards with complete weight percentages.",
  },
  {
    step: "03",
    title: "Audit & Coach",
    desc: "Receive comprehensive scores, auto-zero flags, and timestamped quotes ready for the huddle.",
  },
];

export default async function HomePage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return (
    <>
      {/* Hero Section */}
      <section className="hero-mesh border-b border-line">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-6 pb-14 pt-12 xl:grid-cols-2 xl:items-center xl:gap-16 xl:px-8 xl:pb-20 xl:pt-16">
          <div className="min-w-0">
            <div className="inline-flex flex-wrap items-center gap-2 border border-line bg-white px-3 py-1 text-xs font-semibold text-muted">
              <span className="h-2 w-2 rounded-full bg-blue" />
              <span className="text-ink">Contact center QA</span>
              <span className="text-line">|</span>
              <span>English &amp; Kiswahili</span>
            </div>

            <h1 className="mt-5 max-w-xl font-display text-[2.15rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              Every conversation, scored against your scorecard.
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted sm:text-[16px]">
              Stop sampling 2% of the floor. Upload the scorecard you already use. Zetro scores every
              call with your weights, rules, and timestamped quotes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={signedIn ? "/dashboard" : "/signup"}
                className="btn btn-lg btn-blue px-6 text-center font-semibold"
              >
                {signedIn ? "Open workspace" : "Audit your first call free"}
              </Link>
              <Link href="/how-it-works" className="btn btn-lg btn-outline px-6 text-center">
                See how it works
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-good">✓</span>
                Excel, PDF, or Word
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-good">✓</span>
                English and Kiswahili
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-good">✓</span>
                5 free calls
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <HeroProductPreview />
          </div>
        </div>
      </section>

      {/* Stats Proof Bar (Using exact Charges card grid design from Pricing page) */}
      <section className="border-b border-line bg-bg py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-white px-6 py-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {stat.label}
                </p>
                <p className="mt-2 text-[28px] font-semibold tracking-tight text-ink tabular-nums sm:text-[32px]">
                  {stat.value}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Sections */}
      <section id="features" className="band-story">
        <div className="band-story-stack mx-auto max-w-7xl px-6 lg:px-8">
          {/* Feature 1: Scorecards */}
          <div className="split">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">
                Your Exact Standards
              </p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Upload your scorecard. Zetro preserves your exact weights.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
                No rigid templates or generic AI rubrics. Whether your company uses a complex Excel
                workbook with merged sub-criteria or a Word compliance policy, Zetro extracts every single
                row, weight percentage, and zero-tolerance clause without character truncation.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-ink">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-bold text-good">✓</span>
                  <span>Multi-sheet Excel spreadsheets with custom weights (e.g., 25%, 30%)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-bold text-good">✓</span>
                  <span>Critical compliance guidelines &amp; Auto-Zero rules</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-bold text-good">✓</span>
                  <span>Standard greetings, hold time policies, and mandatory disclaimers</span>
                </li>
              </ul>
            </div>

            {/* Feature Card 1 (Pricing Card Style) */}
            <div className="split-media">
              <div className="w-full max-w-md border border-line bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-line bg-bg px-5 py-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Scorecard_Floor_2026.xlsx
                  </span>
                  <span className="chip chip-ok font-semibold">100% Extracted</span>
                </div>

                <div className="divide-y divide-line">
                  <div className="p-4 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">Mandatory Identification</span>
                      <span className="font-mono text-[12px] font-bold text-blue">25% weight</span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">Customer national ID and OTP verified</p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-muted">Floor Score:</span>
                      <span className="font-semibold text-good">5.0 / 5.0 (Passed)</span>
                    </div>
                  </div>

                  <div className="p-4 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">Regulatory Disclosure</span>
                      <span className="font-mono text-[12px] font-bold text-blue">30% weight</span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">Terms of interest and repayment date cited</p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-muted">Auto-Zero Status:</span>
                      <span className="font-semibold text-good">Safe (No breaches)</span>
                    </div>
                  </div>

                  <div className="p-4 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">Empathy &amp; Resolution</span>
                      <span className="font-mono text-[12px] font-bold text-blue">45% weight</span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">Active listening and clear next steps</p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-muted">Floor Score:</span>
                      <span className="font-semibold text-good">4.6 / 5.0</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-line bg-bg px-5 py-2.5 text-[11px] text-muted">
                  Strictly follows company weight distribution
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Bilingual Intelligence */}
          <div className="split split-rev">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">
                Dual Language Support
              </p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                English and Kiswahili. Native code-switching on live calls.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
                Agents and customers across East Africa fluidly mix English and Kiswahili in the same
                sentence. Generic speech tools stumble or lose compliance context when the dialect shifts.
                Zetro understands both simultaneously.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                <span className="border border-line bg-white px-2.5 py-1 text-ink font-medium">
                  Swahili Customer Dialects
                </span>
                <span className="border border-line bg-white px-2.5 py-1 text-ink font-medium">
                  English Regulatory Scripts
                </span>
                <span className="border border-line bg-white px-2.5 py-1 text-ink font-medium">
                  Sheng &amp; Colloquial Phrases
                </span>
              </div>
            </div>

            {/* Feature Card 2 (Pricing Card Style) */}
            <div className="split-media">
              <div className="w-full max-w-md border border-line bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-line bg-bg px-5 py-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Audio Diarization Stream
                  </span>
                  <span className="chip">Code-Switching Active</span>
                </div>

                <div className="divide-y divide-line text-[13px]">
                  {/* Customer utterance */}
                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                      <span className="font-semibold text-ink">Customer (Kiswahili)</span>
                      <span className="font-mono text-muted tabular-nums">00:18</span>
                    </div>
                    <p className="text-ink font-medium">
                      &ldquo;Habari, nimejaribu kutuma muamala lakini nimekatwa mara mbili bila kupata huduma.&rdquo;
                    </p>
                  </div>

                  {/* Agent utterance */}
                  <div className="p-4 bg-blue-soft/30">
                    <div className="flex items-center justify-between text-[11px] text-blue mb-1">
                      <span className="font-semibold text-blue">Agent (Bilingual)</span>
                      <span className="font-mono text-blue tabular-nums">00:32</span>
                    </div>
                    <p className="text-ink font-medium">
                      &ldquo;Pole sana kwa usumbufu huo. Let me pull up your transaction reference right
                      now to verify the duplicate deduction.&rdquo;
                    </p>
                  </div>

                  {/* QA Engine Audit */}
                  <div className="p-4 bg-bg">
                    <div className="flex items-center gap-1.5 text-good font-semibold text-[12px] mb-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Audited: Section 3 (Empathy &amp; Ownership)</span>
                    </div>
                    <p className="text-[12px] text-muted">
                      Swahili empathy statement validated alongside immediate ownership in English.
                      Score: 5.0/5.0.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: The Huddle */}
          <div className="split">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">
                Actionable 1-on-1s
              </p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Coaching notes backed by actual timestamps and quotes.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
                No more arguments in the QA briefing. Every score generated by Zetro is tethered to the
                exact seconds in the audio where the behavior occurred. Coaches walk into the huddle with
                the agent’s actual words, not a vague summary.
              </p>
              <div className="mt-6 space-y-2.5 text-[13px] text-ink">
                <div className="flex items-start gap-2.5">
                  <span className="font-bold text-good">✓</span>
                  <span>Instant PDF export for 1-on-1 coaching sessions</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-bold text-good">✓</span>
                  <span>Highlighted strengths and actionable growth areas for the floor</span>
                </div>
              </div>
            </div>

            {/* Feature Card 3 (Pricing Card Style) */}
            <div className="split-media">
              <div className="w-full max-w-md border border-line bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-line bg-bg px-5 py-3.5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Coach Briefing
                    </span>
                    <p className="text-[13px] font-semibold text-ink">Agent John M. · Floor Team B</p>
                  </div>
                  <span className="chip chip-ok font-semibold">91% Score</span>
                </div>

                <div className="divide-y divide-line text-[13px]">
                  <div className="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-good">Core Strength</p>
                    <p className="mt-1 text-ink">
                      Exceptional patience during complex account verification. Handled anxious customer politely.
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-warn">Focus Area</p>
                    <p className="mt-1 text-ink">
                      Check in with the customer every 30 seconds during hold time to prevent silent drop rate.
                    </p>
                    <p className="mt-2 text-[12px] text-muted">
                      Quote at <span className="font-mono font-bold text-blue">02:15</span>:
                      <em className="text-ink"> &ldquo;Ngoja nikuweke hold kidogo...&rdquo; (Hold exceeded 58s)</em>
                    </p>
                  </div>
                </div>

                <div className="border-t border-line bg-bg px-5 py-2.5 text-[11px] text-muted">
                  Ready for weekly supervisor huddle
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Grid (Matching PriceTable style from Pricing page) */}
      <section className="border-y border-line bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="page-kicker">Comparison</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Why contact centers choose Zetro
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Manual auditing leaves 98% of your customer conversations unmonitored. Here is how Zetro
              transforms floor operations:
            </p>
          </div>

          <div className="mt-10 overflow-x-auto border border-line bg-white">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-bg">
                  <th scope="col" className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-muted">
                    Operational Metric
                  </th>
                  <th scope="col" className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-muted">
                    Traditional Manual QA
                  </th>
                  <th scope="col" className="px-5 py-4 text-[12px] font-semibold uppercase tracking-wider text-blue bg-blue-soft">
                    Zetro Automated Intelligence
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors">
                    <th scope="row" className="px-5 py-4 text-[14px] font-medium text-ink">
                      {row.feature}
                    </th>
                    <td className="px-5 py-4 text-[14px] text-muted">
                      {row.manual}
                    </td>
                    <td
                      className={`px-5 py-4 text-[14px] font-semibold ${
                        row.highlight ? "text-good" : "text-ink"
                      } bg-blue-soft/30`}
                    >
                      {row.zetro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3-Step Simple Path (Matching solutions role grid card layout) */}
      <section className="border-b border-line bg-bg py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="page-kicker">How to start</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              From audio recording to scored audit in three steps
            </h2>
          </div>

          <div className="mt-10 grid border border-line bg-white sm:grid-cols-3">
            {WORKFLOW_STEPS.map((s, index) => (
              <div
                key={s.step}
                className={`p-6 flex flex-col ${
                  index < 2 ? "border-b border-line sm:border-b-0 sm:border-r" : ""
                }`}
              >
                <span className="text-[12px] font-bold uppercase tracking-wider text-blue">
                  Step {s.step}
                </span>
                <h3 className="mt-3 text-[16px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-white py-16 lg:py-20 border-b border-line">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="page-kicker">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              Everything you need to know about setting up Zetro for your contact center.
            </p>
          </div>

          <FaqAccordion />
        </div>
      </section>

      {/* Closing CTA Box (Matching Pricing Page Blue Highlight Section) */}
      <section className="bg-bg py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="flex flex-col gap-6 border border-blue/20 bg-blue-soft px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div className="max-w-xl">
              <span className="chip chip-ok mb-2">5 Free Calls Included</span>
              <h2 className="text-[20px] font-semibold text-ink">Ready to audit 100% of your calls?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Score your first recording against your own company scorecard in under 60 seconds.
                We load your criteria and rules automatically. No card required.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link
                href={signedIn ? "/dashboard" : "/signup"}
                className="btn btn-lg btn-blue w-full sm:w-auto"
              >
                {signedIn ? "Open workspace" : "Start free workspace"}
              </Link>
              <Link href="/talk-sales" className="text-[13px] font-semibold text-blue hover:underline">
                Or talk to sales →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
