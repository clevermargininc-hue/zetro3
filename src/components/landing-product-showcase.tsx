"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

type ShowcaseTab = "diarization" | "scorecard" | "coaching";

const SHOWCASE_WAVEFORM = [30, 60, 40, 85, 100, 45, 70, 95, 60, 35, 80, 90, 40, 65, 85, 50, 75, 90, 40, 60];

export function LandingProductShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("diarization");
  const [isPlaying, setIsPlaying] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex justify-center mb-8">
        <div
          role="tablist"
          aria-label="Product showcase tabs"
          className="inline-flex flex-wrap justify-center items-center gap-1.5 rounded-full border border-line bg-surface-2 p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "diarization"}
            onClick={() => setActiveTab("diarization")}
            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "diarization"
                ? "bg-blue text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Speech &amp; Diarization
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "scorecard"}
            onClick={() => setActiveTab("scorecard")}
            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "scorecard"
                ? "bg-blue text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Weight &amp; Rules Engine
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "coaching"}
            onClick={() => setActiveTab("coaching")}
            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
              activeTab === "coaching"
                ? "bg-blue text-white shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Supervisor Huddle Brief
          </button>
        </div>
      </div>

      {/* Showcase Frame */}
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-line bg-white shadow-md transition-all duration-300">
        {/* Window Chrome */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
            </div>
            <div className="h-4 w-px bg-line" />
            <span className="font-mono text-xs text-muted">
              {activeTab === "diarization" && "stream://audio-session-8491.mp3 · Bilingual Inbound"}
              {activeTab === "scorecard" && "rules://company-scorecard-v2.xlsx · 100% Extracted"}
              {activeTab === "coaching" && "huddle://agent-sarah-k · Floor Team B Brief"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft border border-[#99F6E4] px-2.5 py-0.5 text-[11px] font-semibold text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Live Audit Mode
            </span>
          </div>
        </div>

        {/* Tab 1: Diarization Stream */}
        {activeTab === "diarization" && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Audio Waveform Player */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  aria-label={isPlaying ? "Pause sample call" : "Play sample call"}
                  aria-pressed={isPlaying}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white shadow-xs hover:bg-blue-strong transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5 fill-current" />
                  )}
                </button>
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    {isPlaying ? "Playing #TZ-4019 · 00:32 / 04:12" : "Call Recording #TZ-4019"}
                  </p>
                  <p className="text-[11px] text-muted">Duration 04:12 · Agent Sarah K. · Inbound Telecom</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 h-6" aria-hidden="true">
                {SHOWCASE_WAVEFORM.map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isPlaying ? "bg-blue animate-pulse" : "bg-[#94A3B8]"
                    }`}
                    style={{
                      height: `${isPlaying ? Math.max(25, ((h + i * 19) % 95) + 10) : h}%`,
                      animationDelay: `${i * 55}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Utterance Stream */}
            <div className="space-y-4">
              {/* Customer */}
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-ink">
                  C
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-ink">Customer (Kiswahili)</span>
                    <span className="font-mono text-[11px] text-muted">00:18</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-ink-soft">
                    &ldquo;Habari, nimejaribu kutuma muamala lakini nimekatwa mara mbili bila kupata huduma.&rdquo;
                  </p>
                </div>
              </div>

              {/* Agent */}
              <div className="flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-blue-soft p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue text-xs font-bold text-white">
                  A
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-navy">Agent (Code-switching bilingual)</span>
                    <span className="font-mono text-[11px] text-blue">00:32</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-ink">
                    &ldquo;Pole sana kwa usumbufu huo. Let me pull up your transaction reference right now to verify the duplicate deduction.&rdquo;
                  </p>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="rounded-xl border border-[#99F6E4] bg-teal-soft p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white">
                    ✓
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-navy">Empathy &amp; Immediate Ownership Validated</p>
                    <p className="text-[12px] text-[#0F766E]">Swahili greeting policy fulfilled alongside clear English next step.</p>
                  </div>
                </div>
                <span className="rounded bg-white border border-[#99F6E4] px-2.5 py-1 font-mono text-xs font-bold text-teal">Score 5.0/5.0</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Scorecard Engine */}
        {activeTab === "scorecard" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-navy">Preserved Weights from Excel</h3>
                <p className="text-xs text-muted">Document: Scorecard_Floor_2026.xlsx · 3 Multi-sheet sections</p>
              </div>
              <span className="font-mono text-xs font-semibold text-blue bg-blue-soft border border-[#BFDBFE] px-3 py-1 rounded-full">
                Total Weights 100%
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue">01</span>
                    <span className="text-[14px] font-semibold text-ink">Customer ID &amp; OTP Verification</span>
                    <span className="rounded-full border border-line bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">
                      25% weight
                    </span>
                  </div>
                  <p className="text-[12px] text-muted mt-1 pl-6">Mandatory national ID check before account disclosure</p>
                </div>
                <span className="font-bold text-green text-sm">5.0 / 5.0 (Passed)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue">02</span>
                    <span className="text-[14px] font-semibold text-ink">Regulatory Fee &amp; Privacy Script</span>
                    <span className="rounded-full border border-line bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">
                      30% weight
                    </span>
                  </div>
                  <p className="text-[12px] text-muted mt-1 pl-6">Disclosed transaction fee and data protection terms</p>
                </div>
                <span className="font-bold text-green text-sm">Safe (No breaches)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue">03</span>
                    <span className="text-[14px] font-semibold text-ink">Resolution &amp; Professional Courtesy</span>
                    <span className="rounded-full border border-line bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">
                      45% weight
                    </span>
                  </div>
                  <p className="text-[12px] text-muted mt-1 pl-6">Active reassurance and confirmed ticket tracking SMS</p>
                </div>
                <span className="font-bold text-navy text-sm">4.6 / 5.0</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#BBF7D0] bg-green-soft p-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#166534]">Auto-Zero Clause Status:</span>
              <span className="font-bold text-green">Protected · No regulatory breaches</span>
            </div>
          </div>
        )}

        {/* Tab 3: Coaching Huddle */}
        {activeTab === "coaching" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-navy">Weekly 1-on-1 Supervisor Brief</h3>
                <p className="text-xs text-muted">Agent Sarah K. · Floor Team B · Weekly Average: 93%</p>
              </div>
              <button
                type="button"
                onClick={() => setPdfExported(true)}
                className="btn-blue rounded-lg px-4 py-1.5 text-xs"
              >
                <span>{pdfExported ? "Brief Ready ✓" : "Export PDF"}</span>
                {!pdfExported && <span>↓</span>}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-line bg-surface-2 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-green" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-navy">
                    Recognized Strength
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  Exceptional patience and calm tone while navigating the duplicate deduction panic. Customer de-escalated in under 45 seconds.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface-2 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-amber" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-navy">
                    Coaching Focus
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  Remember to offer the ticket SMS reference code proactively before asking the customer if they have any other questions.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-4 text-[13px] text-ink">
              <span className="font-semibold text-navy">Proof Timestamp:</span>
              <span className="italic ml-2 text-ink-soft">&ldquo;Ngoja nikuweke hold kidogo wakati naangalia system...&rdquo; (at 01:14)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
