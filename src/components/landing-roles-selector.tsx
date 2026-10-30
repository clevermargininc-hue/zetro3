"use client";

import { useState } from "react";
import Link from "next/link";

const ROLES = [
  {
    id: "qa-leads",
    title: "QA Leads & Supervisors",
    badge: "100% Floor Coverage",
    heading: "Stop hunting for tapes. Coach with exact quotes.",
    desc: "Quality managers spend up to 70% of their week manually scrubbing through audio files trying to find 2 or 3 usable recordings. Zetro audits every single call automatically, flags weak interactions, and prepares coaching quotes for your 1-on-1s.",
    points: [
      "Zero hours lost to manual tape hunting",
      "Exact audio timestamps for constructive briefings",
      "Weighted strictly against your company scorecard",
    ],
  },
  {
    id: "operations",
    title: "Operations & Contact Center Heads",
    badge: "Real-time Oversight",
    heading: "Protect SLAs and catch regulatory breaches immediately.",
    desc: "When a critical compliance rule is violated, you cannot wait 72 hours for a random sampling report. Zetro flags Auto-Zero red lines and mandatory identification lapses the moment calls conclude.",
    points: [
      "Instant Auto-Zero compliance alerts with audio proof",
      "Floor-wide visibility on agent strengths and weak spots",
      "No telephony migration — works with your current phone system",
    ],
  },
  {
    id: "agents",
    title: "Agents on the Headset",
    badge: "Fairness & Growth",
    heading: "Evaluated on your real average, not one unlucky call.",
    desc: "Nobody should be penalized or denied a performance bonus because a supervisor happened to sample their single difficult call of the week. Zetro grades your complete portfolio so your mark reflects your true dedication.",
    points: [
      "Transparent scorecard rules with no subjective bias",
      "Immediate recognition for empathy and de-escalation",
      "Bilingual recognition — never penalized for natural Swahili mixing",
    ],
  },
];

const INDUSTRIES = [
  {
    title: "Telecom & Mobile Money",
    desc: "Verify that agents cite actual regulatory fees, USSD steps, and privacy terms when handling mobile money transactions in Swahili and English.",
  },
  {
    title: "Banking & Financial Services",
    desc: "Enforce strict national ID verification and polite, empathetic collections workflows without risking costly regulatory penalties.",
  },
  {
    title: "BPO & Customer Outsourcing",
    desc: "Provide enterprise clients with verifiable scorecard audit proofs and transparent dashboards rather than vague sampling promises.",
  },
  {
    title: "E-Commerce & Logistics",
    desc: "Monitor delivery disputes, driver handoffs, and refund resolutions on live calls without auditor fatigue.",
  },
];

export function LandingRolesSelector() {
  const [selectedRole, setSelectedRole] = useState(0);
  const current = ROLES[selectedRole];

  return (
    <div className="w-full">
      {/* Role Selector Tabs */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 p-1.5 shadow-xs backdrop-blur-md">
          {ROLES.map((role, idx) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(idx)}
              className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 ${
                selectedRole === idx
                  ? "bg-black text-white shadow-xs"
                  : "text-neutral-600 hover:text-black"
              }`}
            >
              {role.title}
            </button>
          ))}
        </div>
      </div>

      {/* Role Feature Showcase Card */}
      <div className="mx-auto max-w-5xl rounded-3xl border border-black/[0.06] bg-white p-8 sm:p-12 shadow-xl shadow-indigo-500/5 transition-all duration-300">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue-soft/50 px-3 py-1 font-mono text-[11px] font-semibold text-blue">
              {current.badge}
            </span>
            <h3 className="mt-4 font-sans text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#0f172a]">
              {current.heading}
            </h3>
            <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-neutral-600 font-normal">
              {current.desc}
            </p>

            <ul className="mt-6 space-y-3">
              {current.points.map((pt) => (
                <li key={pt} className="flex items-center gap-3 text-[14px] text-neutral-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600 border border-emerald-500/20">
                    ✓
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-black/[0.05]">
              <Link
                href="/solutions"
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0f172a] hover:text-blue transition-colors group"
              >
                <span>Read detailed solution guide</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-black/[0.06] bg-gradient-to-br from-neutral-50 to-indigo-50/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Target Outcome
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="font-sans text-xl font-medium text-[#0f172a]">
                {selectedRole === 0 && "100% audit velocity with zero manual sampling lag"}
                {selectedRole === 1 && "Complete compliance defense and instant risk containment"}
                {selectedRole === 2 && "Fair, objective feedback backed by actual audio quotes"}
              </p>
              <div className="h-px bg-black/[0.05]" />
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Deployment</span>
                <span className="font-mono font-medium text-[#0f172a]">Under 60 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Verticals Strip */}
      <div className="mt-14 mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6">
          Proven across high-volume East African sectors
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind) => (
            <div
              key={ind.title}
              className="rounded-2xl border border-black/[0.05] bg-white/70 p-5 shadow-xs backdrop-blur-sm transition-all duration-200 hover:bg-white hover:border-black/[0.1] hover:shadow-md"
            >
              <h4 className="font-sans text-[14px] font-semibold text-[#0f172a] mb-2">{ind.title}</h4>
              <p className="text-[12px] leading-relaxed text-neutral-500">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
