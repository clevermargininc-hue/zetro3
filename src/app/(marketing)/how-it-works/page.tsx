import type { Metadata } from "next";
import Link from "next/link";
import { TanzaniaFlagIcon } from "@/components/country-region-picker";
import { ZetroPublicCta } from "@/components/landing/zetro-public-chrome";
import { TRIAL_CALLS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "How Zetro Works | Quality Auditing & Customer Intelligence",
  description:
    "See how Zetro scores agent performance, identifies repeat customers, separates repeated audits from real calls, and explains unresolved customer journeys.",
};

const STEPS = [
  {
    number: "01",
    phase: "Workspace Provisioning",
    title: "Open a dedicated Tanzania & East Africa workspace",
    description:
      "Workspaces are ready out of the box for Kiswahili, English, and mid-sentence code-switching—configured around your queues, scorecards, and compliance rules.",
  },
  {
    number: "02",
    phase: "Audio Ingestion",
    title: "Ingest call recordings without replacing your PBX",
    description:
      "Pull calls via API, S3/SFTP, or batch upload MP3, WAV, M4A, AAC, OGG, and ZIP archives. No telephone hardware migration required.",
  },
  {
    number: "03",
    phase: "Speaker Diarization",
    title: "Separate agent and caller tracks cleanly",
    description:
      "Our speech pipeline isolates agent and caller audio even across noisy GSM lines, preserving timestamps for every bilingual exchange.",
  },
  {
    number: "04",
    phase: "Weighted Rubric",
    title: "Score against your exact company scorecard",
    description:
      "Upload your Excel, Word, or PDF QA rubric. Zetro applies your exact section weights, criterion rules, and Auto-Zero compliance triggers.",
  },
  {
    number: "05",
    phase: "Supervisor Coaching",
    title: "Deliver timestamped coaching briefs before the huddle",
    description:
      "QA leads review cited transcript moments, flagged policy breaches, and agent-level trends with one-click briefing exports.",
  },
  {
    number: "06",
    phase: "Customer Journey Intelligence",
    title: "Track repeat callers & unresolved service outcomes",
    description:
      "Zetro distinguishes duplicate call audits from genuine repeat contacts, connecting recurring issues across channels and surfacing operational blockers.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div>
      {/* ── Subpage Hero ──────────────────────────────────────────────── */}
      <section className="z-subhero" aria-labelledby="hiw-heading">
        <div className="z-container">
          <span className="z-eyebrow">Pipeline guide · QA + Customer Intelligence</span>
          <h1 id="hiw-heading" className="z-subhero-h1">
            Audit the call.{" "}
            <span className="z-h1-accent">Understand every customer outcome.</span>
          </h1>
          <p className="z-subhero-lead">
            We transcribe Swahili and English recordings, apply your exact scorecard weights with timestamped quotes, and link repeat calls back to unresolved customer issues.
          </p>
          <div className="z-subhero-actions">
            <Link href="/signup" className="z-btn z-btn-solid" style={{ height: "44px", paddingInline: "20px" }}>
              Start {TRIAL_CALLS}-call free trial
            </Link>
            <Link href="/talk-sales" className="z-btn z-btn-outline" style={{ height: "44px", paddingInline: "20px" }}>
              Book a live walkthrough →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bilingual & Scorecard Foundations (#bilingual) ────────────── */}
      <section id="bilingual" className="z-section" aria-labelledby="foundations-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">Core engines</span>
            <h2 id="foundations-heading" className="z-h2">
              Built for bilingual audio and strict financial rubrics.
            </h2>
            <p className="z-lead">
              Two integrated layers work on every recording so supervisors never trade compliance accuracy for speed.
            </p>
          </div>

          <div className="z-subgrid-2">
            <article className="z-card" style={{ padding: "28px", display: "flex", gap: "18px", alignItems: "flex-start" }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  border: "1px solid var(--z-line)",
                  background: "var(--z-canvas)",
                  flexShrink: 0,
                }}
              >
                <TanzaniaFlagIcon className="h-7 w-7 rounded-sm" />
              </span>
              <div>
                <h3 className="z-h3">Kiswahili + English Bilingual Engine</h3>
                <p className="z-body" style={{ marginTop: "8px" }}>
                  Native East African code-switching recognition transcribes and diarizes Swahili, English, and mixed sentences accurately on the same call—capturing exact customer amounts, KYC confirmations, and de-escalation tone.
                </p>
              </div>
            </article>

            <article className="z-card" style={{ padding: "28px", display: "flex", gap: "18px", alignItems: "flex-start" }}>
              <span className="z-icon-box" style={{ flexShrink: 0, width: "48px", height: "48px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <div>
                <h3 className="z-h3">Zero-Truncation Scorecard Ingestion</h3>
                <p className="z-body" style={{ marginTop: "8px" }}>
                  Import your multi-sheet Excel, Word, or PDF QA rubric intact. Zetro preserves every criterion weight, sub-check, and Auto-Zero compliance rule rather than forcing a generic template.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── 6-Step Lifecycle (#steps) ────────────────────────────────── */}
      <section id="steps" className="z-section z-band-alt" aria-labelledby="steps-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">Six-step pipeline</span>
            <h2 id="steps-heading" className="z-h2">
              One lifecycle from call upload to coaching huddle.
            </h2>
            <p className="z-lead">
              Follow how each recording becomes a verifiable scorecard, compliance alert, and customer outcome record.
            </p>
          </div>

          <div className="z-subgrid-3">
            {STEPS.map((step) => (
              <article key={step.number} className="z-card z-feature" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <span
                      style={{
                        display: "inline-grid",
                        placeItems: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "var(--z-tint)",
                        color: "var(--z-blue-ink)",
                        fontFamily: "var(--z-display)",
                        fontWeight: 700,
                        fontSize: "14px",
                      }}
                    >
                      {step.number}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--z-muted)" }}>
                      {step.phase}
                    </span>
                  </div>
                  <h3 className="z-h3" style={{ marginTop: "18px" }}>
                    {step.title}
                  </h3>
                  <p className="z-body" style={{ marginTop: "8px" }}>
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div
            style={{
              marginTop: "40px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <Link href="/solutions#banks" className="z-btn z-btn-outline">
              Explore sector workflows →
            </Link>
            <Link href="/pricing#calculator" className="z-btn z-btn-solid">
              Estimate monthly TZS cost →
            </Link>
          </div>
        </div>
      </section>

      <ZetroPublicCta
        eyebrow="Live evaluation"
        title="Ready to see your own scorecard run on real calls?"
        body={`Start with ${TRIAL_CALLS} free calls scored against your exact rubric, with zero credit card or PBX hardware changes.`}
      />
    </div>
  );
}
