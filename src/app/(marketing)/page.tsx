"use client";

import { useState } from "react";
import Link from "next/link";
import { FaqAccordion } from "@/components/faq-accordion";
import { Icon } from "@/components/icon";
import {
  faShieldHalved,
  faPhone,
  faBolt,
  faGear,
  faScaleBalanced,
  faGlobe,
  faBullseye,
  faChartColumn,
  faCheck,
  faRotateRight,
  faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";
import { faOpenai } from "@fortawesome/free-brands-svg-icons";

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRuleToggle, setActiveRuleToggle] = useState(true);
  const [customWord, setCustomWord] = useState("");
  const [dictionaryWords, setDictionaryWords] = useState([
    "M-Pesa",
    "Lipa Namba",
    "Halopesa",
    "NIDA",
    "Kikokotoo",
  ]);

  const addTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (customWord.trim() && !dictionaryWords.includes(customWord.trim())) {
      setDictionaryWords([...dictionaryWords, customWord.trim()]);
      setCustomWord("");
    }
  };

  return (
    <div className="relative overflow-hidden bg-white pb-24 text-[#061C52] selection:bg-[#061C52] selection:text-[#04B6DA]">
      {/* Background atmosphere using Burning Flame & Truffle Trouble glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[700px] w-[1200px] -translate-x-1/2 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(11, 63, 191, 0.08) 0%, rgba(6, 28, 82, 0.04) 40%, rgba(255, 255, 255, 0) 70%)",
        }}
      />

      {/* =========================================================================
          HERO SECTION (Left text & shortcuts + Right Orbit & Glowing Ring)
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 lg:px-8 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3.5 py-1 text-xs font-semibold text-[#334155] shadow-2xs">
              <svg className="h-3.5 w-3.5 text-[#B91C1C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span>Audit 100% of contact center calls</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#061C52] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.12]">
              We&apos;ve sampled 1% for decades. <br />
              <span className="text-[#061C52]">It&apos;s time to score every call.</span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-[15px] leading-relaxed text-[#334155] sm:text-[16px]">
              Zetro transcribes Swahili and English calls in real time, fixes code-switching, and audits 100% of customer conversations against your own scorecards and compliance policies.
            </p>

            {/* Interactive Shortcut Pill */}
            <div className="pt-2">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#334155] shadow-xs backdrop-blur-md">
                <span className="text-[#334155]/70">Drop</span>
                <span className="rounded-none border border-[#E3EBFB] bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-[#061C52]">
                  Call Audio (.mp3/.wav)
                </span>
                <span>and audit against your playbook</span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-none bg-white text-[#B91C1C]">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-none bg-[#04B6DA] px-6 py-3 text-xs font-bold text-white hover:bg-[#039EBE] shadow-md transition-all hover:opacity-95 hover:shadow-lg active:scale-95"
              >
                <span>Start free trial (50 calls free)</span>
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-none border border-[#E3EBFB] bg-[#F3F6FD] px-5 py-3 text-xs font-semibold text-[#061C52] hover:bg-[#E3EBFB]"
              >
                <span>See how it works</span>
                <span className="text-[#B91C1C]">▷</span>
              </Link>
            </div>
          </div>
          {/* Right Column: Glowing Ring & Orbit Visual (Strictly 6 colors) */}
          <div className="relative flex items-center justify-center lg:col-span-5">
            <div className="relative flex h-[360px] w-[360px] items-center justify-center sm:h-[400px] sm:w-[400px]">
              {/* Dashed Orbit Circles */}
              <div className="absolute inset-0 rounded-none border border-dashed border-[#E3EBFB]" />
              <div className="absolute inset-8 rounded-none border border-[#E3EBFB]/60" />

              {/* Glowing Palette Conic Ring */}
              <div
                className="absolute flex h-52 w-52 items-center justify-center rounded-none p-[3px] shadow-2xl transition-transform duration-700 hover:scale-105"
                style={{
                  background:
                    "conic-gradient(from 180deg at 50% 50%, #04B6DA 0deg, #039EBE 70deg, #061C52 160deg, #04B6DA 230deg, #E3EBFB 290deg, #04B6DA 360deg)",
                }}
              >
                {/* Inner white pill */}
                <div className="flex h-full w-full flex-col items-center justify-center rounded-none bg-[#FFFFFF] px-6 shadow-inner">
                  {/* Waveform graphic */}
                  <div className="flex items-center gap-1">
                    {[12, 24, 38, 18, 44, 28, 50, 20, 36, 16, 30].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-none transition-all duration-300 ${
                          i % 3 === 0 ? "bg-[#04B6DA]" : "bg-[#061C52]"
                        }`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="font-display text-lg font-bold tracking-tight text-[#061C52]">
                      Habari! / Hello!
                    </span>
                  </div>
                  <span className="mt-1 rounded-none border border-[#E3EBFB] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#061C52]">
                    94% QA Score · Passed
                  </span>
                </div>
              </div>

              {/* Orbiting Satellite Node 1: Scorecard (.xlsx) */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3 py-1 text-[11px] font-semibold text-[#061C52] shadow-md">
                <span className="grid h-4 w-4 place-items-center rounded-none bg-[#04B6DA] text-[10px] font-bold text-[#061C52]">
                  X
                </span>
                <span>Scorecard.xlsx</span>
              </div>

              {/* Orbiting Satellite Node 2: Compliance Shield */}
              <div className="absolute top-1/2 -right-4 -translate-y-1/2 flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3 py-1 text-[11px] font-semibold text-[#061C52] shadow-md">
                <Icon icon={faShieldHalved} size="xs" color="navy" />
                <span>Auto-Zero Rules</span>
              </div>

              {/* Orbiting Satellite Node 3: Bilingual Swahili */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3.5 py-1 text-[11px] font-semibold text-[#061C52] shadow-md">
                <span className="h-2 w-2 rounded-none bg-[#061C52]" />
                <span>Bilingual SWA + ENG</span>
              </div>

              {/* Orbiting Satellite Node 4: Telephony PBX */}
              <div className="absolute top-1/2 -left-6 -translate-y-1/2 flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3 py-1 text-[11px] font-semibold text-[#061C52] shadow-md">
                <Icon icon={faPhone} size="xs" color="navy" />
                <span>Telephony Stream</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HERO PRODUCT MOCKUP: SAFARI / MAC BROWSER WINDOW
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-none border border-[#E3EBFB] bg-[#FFFFFF] shadow-2xl shadow-[#061C52]/10">
          {/* Browser Chrome Bar */}
          <div className="flex items-center justify-between border-b border-[#E3EBFB] bg-white/70 px-4 py-3">
            {/* Window Dots using palette */}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-none bg-[#B91C1C]" title="Truffle Trouble" />
              <span className="h-2.5 w-2.5 rounded-none bg-[#04B6DA]" title="Burning Flame" />
              <span className="h-2.5 w-2.5 rounded-none bg-[#061C52]" title="Blue Fantastic" />
            </div>

            {/* Address Bar */}
            <div className="flex max-w-sm flex-1 items-center justify-center">
              <div className="flex items-center gap-2 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3 py-1 text-xs text-[#334155] shadow-2xs">
                <svg className="h-3 w-3 text-[#334155]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd" />
                </svg>
                <span className="font-mono text-[11px] text-[#061C52]">https://zetro.online/workspace/calls</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 text-[#334155]">
              <span className="rounded-none p-1 hover:bg-[#E3EBFB]/30">
                <Icon icon={faRotateRight} size="xs" color="secondary" />
              </span>
              <span className="rounded-none p-1 hover:bg-[#E3EBFB]/30">
                <Icon icon={faArrowTrendUp} size="xs" color="secondary" />
              </span>
            </div>
          </div>

          {/* Top 3 KPI Stat Cards with Arrow */}
          <div className="grid grid-cols-1 gap-px border-b border-[#E3EBFB] bg-[#E3EBFB] sm:grid-cols-3">
            <div className="flex items-center justify-between bg-[#FFFFFF] px-6 py-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#334155]">
                  <span className="h-2 w-2 rounded-none bg-[#061C52]" />
                  <span>Call Floor Coverage</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#061C52]">100%</span>
                  <span className="text-xs text-[#334155]">of conversations</span>
                </div>
              </div>
              <Icon icon={faArrowTrendUp} size="xs" color="secondary" />
            </div>

            <div className="flex items-center justify-between bg-[#FFFFFF] px-6 py-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#334155]">
                  <span className="h-2 w-2 rounded-none bg-[#04B6DA]" />
                  <span>Audit Turnaround</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#061C52]">&lt; 60s</span>
                  <span className="text-xs text-[#334155]">instant feedback</span>
                </div>
              </div>
              <Icon icon={faArrowTrendUp} size="xs" color="secondary" />
            </div>

            <div className="flex items-center justify-between bg-[#FFFFFF] px-6 py-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#334155]">
                  <span className="h-2 w-2 rounded-none bg-[#B91C1C]" />
                  <span>Scorecard Adherence</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#061C52]">99.4%</span>
                  <span className="text-xs text-[#334155]">exact company weights</span>
                </div>
              </div>
              <Icon icon={faArrowTrendUp} size="xs" color="secondary" />
            </div>
          </div>

          {/* Main Mock Content Split: Left Transcript + Right Live Audit Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Pane: Diarized Audio Transcript */}
            <div className="border-b border-[#E3EBFB] p-6 lg:col-span-7 lg:border-r lg:border-b-0">
              {/* Call details row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#061C52]">Call #CS-4829</span>
                    <span className="rounded-none border border-[#E3EBFB] bg-white px-2 py-0.5 text-[11px] font-medium text-[#061C52]">
                      Dispute Escalation
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#334155]">Agent: Amina K. · Customer: Juma M. · 4m 12s</p>
                </div>

                <div className="flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-white px-2.5 py-1 text-xs font-semibold text-[#061C52]">
                  <span>Bilingual: Swahili + English</span>
                </div>
              </div>

              {/* Audio Wave Player Strip */}
              <div className="rounded-none border border-[#E3EBFB] bg-white/60 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex h-8 w-8 items-center justify-center rounded-none bg-[#061C52] text-[#04B6DA] shadow-xs transition-transform active:scale-95"
                    >
                      {isPlaying ? (
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </button>
                    <span className="font-mono text-xs text-[#061C52]">
                      {isPlaying ? "01:45" : "00:00"} / 04:12
                    </span>
                  </div>
                  <span className="text-xs text-[#334155]">1.0x</span>
                </div>

                {/* Sound wave visual bars */}
                <div className="mt-3 flex h-7 items-center gap-1">
                  {[20, 45, 75, 30, 85, 95, 40, 60, 80, 100, 70, 40, 55, 90, 85, 30, 65, 92, 45, 78, 62, 88, 35, 70, 95, 60, 40, 75, 90, 50, 65, 82, 38, 72, 89, 55, 40, 60, 30, 20].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-none transition-all duration-300 ${
                        i < 15 ? "bg-[#061C52]" : "bg-[#E3EBFB]"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Conversation turns */}
              <div className="mt-4 space-y-3 text-[13px]">
                {/* Agent turn */}
                <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-[#334155] mb-1">
                    <span className="font-semibold text-[#061C52]">Agent (Amina K.)</span>
                    <span className="font-mono">00:04</span>
                  </div>
                  <p className="text-[#061C52]">
                    &ldquo;Habari za asubuhi, karibu huduma kwa wateja. Naitwa Amina, nawezaje kukusaidia leo?&rdquo;
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-white px-2 py-0.5 text-[11px] font-medium text-[#061C52]">
                    <Icon icon={faCheck} size="xs" color="navy" />
                    <span>Standard Greeting &amp; Name Disclosure (100%)</span>
                  </div>
                </div>

                {/* Customer turn */}
                <div className="rounded-none border border-[#E3EBFB] bg-white/40 p-3.5">
                  <div className="flex items-center justify-between text-xs text-[#334155] mb-1">
                    <span className="font-semibold text-[#061C52]">Customer (Juma M.)</span>
                    <span className="font-mono">00:15</span>
                  </div>
                  <p className="text-[#061C52]">
                    &ldquo;Habari Amina. Nilituma muamala wa TZS 150,000 asubuhi hii lakini haijamfikia mpokeaji, na salio langu limekatwa.&rdquo;
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-none border border-[#04B6DA]/40 bg-[#04B6DA]/20 px-2 py-0.5 text-[11px] font-medium text-[#B91C1C]">
                    <span>Customer Stance: Frustrated (Delayed Transfer)</span>
                  </div>
                </div>

                {/* Agent turn with empathy */}
                <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-[#334155] mb-1">
                    <span className="font-semibold text-[#061C52]">Agent (Amina K.)</span>
                    <span className="font-mono">00:28</span>
                  </div>
                  <p className="text-[#061C52]">
                    &ldquo;Pole sana kwa usumbufu huo Bw. Juma. Naomba nithibitishe namba yako ya simu na transaction reference ili nikusaidie mara moja.&rdquo;
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-white px-2 py-0.5 text-[11px] font-medium text-[#061C52]">
                    <Icon icon={faCheck} size="xs" color="navy" />
                    <span>Swahili Empathy Statement + Mandatory KYC Verification (100%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane: Live QA Evaluation Card & AI Assistant */}
            <div className="border-t border-[#E3EBFB] bg-white/50 p-6 lg:col-span-5 lg:border-t-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#334155]">
                  Scorecard Evaluation
                </span>
                <span className="rounded-none bg-[#061C52] px-2.5 py-0.5 text-xs font-bold text-[#04B6DA]">
                  94% Excellent
                </span>
              </div>

              {/* Parameter Playbook breakdown */}
              <div className="mt-4 space-y-2.5">
                {[
                  { name: "Greeting & Name Disclosure", weight: "15%", score: 100, status: "Hit" },
                  { name: "Customer KYC & Identification", weight: "25%", score: 100, status: "Hit" },
                  { name: "Empathy & Active Listening", weight: "20%", score: 95, status: "Hit" },
                  { name: "Dispute Resolution & Clarity", weight: "30%", score: 90, status: "Hit" },
                  { name: "Polite Closing & Survey Notice", weight: "10%", score: 100, status: "Hit" },
                ].map((item) => (
                  <div key={item.name} className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#061C52]">{item.name}</span>
                      <span className="text-xs font-bold text-[#334155]">{item.score}%</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#334155]">
                      <span>Weight: {item.weight}</span>
                      <span className="font-semibold text-[#061C52]">Result: {item.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compliance Box */}
              <div className="mt-4 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-3.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-none bg-[#B91C1C]" />
                  <span className="text-xs font-bold text-[#061C52]">Regulatory Compliance Checks</span>
                </div>
                <p className="mt-1 text-xs text-[#334155]">
                  0 Auto-Zero violations found. Call recording disclosure recited, zero unauthorized promises.
                </p>
              </div>

              {/* Interactive Ask AI Box */}
              <div className="mt-5 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-3 shadow-sm">
                <p className="text-[11px] font-semibold text-[#334155]">Ask about this call...</p>
                <div className="mt-2 flex items-center justify-between rounded-none border border-[#E3EBFB] bg-white px-3 py-2 text-xs text-[#334155]">
                  <span>&ldquo;Why did Dispute Resolution score 90% instead of 100%?&rdquo;</span>
                  <span className="rounded-none bg-[#061C52] px-2 py-1 text-[10px] font-semibold text-[#04B6DA]">
                    Ask AI ↵
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          LOGOS / INTEGRATIONS STRIP
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 pt-16 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#334155]">
          Built with enterprise-grade speech &amp; AI infrastructure
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-sm font-semibold text-[#334155] sm:gap-12">
          <span className="flex items-center gap-2 transition-colors hover:text-[#061C52]">
            <Icon icon={faOpenai} size="sm" color="secondary" /> OpenAI
          </span>
          <span className="flex items-center gap-2 transition-colors hover:text-[#061C52]">
            <span className="h-2 w-2 rounded-none bg-[#061C52]" /> AssemblyAI
          </span>
          <span className="flex items-center gap-2 transition-colors hover:text-[#061C52]">
            <Icon icon={faBolt} size="sm" color="secondary" /> Supabase
          </span>
          <span className="flex items-center gap-2 transition-colors hover:text-[#061C52]">
            <Icon icon={faPhone} size="sm" color="secondary" /> Twilio Voice
          </span>
          <span className="flex items-center gap-2 transition-colors hover:text-[#061C52]">
            <span className="text-[#061C52] font-bold">▲</span> Next.js 16
          </span>
          <span className="flex items-center gap-2 transition-colors hover:text-[#061C52]">
            <Icon icon={faGear} size="sm" color="secondary" /> Asterisk / PBX
          </span>
        </div>
      </section>

      {/* =========================================================================
          SECTION: "BUILT FOR THE WAY YOU WORK" BENTO GRID
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 pt-24 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-3 py-1 text-xs font-semibold text-[#061C52] shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-none bg-[#B91C1C]" />
              <span>How it works Zetro</span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#061C52] sm:text-4xl">
              Built for the way your <br />contact center works
            </h2>
          </div>

          <div className="max-w-md">
            <p className="text-[14px] leading-relaxed text-[#334155]">
              Advanced features that give QA managers full control, 100% coverage, and automated scorecard evaluations designed for bilingual teams.
            </p>
            <div className="mt-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#061C52] shadow-2xs transition-colors hover:bg-white"
              >
                <span>Upload your scorecard</span>
                <span className="text-[#334155] font-bold">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Card 1: Large left card (Span 7) */}
          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-8 shadow-xs md:col-span-7">
            <h3 className="text-xl font-bold tracking-tight text-[#061C52]">
              Your words, perfected by AI
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#334155]">
              Zetro speech models are trained on real contact-center workflows to understand natural Swahili and English code-switching, correcting phonetic artifacts while preserving every word.
            </p>

            {/* Visual audio waveforms with vertical brackets */}
            <div className="mt-8 rounded-none border border-[#E3EBFB] bg-white/40 p-6">
              <div className="relative space-y-4">
                <div className="absolute top-2 bottom-2 left-6 w-1 border-l-2 border-[#B91C1C]" />
                <div className="absolute top-2 bottom-2 right-12 w-1 border-r-2 border-[#B91C1C]" />

                <div className="flex items-center gap-3 pl-8 text-xs font-mono">
                  <span className="text-[#334155]">|||||||||||</span>
                  <span className="text-[#061C52]">This call is being audited in real time...</span>
                </div>
                <div className="flex items-center gap-3 pl-8 text-xs font-mono">
                  <span className="text-[#334155]">|||||||||||</span>
                  <span className="text-[#B91C1C] font-bold underline decoration-[#04B6DA]">Understands</span>
                  <span className="text-[#061C52]">your Swahili words and slang...</span>
                </div>
                <div className="flex items-center gap-3 pl-8 text-xs font-mono">
                  <span className="text-[#334155]">|||||||||||</span>
                  <span className="text-[#334155] font-bold">Cleans up ASR noise</span>
                  <span className="text-[#061C52]">without changing meaning...</span>
                </div>
                <div className="flex items-center gap-3 pl-8 text-xs font-mono">
                  <span className="text-[#334155]">|||||||||||</span>
                  <span className="text-[#061C52]">No lost words. No translation hallucination.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Top right card (Span 5) */}
          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-8 shadow-xs md:col-span-5">
            <h3 className="text-xl font-bold tracking-tight text-[#061C52]">
              Scorecard rules, your way
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#334155]">
              Set your tone and rules. From compliance Auto-Zero triggers to weighted spreadsheet parameters, Zetro adapts to your scorecard automatically.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-4 py-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Icon icon={faScaleBalanced} size="xs" chip="surface" />
                  <div>
                    <p className="text-xs font-semibold text-[#061C52]">Auto-Zero on Missing Disclosure</p>
                    <p className="text-[11px] text-[#334155]">Critical regulatory clause check</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRuleToggle(!activeRuleToggle)}
                  className={`h-5 w-9 rounded-none p-0.5 transition-colors ${
                    activeRuleToggle ? "bg-[#061C52]" : "bg-[#E3EBFB]"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-none bg-[#04B6DA] transition-transform ${
                      activeRuleToggle ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-none border border-[#E3EBFB] bg-white/40 px-4 py-3 text-xs">
                <span className="font-medium text-[#334155]">Hold time limit warning</span>
                <span className="font-mono font-semibold text-[#061C52]">60 seconds</span>
              </div>
            </div>
          </div>

          {/* Card 3: Bottom left card (Span 4) */}
          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-7 shadow-xs md:col-span-4">
            <h3 className="text-lg font-bold tracking-tight text-[#061C52]">
              Custom dictionary
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
              Teach Zetro the words you use most: telecom codes, tariff names, and local products.
            </p>

            {/* Interactive Add Term input */}
            <form onSubmit={addTerm} className="mt-5 flex items-center gap-2">
              <input
                type="text"
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                placeholder="Add new term..."
                className="w-full rounded-none border border-[#E3EBFB] bg-white px-3 py-2 text-xs text-[#061C52] placeholder:text-[#334155]/60 focus:border-[#061C52] focus:bg-[#FFFFFF] focus:outline-hidden"
              />
              <button
                type="submit"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#061C52] text-[#04B6DA] shadow-xs hover:bg-[#061C52]"
              >
                +
              </button>
            </form>

            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {dictionaryWords.map((word) => (
                <span
                  key={word}
                  className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-medium text-[#061C52] shadow-2xs"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4: Bottom center card (Span 4) */}
          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-7 shadow-xs md:col-span-4">
            <h3 className="text-lg font-bold tracking-tight text-[#061C52]">
              Speaks your language
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
              Understands Tanzanian Swahili, Kenyan Swahili, Sheng, and English with zero manual translation delays.
            </p>

            <div className="mt-6 flex items-center justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-none border border-dashed border-[#E3EBFB]">
                <div className="grid h-12 w-12 place-items-center rounded-none bg-[#061C52] shadow-md">
                  <Icon icon={faGlobe} size="lg" color="accent" />
                </div>
                <span className="absolute -top-1 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold text-[#061C52] shadow-2xs">
                  TZ Swahili
                </span>
                <span className="absolute -bottom-1 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold text-[#061C52] shadow-2xs">
                  KE Sheng
                </span>
                <span className="absolute -right-2 rounded-none border border-[#E3EBFB] bg-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold text-[#061C52] shadow-2xs">
                  English
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Bottom right card (Span 4) */}
          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-7 shadow-xs md:col-span-4">
            <h3 className="text-lg font-bold tracking-tight text-[#061C52]">
              Secure call storage
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
              Encrypted in private storage buckets. Data stays strictly inside your workspace and is never used to train public LLMs.
            </p>

            <div className="mt-6 space-y-2 rounded-none border border-[#E3EBFB] bg-white/40 p-4 text-xs">
              <div className="flex items-center justify-between text-[#334155]">
                <span>Row Level Security (RLS)</span>
                <span className="font-semibold text-[#061C52]">Enforced</span>
              </div>
              <div className="flex items-center justify-between text-[#334155]">
                <span>Call Audio Retention</span>
                <span className="font-semibold text-[#061C52]">Configurable</span>
              </div>
              <div className="flex items-center justify-between text-[#334155]">
                <span>PII Redaction</span>
                <span className="font-semibold text-[#B91C1C]">Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          EDITORIAL TYPOGRAPHY STATEMENT — BOLD BLUE FANTASTIC BAND
         ========================================================================= */}
      <section className="w-full bg-[#061C52] py-20 my-12 text-center text-white border-y border-[#039EBE] shadow-inner">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-none border border-[#E3EBFB]/40 bg-[#061C52] px-3.5 py-1 text-xs font-semibold text-[#04B6DA] mb-6">
            <span>The New Standard in Call Quality</span>
          </div>
          <p className="font-display text-2xl font-bold leading-relaxed tracking-tight text-white sm:text-3xl lg:text-4xl">
            &ldquo;The new standard for call centers: leaving random 1% sampling behind — scoring every call with exact compliance, bilingual precision, and coaching insights.&rdquo;
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#334155]">
            Zetro Automated Quality Assurance
          </p>
        </div>
      </section>

      {/* =========================================================================
          SECTION: STREAMING MODE BUILT FOR PRECISE AUDITING
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
        <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-none border border-[#E3EBFB] bg-white px-3 py-1 text-xs font-semibold text-[#061C52]">
              <span className="h-1.5 w-1.5 rounded-none bg-[#B91C1C]" />
              <span>Precision Audits</span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#061C52] sm:text-4xl">
              Auditing workspace built for actionable coaching
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#334155]">
              Listen to the exact timestamp of customer friction, review why points were held back, and share constructive 1-on-1 feedback in minutes.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-none border border-[#E3EBFB] bg-white/40 p-6">
              <Icon icon={faBolt} size="md" chip="navy" />
              <h3 className="mt-3 font-bold text-[#061C52]">Zero Auditor Fatigue</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
                Auditors get tired after 15 calls. Zetro audits call #1 and call #10,000 with the exact same rigor and compliance attention.
              </p>
            </div>

            <div className="rounded-none border border-[#E3EBFB] bg-white/40 p-6">
              <Icon icon={faBullseye} size="md" chip="navy" color="light" />
              <h3 className="mt-3 font-bold text-[#061C52]">Tethered Audio Quotes</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
                No disputes during the weekly huddle. Every score citation includes the exact seconds in the audio where the behavior occurred.
              </p>
            </div>

            <div className="rounded-none border border-[#E3EBFB] bg-white/40 p-6">
              <Icon icon={faChartColumn} size="md" chip="navy" color="light" />
              <h3 className="mt-3 font-bold text-[#061C52]">Agent Leaderboard</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
                Identify top performers, spot emerging coaching trends, and export multi-sheet Excel reports with a single click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: CUSTOMER TESTIMONIALS
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">User Feedback</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#061C52] sm:text-4xl">
            People love using Zetro for their most important calls
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-6 shadow-xs">
            <p className="text-[13px] leading-relaxed text-[#061C52]">
              &ldquo;We went from auditing 30 calls a month per agent to scoring 100% of calls. It completely transformed our coaching huddles. Agents trust the scores because they can click and listen to their own words.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-none bg-[#061C52] text-xs font-bold text-[#04B6DA]">
                AM
              </div>
              <div>
                <p className="text-xs font-bold text-[#061C52]">Amina Mwangi</p>
                <p className="text-[11px] text-[#334155]">Head of QA · FinTech BPO, Dar es Salaam</p>
              </div>
            </div>
          </div>

          {/* Highlight Card using solid dark navy palette */}
          <div className="flex flex-col justify-between rounded-none p-6 bg-[#061C52] border border-[#039EBE] text-white shadow-md">
            <div>
              <span className="rounded-none bg-[#061C52] border border-[#E3EBFB]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#04B6DA] tracking-wide">
                Key Performance Stat
              </span>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">99.4%</p>
              <p className="mt-1 text-sm text-white/90">
                Agreement rate with our senior master auditors across 12,000 scored customer calls.
              </p>
            </div>
            <div className="mt-6 text-xs text-[#334155]">
              Verified East African Contact Center Benchmark
            </div>
          </div>

          <div className="rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-6 shadow-xs">
            <p className="text-[13px] leading-relaxed text-[#061C52]">
              &ldquo;Other tools couldn&apos;t handle Swahili and English mixed together in the same breath. Zetro&apos;s bilingual accuracy is unlike anything we&apos;ve tested. It caught critical regulatory slips on day one.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-none bg-[#061C52] text-xs font-bold text-white">
                DO
              </div>
              <div>
                <p className="text-xs font-bold text-[#061C52]">David Omondi</p>
                <p className="text-[11px] text-[#334155]">Director of Operations · Telecom, Nairobi</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: PRICING CARDS
         ========================================================================= */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#04B6DA]">Official Tanzania Pricing (TZS)</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#061C52] sm:text-4xl">
            Pay only for what you score
          </h2>
          <p className="mt-2 max-w-2xl mx-auto text-sm text-[#334155]">
            Unit of sale is one scored call, priced by recorded audio length and monthly volume. Invoiced monthly in TZS (excluding 18% VAT). No online checkout — invoices sent directly.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: Starter / Free Trial */}
          <div className="flex flex-col justify-between rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-8 shadow-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#334155]">Pilot Evaluation</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-[#061C52]">Free Trial</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-[#061C52]">0 TZS</span>
                <span className="text-xs text-[#334155]">/ first 50 calls</span>
              </div>
              <p className="mt-1 text-xs text-[#334155]">Full audit on your own custom scorecard</p>

              <div className="my-6 border-t border-[#E3EBFB]" />

              <ul className="space-y-3 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>50 free scored calls on your scorecard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Swahili &amp; English bilingual transcription</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Custom scorecard extraction (.xlsx/.docx)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Auto-Zero compliance &amp; script fail alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>1 trial per company · No credit card required</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/signup"
                className="block w-full rounded-none border border-[#061C52] bg-white py-2.5 text-center text-xs font-semibold text-[#061C52] shadow-2xs transition-colors hover:bg-[#F3F6FD]"
              >
                Start Free 50-Call Trial
              </Link>
            </div>
          </div>

          {/* Card 2: Annual Agreement (Highlighted) */}
          <div className="relative flex flex-col justify-between rounded-none border-2 border-[#04B6DA] bg-white p-8 shadow-md">
            <span className="absolute -top-3 right-6 rounded-none bg-[#04B6DA] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
              Recommended · Save 10%
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#04B6DA]">12-Month Agreement</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-[#061C52]">From 158 TZS</span>
                <span className="text-xs text-[#334155]">/ scored call</span>
              </div>
              <p className="mt-1 text-xs text-[#334155]">Short calls (≤5 min) · 100,000 TZS setup waived</p>

              <div className="my-4 border border-[#E3EBFB] bg-[#F3F6FD] p-2.5 text-[11px] text-[#061C52]">
                <div className="flex justify-between py-0.5 font-medium">
                  <span>Up to 5 min (Short):</span>
                  <span className="font-bold text-[#061C52]">158 TZS</span>
                </div>
                <div className="flex justify-between py-0.5 font-medium">
                  <span>5–10 min (Medium):</span>
                  <span className="font-bold text-[#061C52]">252 TZS</span>
                </div>
                <div className="flex justify-between py-0.5 font-medium">
                  <span>10–15 min (Long):</span>
                  <span className="font-bold text-[#061C52]">378 TZS</span>
                </div>
              </div>

              <div className="my-4 border-t border-[#E3EBFB]" />

              <ul className="space-y-3 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="accent" />
                  <span><strong>10% discount</strong> across every length band</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="accent" />
                  <span><strong>100,000 TZS setup fee WAIVED</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>500,000 TZS monthly minimum billing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>90 days audio recording storage included</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Re-scoring calls at half price</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/pricing"
                className="block w-full rounded-none bg-[#04B6DA] py-2.5 text-center text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#039EBE]"
              >
                Open Pricing Calculator
              </Link>
            </div>
          </div>

          {/* Card 3: Monthly Agreement & Volume */}
          <div className="flex flex-col justify-between rounded-none border border-[#E3EBFB] bg-[#FFFFFF] p-8 shadow-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#334155]">Month-to-Month</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-[#061C52]">Monthly Option</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-[#061C52]">From 175 TZS</span>
                <span className="text-xs text-[#334155]">/ scored call</span>
              </div>
              <p className="mt-1 text-xs text-[#334155]">Flexible month-to-month commitments</p>

              <div className="my-4 border border-[#E3EBFB] bg-[#F3F6FD] p-2.5 text-[11px] text-[#061C52]">
                <div className="flex justify-between py-0.5 font-medium">
                  <span>Up to 10k calls:</span>
                  <span className="font-bold text-[#061C52]">175 / 280 / 420 TZS</span>
                </div>
                <div className="flex justify-between py-0.5 font-medium">
                  <span>10k–30k calls:</span>
                  <span className="font-bold text-[#061C52]">165 / 265 / 395 TZS</span>
                </div>
                <div className="flex justify-between py-0.5 font-medium">
                  <span>30k–100k calls:</span>
                  <span className="font-bold text-[#061C52]">160 / 250 / 370 TZS</span>
                </div>
              </div>

              <div className="my-4 border-t border-[#E3EBFB]" />

              <ul className="space-y-3 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>No 12-month lock-in; cancel anytime</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>100,000 TZS one-time setup &amp; calibration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Excess calls billed at same contract rate</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Multi-sheet Excel workbook export</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon={faCheck} size="xs" color="navy" />
                  <span>Invoiced monthly in TZS (30-day payment)</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/talk-sales"
                className="block w-full rounded-none border border-[#061C52] bg-[#061C52] py-2.5 text-center text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#0A3299]"
              >
                Request Sales Contract
              </Link>
            </div>
          </div>
        </div>

        {/* Banner linking to full pricing page */}
        <div className="mt-10 border border-[#E3EBFB] bg-[#F3F6FD] p-6 text-center">
          <p className="text-sm font-bold text-[#061C52]">
            Want to see how much you save vs a human QA team?
          </p>
          <p className="mt-1 text-xs text-[#334155]">
            Replacing a human QA team scoring 20,000 calls saves 34% to 42% in monthly operations. Use our interactive calculator to model your floor.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-none bg-[#061C52] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0A3299]"
            >
              <span>Explore Pricing Calculator &amp; Worked Examples &rarr;</span>
            </Link>
            <span className="text-xs text-[#334155]">
              Questions? Invoicing is handled via Clevermargininc@gmail.com
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: FAQ ACCORDION
         ========================================================================= */}
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">FAQ</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#061C52]">
            Frequently asked questions
          </h2>
        </div>
        <FaqAccordion />
      </section>

      {/* =========================================================================
          SECTION: BOTTOM CTA BANNER
         ========================================================================= */}
      <section className="mx-auto max-w-6xl px-6 pt-12 lg:px-8">
        <div className="relative overflow-hidden rounded-none border border-[#E3EBFB] bg-[#04B6DA] p-8 sm:p-12 text-white border border-[#039EBE] shadow-xl">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
            <div className="md:col-span-7 space-y-4">
              <span className="rounded-none border border-[#E3EBFB]/40 bg-[#FFFFFF]/10 px-3 py-1 text-xs font-semibold text-[#04B6DA]">
                Get started today
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Let your calls coach your team.
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-[#334155]">
                Upload your scorecard and start scoring your team&apos;s calls in under 60 seconds. We load your criteria and rules automatically.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="rounded-none bg-white px-6 py-2.5 text-xs font-bold text-[#061C52] hover:bg-[#F3F6FD] shadow-xs transition-opacity hover:opacity-90"
                >
                  Start auditing free →
                </Link>
                <Link
                  href="/talk-sales"
                  className="rounded-none border border-[#E3EBFB] bg-[#061C52] px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#061C52]"
                >
                  Talk to sales
                </Link>
              </div>
            </div>

            {/* Right Mini Card Preview */}
            <div className="md:col-span-5 flex justify-center">
              <div className="w-full max-w-xs rounded-none border border-[#039EBE] bg-[#061C52] p-5 shadow-sm text-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">QA Pass Rate</span>
                  <span className="rounded-none bg-[#061C52] border border-[#04B6DA]/40 px-2 py-0.5 text-[10px] font-bold text-[#04B6DA]">
                    100% Passed
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-full rounded-none bg-[#061C52]">
                    <div className="h-2 w-full rounded-none bg-[#04B6DA]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#334155]">
                    <span>Active Team: 14 Agents</span>
                    <span className="font-mono font-semibold text-white">1,248 calls</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
