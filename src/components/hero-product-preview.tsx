"use client";

import { useState } from "react";

export function HeroProductPreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"scorecard" | "quotes">("scorecard");

  return (
    <div className="w-full">
      {/* Crisp border card matching Pricing & Solutions pages */}
      <div className="border border-line bg-white shadow-xs">
        {/* Card Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center bg-blue-soft text-blue text-xs font-bold">
              QA
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">Agent Sarah K.</span>
                <span className="text-[11px] text-muted">· Call #CS-8921</span>
              </div>
              <p className="text-[11px] text-muted">Inbound Escalation · 4m 12s · Mobile Money</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="chip chip-ok font-semibold">94% Passed QA</span>
          </div>
        </div>

        {/* Audio Player Strip */}
        <div className="border-b border-line bg-white px-5 py-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex h-7 w-7 items-center justify-center bg-blue text-white hover:bg-blue-2 transition-transform active:scale-95"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
              <span className="font-mono text-[11px] text-muted tabular-nums">
                {isPlaying ? "01:45" : "00:00"} / 04:12
              </span>
            </div>

            <span className="chip">Bilingual · SWA + ENG</span>
          </div>

          {/* Sound wave bars */}
          <div className="mt-2.5 flex h-6 items-center gap-0.5 sm:gap-1">
            {[
              25, 45, 70, 35, 85, 95, 40, 60, 80, 100, 75, 40, 55, 90, 85, 30, 65, 92, 45, 78,
              62, 88, 35, 70, 95, 60, 40, 75, 90, 50, 65, 82, 38, 72, 89, 55, 40, 60, 30, 20
            ].map((height, i) => (
              <div
                key={i}
                className={`flex-1 transition-all duration-300 ${
                  i < 16
                    ? "bg-blue"
                    : i === 16
                    ? "bg-blue-3 ring-1 ring-blue"
                    : "bg-line hover:bg-muted/40"
                }`}
                style={{
                  height: isPlaying ? `${Math.max(20, (height + (i % 3) * 15) % 100)}%` : `${height}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Tab Controls (Matching pricing CycleToggle / tab style) */}
        <div className="flex border-b border-line bg-bg text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("scorecard")}
            className={`px-5 py-2.5 transition-colors border-r border-line ${
              activeTab === "scorecard"
                ? "bg-white text-ink border-b-2 border-b-blue font-bold"
                : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            Scorecard Breakdown (Company Rules)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quotes")}
            className={`px-5 py-2.5 transition-colors ${
              activeTab === "quotes"
                ? "bg-white text-ink border-b-2 border-b-blue font-bold"
                : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            Timestamped Quotes
          </button>
        </div>

        {/* Content Body */}
        {activeTab === "scorecard" ? (
          <div className="divide-y divide-line text-[13px]">
            <div className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">1. Security &amp; Verification</span>
                  <span className="text-[11px] text-muted">(25% wt)</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">ID confirmed via national 2FA verification</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-good tabular-nums">5.0</span>
                <span className="text-[11px] text-muted"> / 5.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">2. Regulatory Disclosure</span>
                  <span className="text-[11px] text-muted">(30% wt)</span>
                  <span className="chip chip-ok text-[10px]">Auto-Zero Safe</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">Mandatory privacy disclosure delivered in full</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-good tabular-nums">5.0</span>
                <span className="text-[11px] text-muted"> / 5.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">3. Empathy &amp; Bilingual Tone</span>
                  <span className="text-[11px] text-muted">(20% wt)</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">Swahili greeting and calm reassurance maintained</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-ink tabular-nums">4.5</span>
                <span className="text-[11px] text-muted"> / 5.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">4. First Contact Resolution</span>
                  <span className="text-[11px] text-muted">(25% wt)</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">Ticket reference dispatched and confirmed</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-good tabular-nums">4.8</span>
                <span className="text-[11px] text-muted"> / 5.0</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line text-[13px]">
            <div className="px-5 py-3.5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                <span className="font-semibold text-blue">01:14 · Agent (Kiswahili)</span>
                <span className="chip">Empathy Standard</span>
              </div>
              <p className="text-ink text-[12px] italic">
                &ldquo;Pole sana kwa kuchelewa, nimefungua taarifa yako sasa hivi tuangalie salio lako lililokwama.&rdquo;
              </p>
            </div>

            <div className="px-5 py-3.5 hover:bg-surface-2 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                <span className="font-semibold text-blue">02:40 · Agent (English)</span>
                <span className="chip chip-ok">Compliance Rule 4.2</span>
              </div>
              <p className="text-ink text-[12px] italic">
                &ldquo;Your transaction ID #TX-9022 is reversed back to your account within 15 minutes, as per banking policy.&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Card Footer Bar */}
        <div className="flex items-center justify-between border-t border-line bg-bg px-5 py-2.5 text-[11px] text-muted">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            <span>Bound to uploaded scorecard document</span>
          </div>
          <span className="font-mono text-[10px] text-muted font-semibold">100% AUDITED</span>
        </div>
      </div>
    </div>
  );
}
