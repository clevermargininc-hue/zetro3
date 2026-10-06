"use client";

import { useState } from "react";

const ROWS = [
  { name: "Security & verification", weight: "25%", note: "ID confirmed", score: "5.0", ok: true },
  { name: "Regulatory disclosure", weight: "30%", note: "Privacy script delivered", score: "5.0", ok: true },
  { name: "Empathy & bilingual tone", weight: "20%", note: "Swahili greeting held", score: "4.5", ok: false },
  { name: "First contact resolution", weight: "25%", note: "Ticket sent and confirmed", score: "4.8", ok: true },
];

export function HeroProductPreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"scorecard" | "quotes">("scorecard");

  return (
    <div className="w-full min-w-0 overflow-hidden border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">Agent Sarah K.</p>
          <p className="truncate text-[11px] text-muted">Inbound · 4m 12s · Mobile money</p>
        </div>
        <span className="chip chip-ok shrink-0 font-semibold">94%</span>
      </div>

      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-7 w-7 shrink-0 items-center justify-center bg-blue text-white hover:bg-blue-2"
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
          <span className="chip shrink-0">SWA + ENG</span>
        </div>
        <div className="mt-2 flex h-5 items-center gap-px">
          {[25, 45, 70, 35, 85, 95, 40, 60, 80, 100, 75, 40, 55, 90, 85, 30, 65, 92, 45, 78, 62, 88, 35, 70, 95, 60, 40, 75, 90, 50].map(
            (height, i) => (
              <div
                key={i}
                className={`min-w-0 flex-1 ${i < 12 ? "bg-blue" : "bg-line"}`}
                style={{ height: `${height}%` }}
              />
            ),
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-line bg-bg text-[12px] font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("scorecard")}
          className={`px-4 py-2.5 text-left ${
            activeTab === "scorecard" ? "border-b-2 border-blue bg-white text-ink" : "text-muted hover:text-ink"
          }`}
        >
          Scorecard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quotes")}
          className={`px-4 py-2.5 text-left ${
            activeTab === "quotes" ? "border-b-2 border-blue bg-white text-ink" : "text-muted hover:text-ink"
          }`}
        >
          Quotes
        </button>
      </div>

      {activeTab === "scorecard" ? (
        <div className="divide-y divide-line text-[13px]">
          {ROWS.map((row) => (
            <div key={row.name} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {row.name} <span className="font-normal text-muted">{row.weight}</span>
                </p>
                <p className="truncate text-[11px] text-muted">{row.note}</p>
              </div>
              <span className={`shrink-0 tabular-nums ${row.ok ? "font-semibold text-good" : "font-semibold text-ink"}`}>
                {row.score}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-line text-[13px]">
          <div className="px-4 py-3">
            <p className="text-[11px] font-semibold text-blue">01:14 · Kiswahili</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink">
              “Pole sana kwa kuchelewa, nimefungua taarifa yako sasa hivi.”
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[11px] font-semibold text-blue">02:40 · English</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink">
              “Your transaction ID #TX-9022 is reversed within 15 minutes.”
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
