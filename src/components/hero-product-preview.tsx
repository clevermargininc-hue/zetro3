"use client";

import { useState } from "react";

const CRITERIA = [
  {
    id: "sec-1",
    name: "Customer ID & OTP Verification",
    weight: "25%",
    score: "5.0",
    maxScore: "5.0",
    status: "Passed",
    evidence: "National ID and OTP verified at 00:14",
    pct: 100,
    sheet: "Sheet 1 · Security & KYC",
    formula: "=IF(C4=\"Verified\", 5.0, 0)",
    autoZero: true,
    utteranceIndex: 0,
  },
  {
    id: "sec-2",
    name: "Empathy & Bilingual Tone",
    weight: "20%",
    score: "4.5",
    maxScore: "5.0",
    status: "Passed",
    evidence: "Immediate Swahili de-escalation; warm ownership at 00:26",
    pct: 90,
    sheet: "Sheet 2 · Soft Skills",
    formula: "=AVERAGE(D8:D11)*0.20",
    autoZero: false,
    utteranceIndex: 1,
  },
  {
    id: "sec-3",
    name: "Regulatory Fee Disclosure",
    weight: "30%",
    score: "5.0",
    maxScore: "5.0",
    status: "Passed",
    evidence: "Mandatory BoT refund & fee script read verbatim at 01:08",
    pct: 100,
    sheet: "Sheet 1 · Compliance",
    formula: "=IF(C12=\"Read Verbatim\", 5.0, 0)",
    autoZero: true,
    utteranceIndex: 2,
  },
  {
    id: "sec-4",
    name: "First Contact Resolution (FCR)",
    weight: "25%",
    score: "4.8",
    maxScore: "5.0",
    status: "Passed",
    evidence: "Duplicate deduction ticket SMS confirmed before close at 01:42",
    pct: 96,
    sheet: "Sheet 3 · Resolution",
    formula: "=SUM(E4:E7)*0.25",
    autoZero: false,
    utteranceIndex: 3,
  },
];

const TRANSCRIPT_LINES = [
  {
    time: "00:14",
    speaker: "Customer",
    lang: "Kiswahili",
    text: "Habari, nilituma muamala saa tatu lakini nimekatwa salio mara mbili bila kupata huduma. Namba yangu ya kitambulisho ni 19920418-1102.",
    translation: "Hello, I sent a transaction at 9:00 but my balance was deducted twice without service. My ID number is 19920418-1102.",
    tag: "ID & Issue Verified (25% Wt)",
    criterionIndex: 0,
  },
  {
    time: "00:26",
    speaker: "Agent Sarah K.",
    lang: "Bilingual (SWA + ENG)",
    text: "Pole sana kwa changamoto hiyo. Let me look up your transaction reference right now to verify the duplicate deduction.",
    translation: "Very sorry for that challenge. Let me look up your transaction reference right now to verify the duplicate deduction.",
    tag: "Empathy Verified (20% Wt)",
    criterionIndex: 1,
  },
  {
    time: "01:08",
    speaker: "Agent Sarah K.",
    lang: "English",
    text: "I have confirmed the reversal ticket. As required by BoT guidelines, the refund will reflect within 2 hours without additional transaction fees.",
    translation: "I have confirmed the reversal ticket. As required by BoT guidelines, the refund will reflect within 2 hours without additional transaction fees.",
    tag: "Regulatory Script Read (30% Wt)",
    criterionIndex: 2,
  },
  {
    time: "01:42",
    speaker: "Customer",
    lang: "Kiswahili",
    text: "Asante sana dada, nimepokea ujumbe wa uthibitisho sasa hivi.",
    translation: "Thank you very much sister, I have just received the confirmation SMS right now.",
    tag: "Resolution Confirmed (25% Wt)",
    criterionIndex: 3,
  },
];

const WAVEFORM_BARS = [35, 75, 45, 90, 60, 100, 50, 80, 65, 95, 40, 85, 55, 75, 90, 60, 40, 70, 50, 80];

