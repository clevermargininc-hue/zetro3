import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ZetroMark } from "@/components/logo";
import { HeroProductPreview } from "@/components/hero-product-preview";
import { LandingProductShowcase } from "@/components/landing-product-showcase";
import { LandingRolesSelector } from "@/components/landing-roles-selector";
import { LandingPricingCalculator } from "@/components/landing-pricing-calculator";
import { FaqAccordion } from "@/components/faq-accordion";
import { TRIAL_CALLS } from "@/lib/billing";

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
    desc: "Upload call recordings (.mp3, .wav, .m4a, or video). Keep the phone system you already use.",
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
    <div className="bg-[#fbfcff] text-[#0f172a]">
      {/* =========================================================================
          HERO SECTION (KEPT EXACTLY INTACT - DO NOT DISTURB)
          ========================================================================= */}
      <section className="relative overflow-hidden pb-20 pt-14 lg:pb-32 lg:pt-20">
        {/* Layered ethereal pastel gradient background (soft blue, periwinkle, lavender, pale-purple) */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[68rem] w-full"
          style={{
            background: `
              radial-gradient(ellipse 90% 65% at 50% -5%, rgba(219, 234, 254, 0.8) 0%, transparent 65%),
              radial-gradient(circle 50% at 15% 25%, rgba(237, 233, 254, 0.75) 0%, transparent 55%),
              radial-gradient(circle 55% at 85% 20%, rgba(250, 232, 255, 0.75) 0%, transparent 55%),
              radial-gradient(ellipse 70% 50% at 50% 55%, rgba(224, 231, 255, 0.5) 0%, transparent 70%),
              linear-gradient(to bottom, #f8faff 0%, #fbfcff 100%)
            `,
          }}
          aria-hidden="true"
        />

        {/* Oversized softly blurred organic light fields */}
        <div
          className="pointer-events-none absolute -left-40 top-20 -z-10 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-40 top-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-purple-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-10 -z-10 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
          {/* Centered App Logo in White Rounded-Square Tile with subtle shadow */}
          <div className="mx-auto mb-8 inline-flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-[1.35rem] bg-white p-3.5 shadow-xl shadow-indigo-500/10 border border-white/80 transition-transform duration-300 hover:scale-105">
            <ZetroMark className="h-full w-full" />
          </div>

          {/* Large, elegant, black sans-serif headline with regular font weight */}
          <h1 className="font-sans text-[2.75rem] font-normal leading-[1.07] tracking-[-0.035em] text-[#0f172a] sm:text-6xl md:text-7xl lg:text-[4.75rem] max-w-4xl mx-auto">
            Every conversation, scored against your scorecard.
          </h1>

          {/* Short supporting description beneath the headline */}
          <p className="mt-7 max-w-2xl mx-auto text-lg sm:text-[1.25rem] font-normal leading-relaxed text-neutral-600">
            Stop sampling 2% of the floor. Upload the scorecard you already use. Zetro scores every
            call with your weights, rules, and timestamped quotes.
          </p>

          {/* Two Horizontally Aligned Pill-Shaped CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-8 py-3.5 text-center text-[15px] font-medium text-white shadow-md shadow-black/10 transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            >
              <span>{signedIn ? "Open workspace" : "Audit your first call free"}</span>
              <span>→</span>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-white/70 px-8 py-3.5 text-center text-[15px] font-medium text-[#0f172a] backdrop-blur-md transition-all duration-200 hover:bg-white hover:border-black/20 hover:scale-[1.02] active:scale-[0.98] shadow-xs sm:w-auto"
            >
              See how it works
            </Link>
          </div>

          {/* Small, Understated Trust & Credibility Statement */}
          <p className="mt-8 text-[13px] font-normal tracking-wide text-neutral-500">
            Excel, PDF, or Word &nbsp;·&nbsp; English and Kiswahili &nbsp;·&nbsp; {TRIAL_CALLS} free calls included
          </p>

          {/* Hero Product Preview Showcase (Clean Light Glass Window) */}
          <div className="mt-16 w-full max-w-4xl mx-auto">
            <HeroProductPreview />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION A: INTERACTIVE PRODUCT SHOWCASE & PROOF STREAM
          ========================================================================= */}
      <section className="relative border-b border-black/[0.05] bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-neutral-100/80 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
              Interactive Product Showcase
            </span>
            <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-5xl sm:leading-[1.1]">
              See how Zetro inspects, audits, and coaches in real time.
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Explore the live intelligence engine: toggle between raw audio diarization, the extracted scorecard rules, and supervisor coaching notes.
            </p>
          </div>

          <LandingProductShowcase />

          {/* Proof Metric Tiles */}
          <div className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-3xl border border-black/[0.05] bg-[#f8faff] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    {stat.label}
                  </p>
                  <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                </div>

                <p className="mt-4 font-sans text-4xl font-normal tracking-tight text-[#0f172a] tabular-nums">
                  {stat.value}
                </p>

                <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
                  {stat.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: PROBLEM & SOLUTION STORYTELLING (THE 2% SAMPLING TRAP)
          ========================================================================= */}
      <section className="border-b border-black/[0.05] bg-[#fafbfe] py-24 lg:py-36">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-50 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-rose-700">
              The 2% Sampling Problem
            </span>
            <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-5xl">
              Manual auditing leaves 98% of your conversations unmonitored.
            </h2>
            <p className="mt-4 text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
              When quality leads only listen to 2 tapes per agent every month, risk slips through, bad habits compound, and fair coaching is impossible.
            </p>
          </div>

          {/* Comparison Matrix Table */}
          <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-xl shadow-indigo-500/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-black/[0.05] bg-neutral-50/90">
                    <th scope="col" className="w-1/3 px-6 py-4.5 text-[12px] font-medium uppercase tracking-wider text-neutral-500">
                      Operational Reality
                    </th>
                    <th scope="col" className="w-1/3 px-6 py-4.5 text-[12px] font-medium uppercase tracking-wider text-neutral-500 border-l border-black/[0.05]">
                      Traditional Manual QA
                    </th>
                    <th scope="col" className="w-1/3 px-6 py-4.5 text-[12px] font-semibold uppercase tracking-wider text-blue bg-blue-soft/30 border-l border-blue/20">
                      <div className="flex items-center justify-between">
                        <span>Zetro Continuous Auditing</span>
                        <span className="rounded-full bg-blue px-2.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-2xs">
                          Modern
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="transition-colors hover:bg-neutral-50/50">
                      <th scope="row" className="px-6 py-4.5 text-[14px] font-medium text-[#0f172a]">
                        {row.feature}
                      </th>
                      <td className="px-6 py-4.5 text-[14px] text-neutral-500 border-l border-black/[0.05]">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-400">
                            ✕
                          </span>
                          <span>{row.manual}</span>
                        </div>
                      </td>
                      <td
                        className={`px-6 py-4.5 text-[14px] font-medium border-l border-blue/20 ${
                          row.highlight ? "text-emerald-700" : "text-[#0f172a]"
                        } bg-blue-soft/10`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                            ✓
                          </span>
                          <span>{row.zetro}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION C: DEEP FEATURE SHOWCASE (THE 3 CORE PILLARS)
          ========================================================================= */}
      <section id="features" className="py-24 lg:py-36 bg-white border-b border-black/[0.05]">
        <div className="mx-auto max-w-7xl space-y-28 px-6 lg:space-y-40 lg:px-8">
          {/* Feature 1: Scorecards */}
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-neutral-100/80 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                Pillar 01 · Standards Fidelity
              </span>
              <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                Upload your scorecard. Zetro preserves your exact weights.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-neutral-600">
                No rigid templates or generic AI rubrics. Whether your company uses a complex Excel
                workbook with merged sub-criteria or a Word compliance policy, Zetro extracts every single
                row, weight percentage, and zero-tolerance clause without character truncation.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600 border border-emerald-500/20">
                    ✓
                  </span>
                  <span className="text-[14px] font-medium text-[#0f172a]">
                    Multi-sheet Excel spreadsheets with custom weights (e.g., 25%, 30%)
                  </span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600 border border-emerald-500/20">
                    ✓
                  </span>
                  <span className="text-[14px] font-medium text-[#0f172a]">
                    Critical compliance guidelines &amp; Auto-Zero rules
                  </span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600 border border-emerald-500/20">
                    ✓
                  </span>
                  <span className="text-[14px] font-medium text-[#0f172a]">
                    Standard greetings, hold time policies, and mandatory disclaimers
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Card 1 */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-xl shadow-indigo-500/5">
                <div className="flex items-center justify-between border-b border-black/[0.05] bg-neutral-50/80 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-50 text-xs font-bold text-emerald-700">
                      XLS
                    </div>
                    <div>
                      <span className="block text-[13px] font-semibold text-[#0f172a]">
                        Scorecard_Floor_2026.xlsx
                      </span>
                      <span className="text-[11px] text-neutral-500">Multi-sheet Workbook · 3 Sections</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    100% Extracted
                  </span>
                </div>

                <div className="divide-y divide-black/[0.04]">
                  <div className="p-5 transition-colors hover:bg-neutral-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded bg-blue-soft text-[10px] font-bold text-blue">
                          01
                        </span>
                        <span className="text-[14px] font-medium text-[#0f172a]">Mandatory Identification</span>
                      </div>
                      <span className="rounded-full border border-black/[0.06] bg-neutral-100/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-neutral-700">
                        25% weight
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-neutral-500 pl-7">Customer national ID and OTP verified</p>
                    <div className="mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2 pl-7 text-[12px]">
                      <span className="text-neutral-500">Floor Score:</span>
                      <span className="font-semibold text-emerald-700">5.0 / 5.0 (Passed)</span>
                    </div>
                  </div>

                  <div className="p-5 transition-colors hover:bg-neutral-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded bg-blue-soft text-[10px] font-bold text-blue">
                          02
                        </span>
                        <span className="text-[14px] font-medium text-[#0f172a]">Regulatory Disclosure</span>
                      </div>
                      <span className="rounded-full border border-black/[0.06] bg-neutral-100/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-neutral-700">
                        30% weight
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-neutral-500 pl-7">Terms of interest and repayment date cited</p>
                    <div className="mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2 pl-7 text-[12px]">
                      <span className="text-neutral-500">Auto-Zero Status:</span>
                      <span className="font-semibold text-emerald-700">Safe (No breaches)</span>
                    </div>
                  </div>

                  <div className="p-5 transition-colors hover:bg-neutral-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded bg-blue-soft text-[10px] font-bold text-blue">
                          03
                        </span>
                        <span className="text-[14px] font-medium text-[#0f172a]">Empathy &amp; Resolution</span>
                      </div>
                      <span className="rounded-full border border-black/[0.06] bg-neutral-100/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-neutral-700">
                        45% weight
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-neutral-500 pl-7">Active listening and clear next steps</p>
                    <div className="mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2 pl-7 text-[12px]">
                      <span className="text-neutral-500">Floor Score:</span>
                      <span className="font-semibold text-emerald-700">4.6 / 5.0</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-black/[0.05] bg-neutral-50/80 px-6 py-3 text-[12px] text-neutral-500">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    <span>Strictly follows company weight distribution</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-blue">Total 100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Bilingual Intelligence */}
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 lg:order-1 lg:col-span-6">
              <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-xl shadow-indigo-500/5">
                <div className="flex items-center justify-between border-b border-black/[0.05] bg-neutral-50/80 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-blue/20 bg-blue-soft text-blue font-bold text-xs">
                      AI
                    </div>
                    <div>
                      <span className="block text-[13px] font-semibold text-[#0f172a]">
                        Speech Diarization Stream
                      </span>
                      <span className="text-[11px] text-neutral-500">Dual Speaker · Real-time Sync</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue-soft/60 px-3 py-1 text-[11px] font-medium text-blue">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue animate-pulse" />
                    Code-Switching Active
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  <div className="rounded-2xl border border-black/[0.05] bg-neutral-50/80 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-neutral-200 text-[11px] font-bold text-neutral-700">
                          C
                        </span>
                        <span className="text-[12px] font-medium text-[#0f172a]">Customer (Kiswahili)</span>
                      </div>
                      <span className="font-mono text-[11px] text-neutral-400 tabular-nums">00:18</span>
                    </div>
                    <p className="text-[13px] font-normal leading-relaxed text-[#0f172a] pl-8">
                      &ldquo;Habari, nimejaribu kutuma muamala lakini nimekatwa mara mbili bila kupata huduma.&rdquo;
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue/20 bg-blue-soft/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue text-[11px] font-bold text-white">
                          A
                        </span>
                        <span className="text-[12px] font-semibold text-blue">Agent (Bilingual)</span>
                      </div>
                      <span className="font-mono text-[11px] font-medium text-blue tabular-nums">00:32</span>
                    </div>
                    <p className="text-[13px] font-normal leading-relaxed text-[#0f172a] pl-8">
                      &ldquo;Pole sana kwa usumbufu huo. Let me pull up your transaction reference right
                      now to verify the duplicate deduction.&rdquo;
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold text-[13px] mb-1.5">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Audited: Section 3 (Empathy &amp; Ownership)</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-neutral-600 pl-6">
                      Swahili empathy statement validated alongside immediate ownership in English.
                      Score: 5.0/5.0.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-neutral-100/80 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                Pillar 02 · Dual Language Intelligence
              </span>
              <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                English and Kiswahili. Native code-switching on live calls.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-neutral-600">
                Agents and customers across East Africa fluidly mix English and Kiswahili in the same
                sentence. Generic speech tools stumble or lose compliance context when the dialect shifts.
                Zetro understands both simultaneously.
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-black/[0.06] bg-neutral-50 px-4 py-1.5 text-xs font-medium text-neutral-700 shadow-xs">
                  Swahili Customer Dialects
                </span>
                <span className="rounded-full border border-black/[0.06] bg-neutral-50 px-4 py-1.5 text-xs font-medium text-neutral-700 shadow-xs">
                  English Regulatory Scripts
                </span>
                <span className="rounded-full border border-black/[0.06] bg-neutral-50 px-4 py-1.5 text-xs font-medium text-neutral-700 shadow-xs">
                  Sheng &amp; Colloquial Phrases
                </span>
              </div>
            </div>
          </div>

          {/* Feature 3: The Huddle */}
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-neutral-100/80 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                Pillar 03 · Actionable Coaching
              </span>
              <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
                Coaching notes backed by actual timestamps and quotes.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-neutral-600">
                No more arguments in the QA briefing. Every score generated by Zetro is tethered to the
                exact seconds in the audio where the behavior occurred. Coaches walk into the huddle with
                the agent’s actual words, not a vague summary.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600 border border-emerald-500/20">
                    ✓
                  </span>
                  <span className="text-[14px] font-medium text-[#0f172a]">
                    Instant PDF export for 1-on-1 coaching sessions
                  </span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12px] font-bold text-emerald-600 border border-emerald-500/20">
                    ✓
                  </span>
                  <span className="text-[14px] font-medium text-[#0f172a]">
                    Highlighted strengths and actionable growth areas for the floor
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Card 3 (Blended with Authentic Team Photograph) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="relative h-60 w-full overflow-hidden rounded-3xl border border-black/[0.07] shadow-lg">
                <Image
                  src="/marketing/review.jpg"
                  alt="A quality team in a briefing around a conference table"
                  fill
                  sizes="(min-width: 1024px) 32rem, 100vw"
                  className="object-cover object-[center_60%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-white">
                  <span className="text-xs font-semibold uppercase tracking-wider">Floor QA Briefing</span>
                  <span className="text-xs font-mono">1-on-1 Session</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-black/[0.07] bg-white p-5 shadow-xl shadow-indigo-500/5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-3">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Coach Briefing</span>
                    <p className="text-[13px] font-semibold text-[#0f172a]">Agent John M. · Floor Team B</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    91% Score
                  </span>
                </div>
                <div className="mt-3 space-y-2.5 text-[13px]">
                  <p className="text-neutral-700">
                    <strong className="text-emerald-700">Strength:</strong> Exceptional patience during verification.
                  </p>
                  <p className="text-neutral-700">
                    <strong className="text-amber-800">Focus:</strong> Check in with customer every 30s during hold.
                  </p>
                  <p className="font-mono text-xs text-neutral-500 bg-neutral-50 p-2 rounded-lg">
                    Quote at 02:15: &ldquo;Ngoja nikuweke hold kidogo...&rdquo; (58s silent hold)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: HOW IT WORKS (CONNECTIVE 3-STEP TIMELINE)
          ========================================================================= */}
      <section className="border-b border-black/[0.05] bg-[#fafbfe] py-24 lg:py-36">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600 shadow-2xs">
              Simple 3-Step Flow
            </span>
            <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-5xl">
              From raw audio to scored audit in three steps
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-600">
              No months-long integrations. Start scoring on the scorecard you already use today.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {WORKFLOW_STEPS.map((s, index) => (
              <div
                key={s.step}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-black/[0.05] bg-white p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center rounded-full border border-black/[0.08] bg-neutral-100/70 px-3 py-1 font-mono text-xs font-semibold text-[#0f172a]">
                      Step {s.step}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">0{index + 1} / 03</span>
                  </div>

                  <h3 className="mt-6 text-[18px] font-semibold tracking-tight text-[#0f172a]">
                    {s.title}
                  </h3>

                  <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-black/[0.04] flex items-center justify-between text-xs text-neutral-500 font-mono">
                  <span>Phase {index + 1}</span>
                  <span className="text-blue font-semibold group-hover:translate-x-0.5 transition-transform">Automated →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION E: AUDIENCE & USE CASES (NOTION / LINEAR STYLE)
          ========================================================================= */}
      <section className="py-24 lg:py-36 bg-white border-b border-black/[0.05]">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-neutral-100/80 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
              Role &amp; Industry Alignment
            </span>
            <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-5xl">
              Engineered for the entire contact center floor
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-600">
              From the supervisor in the huddle to the executive protecting enterprise SLAs.
            </p>
          </div>

          <LandingRolesSelector />
        </div>
      </section>

      {/* =========================================================================
          SECTION F: TRANSPARENT PRICING & CONTRACT ESTIMATOR (STRIPE CALIBER)
          ========================================================================= */}
      <section id="pricing" className="py-24 lg:py-36 bg-[#fafbfe] border-b border-black/[0.05]">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600 shadow-2xs">
              Transparent Commercials
            </span>
            <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-5xl">
              Pay per scored call. In Tanzanian Shillings.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-600">
              No hidden surprise charges. Failed or unscored audio is completely free.
            </p>
          </div>

          <LandingPricingCalculator />
        </div>
      </section>

      {/* =========================================================================
          SECTION G: ENTERPRISE TRUST & SECURITY
          ========================================================================= */}
      <section className="py-24 lg:py-32 bg-white border-b border-black/[0.05]">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Data Sovereignty &amp; Privacy
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-[#0f172a]">
                Built with zero public model training. Your customer audio is strictly private.
              </h2>
              <p className="text-[16px] text-neutral-600 leading-relaxed font-normal">
                Regulated industries like banking and telecom require strict confidentiality. Customer recordings, transcripts, and evaluation metrics are isolated in dedicated tenant databases and never leaked into public LLM training sets.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <h4 className="text-[14px] font-semibold text-[#0f172a] mb-1">Encrypted in Transit &amp; Rest</h4>
                  <p className="text-[12px] text-neutral-500">Industry-standard AES-256 and TLS 1.3 cryptographic protection across all endpoints.</p>
                </div>
                <div className="rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
                  <h4 className="text-[14px] font-semibold text-[#0f172a] mb-1">Audit Trail &amp; Access Controls</h4>
                  <p className="text-[12px] text-neutral-500">Role-based permissions ensuring coaches only access calls for their designated teams.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-80 w-full overflow-hidden rounded-3xl border border-black/[0.08] shadow-xl">
                <Image
                  src="/marketing/floor.jpg"
                  alt="An agent on the contact center floor"
                  fill
                  sizes="(min-width: 1024px) 32rem, 100vw"
                  className="object-cover object-[center_40%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-sm font-semibold">Tanzanian Contact Center Operations</p>
                  <p className="text-xs text-white/80">Continuous quality assurance for mission-critical floor teams</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION H: FREQUENTLY ASKED QUESTIONS
          ========================================================================= */}
      <section className="bg-[#fafbfe] py-24 lg:py-36 border-b border-black/[0.05]">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-600 shadow-2xs">
              Common Questions
            </span>
            <h2 className="mt-4 font-sans text-3xl font-normal tracking-[-0.03em] text-[#0f172a] sm:text-5xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-600 max-w-xl mx-auto">
              Everything you need to know about setting up Zetro for your contact center.
            </p>
          </div>

          <FaqAccordion />
        </div>
      </section>

      {/* =========================================================================
          SECTION I: FINAL CONVERSION DESTINATION
          ========================================================================= */}
      <section className="relative overflow-hidden bg-white py-24 lg:py-36">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-3xl border border-indigo-100 p-8 sm:p-14 lg:p-16 shadow-2xl shadow-indigo-500/10 text-center"
            style={{
              background: `
                radial-gradient(ellipse 90% 65% at 50% 10%, rgba(219, 234, 254, 0.75) 0%, transparent 65%),
                radial-gradient(circle 50% at 20% 70%, rgba(237, 233, 254, 0.7) 0%, transparent 55%),
                radial-gradient(circle 55% at 80% 60%, rgba(250, 232, 255, 0.7) 0%, transparent 55%),
                linear-gradient(to bottom, #ffffff 0%, #f8faff 100%)
              `,
            }}
          >
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 shadow-2xs mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {TRIAL_CALLS} Free Calls Included
              </span>

              <h2 className="font-sans text-3xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.035em] text-[#0f172a] leading-[1.08]">
                Ready to audit 100% of your contact center calls?
              </h2>

              <p className="mt-6 text-base sm:text-xl font-normal leading-relaxed text-neutral-600 max-w-2xl mx-auto">
                Upload your company scorecard and your first recording. Receive your full weighted audit and timestamped coaching quotes in under 60 seconds.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href={signedIn ? "/dashboard" : "/signup"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-8 py-4 text-[15px] font-medium text-white shadow-md shadow-black/10 transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                >
                  <span>{signedIn ? "Open workspace" : "Audit your first call free"}</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/talk-sales"
                  className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-white/70 px-8 py-4 text-[15px] font-medium text-[#0f172a] backdrop-blur-md transition-all duration-200 hover:bg-white hover:border-black/20 hover:scale-[1.02] shadow-xs sm:w-auto"
                >
                  Talk to our sales team
                </Link>
              </div>

              <p className="mt-6 text-xs text-neutral-500">
                No credit card required. Invoices issued in TZS. Enterprise SLA guarantees.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
