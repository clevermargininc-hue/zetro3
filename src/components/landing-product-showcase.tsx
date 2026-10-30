"use client";

import { useState } from "react";

type ShowcaseTab = "diarization" | "scorecard" | "coaching";

export function LandingProductShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("diarization");

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 p-1.5 shadow-xs backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab("diarization")}
            className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 ${
              activeTab === "diarization"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Speech &amp; Diarization
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scorecard")}
            className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 ${
              activeTab === "scorecard"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Weight &amp; Rules Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("coaching")}
            className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 ${
              activeTab === "coaching"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Supervisor Huddle Brief
          </button>
        </div>
      </div>

      {/* Showcase Frame */}
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-2xl shadow-indigo-500/8 backdrop-blur-xl transition-all duration-300">
        {/* macOS Window Chrome */}
        <div className="flex items-center justify-between border-b border-black/[0.05] bg-neutral-50/90 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
            </div>
            <div className="h-4 w-px bg-neutral-200" />
            <span className="font-mono text-xs text-neutral-500">
              {activeTab === "diarization" && "stream://audio-session-8491.mp3 · Bilingual Inbound"}
              {activeTab === "scorecard" && "rules://company-scorecard-v2.xlsx · 100% Extracted"}
              {activeTab === "coaching" && "huddle://agent-sarah-k · Floor Team B Brief"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Audit Mode
            </span>
          </div>
        </div>

        {/* Tab 1: Diarization Stream */}
        {activeTab === "diarization" && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Audio Waveform Player */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white shadow-xs">
                  <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0f172a]">Call Recording #TZ-4019</p>
                  <p className="text-[11px] text-neutral-500">Duration 04:12 · Agent Sarah K. · Inbound Telecom</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 h-6">
                {[30, 60, 40, 85, 100, 45, 70, 95, 60, 35, 80, 90, 40, 65, 85, 50, 75, 90, 40, 60].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-blue transition-all duration-300"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Utterance Stream */}
            <div className="space-y-4">
              {/* Customer */}
              <div className="flex items-start gap-3 rounded-2xl border border-black/[0.04] bg-neutral-50/50 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                  C
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-[#0f172a]">Customer (Kiswahili)</span>
                    <span className="font-mono text-[11px] text-neutral-400">00:18</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-neutral-800">
                    &ldquo;Habari, nimejaribu kutuma muamala lakini nimekatwa mara mbili bila kupata huduma.&rdquo;
                  </p>
                </div>
              </div>

              {/* Agent */}
              <div className="flex items-start gap-3 rounded-2xl border border-blue/20 bg-blue-soft/30 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue text-xs font-bold text-white">
                  A
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-blue">Agent (Code-switching bilingual)</span>
                    <span className="font-mono text-[11px] text-blue font-medium">00:32</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-[#0f172a]">
                    &ldquo;Pole sana kwa usumbufu huo. Let me pull up your transaction reference right now to verify the duplicate deduction.&rdquo;
                  </p>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                    ✓
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-900">Empathy &amp; Immediate Ownership Validated</p>
                    <p className="text-[12px] text-emerald-700">Swahili greeting policy fulfilled alongside clear English next step.</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800">Score 5.0/5.0</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Scorecard Engine */}
        {activeTab === "scorecard" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
              <div>
                <h4 className="text-[15px] font-semibold text-[#0f172a]">Preserved Weights from Excel</h4>
                <p className="text-xs text-neutral-500">Document: Scorecard_Floor_2026.xlsx · 3 Multi-sheet sections</p>
              </div>
              <span className="font-mono text-xs font-semibold text-blue bg-blue-soft px-3 py-1 rounded-full">
                Total Weights 100%
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-black/[0.04] bg-neutral-50/60 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue">01</span>
                    <span className="text-[14px] font-semibold text-[#0f172a]">Customer ID &amp; OTP Verification</span>
                    <span className="rounded-full border border-black/[0.06] bg-white px-2 py-0.5 font-mono text-[10px] text-neutral-500">
                      25% weight
                    </span>
                  </div>
                  <p className="text-[12px] text-neutral-500 mt-1 pl-6">Mandatory national ID check before account disclosure</p>
                </div>
                <span className="font-semibold text-emerald-700 text-sm">5.0 / 5.0 (Passed)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-black/[0.04] bg-neutral-50/60 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue">02</span>
                    <span className="text-[14px] font-semibold text-[#0f172a]">Regulatory Fee &amp; Privacy Script</span>
                    <span className="rounded-full border border-black/[0.06] bg-white px-2 py-0.5 font-mono text-[10px] text-neutral-500">
                      30% weight
                    </span>
                  </div>
                  <p className="text-[12px] text-neutral-500 mt-1 pl-6">Disclosed transaction fee and data protection terms</p>
                </div>
                <span className="font-semibold text-emerald-700 text-sm">Safe (No breaches)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-black/[0.04] bg-neutral-50/60 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue">03</span>
                    <span className="text-[14px] font-semibold text-[#0f172a]">Resolution &amp; Professional Courtesy</span>
                    <span className="rounded-full border border-black/[0.06] bg-white px-2 py-0.5 font-mono text-[10px] text-neutral-500">
                      45% weight
                    </span>
                  </div>
                  <p className="text-[12px] text-neutral-500 mt-1 pl-6">Active reassurance and confirmed ticket tracking SMS</p>
                </div>
                <span className="font-semibold text-emerald-700 text-sm">4.6 / 5.0</span>
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.05] bg-neutral-50/80 p-4 flex items-center justify-between text-xs text-neutral-600">
              <span className="font-medium">Auto-Zero Clause Status:</span>
              <span className="font-semibold text-emerald-700">Protected · No regulatory breaches</span>
            </div>
          </div>
        )}

        {/* Tab 3: Coaching Huddle */}
        {activeTab === "coaching" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-black/[0.05] pb-4">
              <div>
                <h4 className="text-[15px] font-semibold text-[#0f172a]">Weekly 1-on-1 Supervisor Brief</h4>
                <p className="text-xs text-neutral-500">Agent Sarah K. · Floor Team B · Weekly Average: 93%</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-neutral-800 transition-colors"
              >
                <span>Export PDF</span>
                <span>↓</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Recognized Strength
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-neutral-800">
                  Exceptional patience and calm tone while navigating the duplicate deduction panic. Customer de-escalated in under 45 seconds.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Coaching Focus
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-neutral-800">
                  Remember to offer the ticket SMS reference code proactively before asking the customer if they have any other questions.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4 text-[13px] text-neutral-600">
              <span className="font-semibold text-[#0f172a]">Proof Timestamp:</span>
              <span className="italic ml-2 text-neutral-800">&ldquo;Ngoja nikuweke hold kidogo wakati naangalia system...&rdquo; (at 01:14)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
