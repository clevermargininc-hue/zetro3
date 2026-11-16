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
        <div
          role="tablist"
          aria-label="Organizational roles"
          className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-line bg-surface-2 p-1.5"
        >
          {ROLES.map((role, idx) => (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={selectedRole === idx}
              onClick={() => setSelectedRole(idx)}
              className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                selectedRole === idx
                  ? "bg-blue text-white shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {role.title}
            </button>
          ))}
        </div>
      </div>

      {/* Role Feature Showcase Card */}
      <div className="mx-auto max-w-5xl rounded-2xl border border-line bg-white p-8 sm:p-12 shadow-xs transition-all duration-300">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft border border-[#BFDBFE] px-3 py-1 font-mono text-[11px] font-semibold text-blue">
              {current.badge}
            </span>
            <h3 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-navy">
              {current.heading}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              {current.desc}
            </p>

            <ul className="mt-6 space-y-3">
              {current.points.map((pt) => (
                <li key={pt} className="flex items-center gap-3 text-sm font-medium text-ink">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-soft border border-[#99F6E4] text-[11px] font-bold text-teal">
                    ✓
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-line">
              <Link
                href="/solutions"
                className="btn-blue rounded-lg px-5 py-2 text-sm group"
              >
                <span>Read detailed solution guide</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-line bg-surface-2 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-muted uppercase tracking-wider">
                  Target Outcome
                </span>
                <span className="h-2 w-2 rounded-full bg-teal" />
              </div>
              <p className="font-sans text-xl font-bold text-navy leading-snug">
                {selectedRole === 0 && "100% audit velocity with zero manual sampling lag"}
                {selectedRole === 1 && "Complete compliance defense and instant risk containment"}
                {selectedRole === 2 && "Fair, objective feedback backed by actual audio quotes"}
              </p>
              <div className="h-px bg-line" />
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Turnaround Velocity</span>
                <span className="font-mono font-semibold text-ink">Under 60 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Verticals Strip */}
      <div className="mt-14 mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted mb-6">
          Proven across high-volume East African sectors
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind) => (
            <div
              key={ind.title}
              className="rounded-xl border border-line bg-white p-5 transition-all duration-200 hover:border-[#CBD5E1]"
            >
              <h3 className="font-sans text-[14px] font-bold text-navy mb-2">{ind.title}</h3>
              <p className="text-[12px] leading-relaxed text-muted">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