export function HeroProductPreview() {
  const [activeTab, setActiveTab] = useState<"audit" | "transcript" | "rules">("audit");
  const [activeCriterion, setActiveCriterion] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  return (
    <div className="relative mx-auto w-full max-w-5xl transition-all duration-300">
      {/* Clean Enterprise White Card Container */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white text-left shadow-lg transition-all">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
            </div>
            <div className="h-3.5 w-px bg-line" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-semibold text-navy">SESSION #TZ-9812</span>
              <span className="hidden sm:inline-block text-muted">·</span>
              <span className="hidden sm:inline-block font-mono text-xs text-muted">
                Agent Sarah K. (Floor Team B)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft border border-[#99F6E4] px-2.5 py-0.5 text-[11px] font-semibold text-teal">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                Dual Speaker Diarized
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-green-soft border border-[#BBF7D0] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              <span className="font-mono text-xs font-bold text-green">94.0% Overall</span>
            </div>
          </div>
        </div>

        {/* Console Navigation Strip */}
        <div
          role="tablist"
          aria-label="Audit console preview tabs"
          className="flex items-center justify-between border-b border-line bg-white px-5 sm:px-6 py-2.5 text-xs"
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "audit"}
              onClick={() => setActiveTab("audit")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                activeTab === "audit"
                  ? "bg-blue-soft text-blue border border-[#BFDBFE]"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              Weighted Audit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "transcript"}
              onClick={() => setActiveTab("transcript")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                activeTab === "transcript"
                  ? "bg-blue-soft text-blue border border-[#BFDBFE]"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              Synchronized Transcript
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rules"}
              onClick={() => setActiveTab("rules")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                activeTab === "rules"
                  ? "bg-blue-soft text-blue border border-[#BFDBFE]"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              Extracted Rules (.xlsx)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-muted font-mono text-[11px]">
            <span>Scorecard: Scorecard_Floor_2026.xlsx</span>
            <span className="text-teal font-semibold">● 100% Math Match</span>
          </div>
        </div>

        {/* TAB 1: Main Console Split Area */}
        {activeTab === "audit" && (
          <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line">
            {/* Left Panel: Live Audio Diarization Stream */}
            <div className="lg:col-span-7 p-5 sm:p-6 space-y-4">
              {/* Audio Waveform Player Control */}
              <div className="rounded-xl border border-line bg-surface-2 p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((prev) => !prev)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue text-white shadow-xs hover:bg-blue-strong transition-transform active:scale-95"
                    aria-label={isPlaying ? "Pause sample audio" : "Play sample audio"}
                    aria-pressed={isPlaying}
                  >
                    {isPlaying ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">
                      {isPlaying ? "Playing sample · 01:08 / 04:12" : "04m 12s · Inbound Telecom / Mobile Money"}
                    </p>
                    <p className="text-[11px] font-mono text-muted">
                      Swahili (72%) · English (28%) Code-Switching
                    </p>
                  </div>
                </div>

                {/* Dynamic waveform visualization bars */}
                <div className="flex items-end gap-1 h-6 shrink-0" aria-hidden="true">
                  {WAVEFORM_BARS.map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlaying ? "bg-blue animate-pulse" : "bg-[#94A3B8]"
                      }`}
                      style={{
                        height: `${isPlaying ? Math.max(25, ((h + i * 17) % 95) + 10) : h}%`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Diarization Dialogue Utterances */}
              <div className="space-y-3 font-sans">
                {TRANSCRIPT_LINES.map((line, idx) => {
                  const isLinked = activeCriterion === line.criterionIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveCriterion(line.criterionIndex)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        isLinked
                          ? "border-[#BFDBFE] bg-blue-soft"
                          : "border-line bg-white hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                              isLinked ? "bg-blue text-white" : "bg-surface-3 text-ink"
                            }`}
                          >
                            {line.speaker.charAt(0)}
                          </span>
                          <span className="text-[12px] font-semibold text-ink">{line.speaker}</span>
                          <span className="font-mono text-[10px] text-muted">
                            ({line.lang})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-muted">
                            {line.time}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                              isLinked
                                ? "bg-blue text-white"
                                : "bg-surface-2 border border-line text-ink-soft"
                            }`}
                          >
                            {line.tag}
                          </span>
                        </div>
                      </div>

                      <p className="text-[13px] leading-relaxed text-ink pl-7">
                        &ldquo;{line.text}&rdquo;
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Extracted Criteria & Automated Scoring */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-surface-2/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-navy">
                      Live Scorecard Breakdown
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Click any criterion to highlight transcript evidence
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-teal bg-teal-soft border border-[#99F6E4] px-2.5 py-1 rounded-full">
                    100% Coverage
                  </span>
                </div>

                {/* Criteria List */}
                <div className="space-y-2.5">
                  {CRITERIA.map((crit, idx) => {
                    const selected = activeCriterion === idx;
                    return (
                      <button
                        type="button"
                        key={crit.id}
                        onClick={() => setActiveCriterion(idx)}
                        className={`w-full text-left rounded-xl border p-3 transition-all ${
                          selected
                            ? "border-[#BFDBFE] bg-blue-soft shadow-2xs"
                            : "border-line bg-white hover:bg-surface-2"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                selected ? "bg-blue" : "bg-teal"
                              }`}
                            />
                            <span className="text-[13px] font-semibold text-ink truncate">
                              {crit.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-navy shrink-0">
                            {crit.score} / {crit.maxScore}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted">
                          <span className="truncate">{crit.evidence}</span>
                          <span className="font-mono font-semibold text-ink-soft shrink-0">
                            {crit.weight} weight
                          </span>
                        </div>

                        {/* Micro Progress Bar */}
                        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              selected ? "bg-blue" : "bg-teal"
                            }`}
                            style={{ width: `${crit.pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Zero Clause & Audit Defense Status */}
              <div className="mt-6 pt-4 border-t border-line space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted">Auto-Zero Clause Status:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-green" />
                    Safe · No Breaches
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted font-mono">
                  <span>Diarization Accuracy</span>
                  <span className="text-ink font-semibold">99.4% (Swahili + English)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Full Synchronized Transcript View */}
        {activeTab === "transcript" && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Speaker Talk Ratio
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-navy">
                  Agent 54% · Customer 46%
                </p>
                <p className="mt-0.5 text-[11px] text-muted">Zero dead-air holds &gt; 15s detected</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Language Code-Switching
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-navy">
                  Kiswahili 72% · English 28%
                </p>
                <p className="mt-0.5 text-[11px] text-muted">Native bilingual ASR + side-by-side gloss</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Sentiment Trajectory
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-teal">
                  Frustrated → Relieved (+84%)
                </p>
                <p className="mt-0.5 text-[11px] text-muted">De-escalated within 38 seconds</p>
              </div>
            </div>

            <div className="space-y-3">
              {TRANSCRIPT_LINES.map((line, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-line bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-soft text-[10px] font-bold text-blue">
                        {line.speaker.charAt(0)}
                      </span>
                      <span className="text-xs font-semibold text-ink">{line.speaker}</span>
                      <span className="rounded-md bg-surface-2 border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                        {line.lang}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">{line.time}</span>
                      <span className="rounded-full bg-teal-soft border border-[#99F6E4] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-teal">
                        {line.tag}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] font-medium text-ink pl-7">&ldquo;{line.text}&rdquo;</p>
                  {line.translation !== line.text && (
                    <p className="mt-1.5 text-[12px] italic text-muted pl-7">
                      English gloss: &ldquo;{line.translation}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Extracted Rules (.xlsx) View */}
        {activeTab === "rules" && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-4">
              <div>
                <h3 className="text-sm font-semibold text-navy">
                  Workbook: Scorecard_Floor_2026.xlsx
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  3 sheets parsed automatically · All Excel weights, rubrics, and Auto-Zero clauses locked
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft border border-[#BFDBFE] px-3 py-1 font-mono text-xs font-semibold text-blue">
                ∑ Weight = 100.0%
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th>Workbook Sheet</th>
                    <th>Preserved Formula</th>
                    <th>Auto-Zero</th>
                    <th className="text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {CRITERIA.map((crit) => (
                    <tr key={crit.id}>
                      <td className="font-semibold text-ink">{crit.name}</td>
                      <td className="text-ink-soft">{crit.sheet}</td>
                      <td className="font-mono text-[11px] text-muted">{crit.formula}</td>
                      <td>
                        {crit.autoZero ? (
                          <span className="rounded-full bg-amber-soft border border-[#FDE68A] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#B45309]">
                            Mandatory Gate
                          </span>
                        ) : (
                          <span className="text-muted">Standard</span>
                        )}
                      </td>
                      <td className="text-right font-mono font-bold text-navy">{crit.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Console Footer: 1-Click Supervisor Huddle Proof */}
        <div className="border-t border-line bg-surface-2 px-5 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-soft">
            <svg className="h-4 w-4 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Verified audit proof ready for 1-on-1 coaching briefing</span>
          </div>
          <span className="font-mono font-semibold text-navy">Audit Turnaround: 42s</span>
        </div>
      </div>
    </div>
  );
}
