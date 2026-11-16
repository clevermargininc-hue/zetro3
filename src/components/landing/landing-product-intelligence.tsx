"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";

export function LandingProductIntelligence() {
  const [activeTab, setActiveTab] = useState<"transcript" | "scorecard" | "compliance">("transcript");

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-20">
          {/* Left Column: Realistic Call Analysis Enterprise Software Card */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl ring-1 ring-black/5">
              {/* Card Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer">
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    Call Analysis
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer">
                  <span>Download Report</span>
                  <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
                </div>
              </div>

              {/* Card Body: Split Left Metrics & Right Transcript */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px]">
                {/* Left Metrics Sidebar */}
                <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-100 p-5 bg-[#F8FAFC]/50 flex flex-col justify-between">
                  {/* Circular Score Gauge */}
                  <div className="flex flex-col items-center text-center">
                    <div className="relative flex h-28 w-28 items-center justify-center">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="8"
                          strokeDasharray="251.2"
                          strokeDashoffset="13"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                          94.8%
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                          QA Score
                        </span>
                      </div>
                    </div>
                    <span className="mt-2.5 inline-block rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                      Excellent
                    </span>
                  </div>

                  {/* Compliance Progress Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Compliance</span>
                      <span className="font-mono text-slate-900">92%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-500 w-[92%]" />
                    </div>
                  </div>

                  {/* Key Findings List */}
                  <div className="mt-5 pt-4 border-t border-slate-200/80 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Key Findings
                    </p>
                    <div className="space-y-2 text-xs text-slate-800">
                      <div className="flex items-start gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white mt-0.5 shadow-2xs">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span className="font-medium text-[12px]">All critical requirements met</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white mt-0.5 shadow-2xs">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span className="font-medium text-[12px]">Professional language used</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Transcript Panel */}
                <div className="md:col-span-7 p-5 flex flex-col bg-white">
                  {/* Tabs Row */}
                  <div className="flex items-center gap-6 border-b border-slate-100 text-xs font-semibold pb-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("transcript")}
                      className={`relative pb-1 transition-colors ${
                        activeTab === "transcript"
                          ? "text-[#175CD3] font-bold"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Transcript
                      {activeTab === "transcript" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#175CD3] rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("scorecard")}
                      className={`relative pb-1 transition-colors ${
                        activeTab === "scorecard"
                          ? "text-[#175CD3] font-bold"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Scorecard
                      {activeTab === "scorecard" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#175CD3] rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("compliance")}
                      className={`relative pb-1 transition-colors ${
                        activeTab === "compliance"
                          ? "text-[#175CD3] font-bold"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Compliance
                      {activeTab === "compliance" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#175CD3] rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Transcript Utterances List */}
                  {activeTab === "transcript" ? (
                    <div className="mt-4 space-y-4">
                      {/* Utterance 1: Agent */}
                      <div className="flex items-start gap-3 text-left">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#175CD3]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#175CD3]">Agent</span>
                            <span className="font-mono text-[11px] text-slate-400">00:00:12</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-800 leading-relaxed font-normal">
                            Hello, thank you for calling. How can I help you today?
                          </p>
                        </div>
                      </div>

                      {/* Utterance 2: Customer (Swahili Dialogue) */}
                      <div className="flex items-start gap-3 text-left">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-600">Customer</span>
                            <span className="font-mono text-[11px] text-slate-400">00:00:18</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-800 leading-relaxed font-normal">
                            Habari, ningependa kujua kuhusu...
                          </p>
                        </div>
                      </div>

                      {/* Utterance 3: Agent */}
                      <div className="flex items-start gap-3 text-left">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#175CD3]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#175CD3]">Agent</span>
                            <span className="font-mono text-[11px] text-slate-400">00:00:25</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-800 leading-relaxed font-normal">
                            Sure, let me help you with that.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : activeTab === "scorecard" ? (
                    <div className="mt-4 space-y-2.5 text-left text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <span className="font-medium text-slate-700">Greeting &amp; Verification</span>
                        <span className="font-mono font-bold text-emerald-600">100% (25/25)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <span className="font-medium text-slate-700">Problem Identification</span>
                        <span className="font-mono font-bold text-emerald-600">95% (20/20)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <span className="font-medium text-slate-700">Compliance &amp; Disclosures</span>
                        <span className="font-mono font-bold text-emerald-600">92% (30/30)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-50">
                        <span className="font-medium text-slate-700">Closing &amp; Follow-up Promise</span>
                        <span className="font-mono font-bold text-blue-600">90% (22.5/25)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2 text-left text-xs text-slate-700">
                      <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                        <span className="font-medium">Mandatory Identity Verification</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">PASSED</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                        <span className="font-medium">Call Recording Notification</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">PASSED</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                        <span className="font-medium">Account Security Clearance</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">PASSED</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Value Prop Copy, Checklists, & CTA */}
          <div className="lg:col-span-5 text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1 text-xs font-semibold text-[#1D63ED] shadow-2xs">
              Built for Modern Contact Centers
            </div>

            {/* Section Headline */}
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.18]">
              Powerful Analytics.
              <span className="block text-slate-900">Real Business Impact.</span>
            </h2>

            {/* Checklist items */}
            <div className="mt-6 space-y-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white font-bold text-xs shadow-2xs">
                  ✓
                </span>
                <span className="text-sm sm:text-base font-medium text-slate-900">
                  Bilingual call transcription (English &amp; Kiswahili)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white font-bold text-xs shadow-2xs">
                  ✓
                </span>
                <span className="text-sm sm:text-base font-medium text-slate-900">
                  Score against your own scorecard
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white font-bold text-xs shadow-2xs">
                  ✓
                </span>
                <span className="text-sm sm:text-base font-medium text-slate-900">
                  Identify compliance risks
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white font-bold text-xs shadow-2xs">
                  ✓
                </span>
                <span className="text-sm sm:text-base font-medium text-slate-900">
                  Rank your team performance
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <Link
                href="/talk-sales"
                className="inline-flex items-center gap-2 rounded-full bg-[#1D63ED] px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:bg-[#1554D1] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Request a Demo</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

