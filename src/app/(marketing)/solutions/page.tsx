import type { Metadata } from "next";
import Link from "next/link";
import { ZetroPublicCta } from "@/components/landing/zetro-public-chrome";
import { TRIAL_CALLS } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Solutions & Sectors | Zetro Quality Auditing & Customer Intelligence",
  description:
    "How East African banks, telecoms, insurers, hospitals, SACCOs, and public service desks use Zetro for 100% QA and repeat-caller intelligence.",
};

const ROLES = [
  {
    role: "Quality Assurance Leads",
    kicker: "Stop sampling 2%. Audit the floor.",
    body: "Evaluate every call against your exact rubric weights, auto-surface compliance misses, and verify every score with timestamped quotes.",
    points: [
      "100% continuous queue coverage",
      "Timestamped audio & transcript proof",
      "Zero auditor fatigue across shifts",
      "Instant PDF coaching exports",
    ],
    featured: false,
  },
  {
    role: "Operations & Floor Managers",
    kicker: "Verify adherence across every shift.",
    body: "Spot policy breaches early, benchmark agents fairly on consistent rubrics, and trace recurring repeat callers back to root operational blockers.",
    points: [
      "Real-time pass/fail & Auto-Zero alerts",
      "Agent leaderboard by team & queue",
      "Repeat vs reopened issue tracking",
      "Preserves exact Excel formula weights",
    ],
    featured: true,
  },
  {
    role: "Compliance & Risk Officers",
    kicker: "Mandatory disclosures verified every time.",
    body: "Audit KYC checks, BoT/TCRA scripts, fee explanations, and unauthorized commitments in both Kiswahili and English without manual tape pulling.",
    points: [
      "BoT, TCRA & insurer script checks",
      "Auto-Zero escalation workflows",
      "Tenant-isolated immutable records",
      "Full exportable evidence trail",
    ],
    featured: false,
  },
  {
    role: "Customer Experience Teams",
    kicker: "Understand why callers come back.",
    body: "Separate duplicate QA audits from genuine repeat customer contacts and identify whether failures stem from agent handling, process, or system outage.",
    points: [
      "Per-customer contact timelines",
      "Same issue vs new issue separation",
      "Resolution & callback verification",
      "Service provider vs agent attribution",
    ],
    featured: false,
  },
] as const;

const SECTORS = [
  {
    id: "banks",
    tag: "Banking",
    title: "Banks & Microfinance",
    body: "Audit loan collections, SimBanking & mobile-app disputes, branch callbacks, and fraud desks with strict NIDA identity verification and BoT regulatory disclosure checks.",
    highlights: [
      "Mandatory KYC / DOB & PIN safety checks",
      "Dispute & reversal SLA tracking",
      "Zero unauthorized fee or waiver promises",
    ],
  },
  {
    id: "telecoms",
    tag: "Telecom",
    title: "Telecoms & Mobile Money",
    body: "Maintain high QA accuracy across SIM swap requests, mobile-money reversals, agent float inquiries, and bundle complaints in fluent Swahili and English.",
    highlights: [
      "SIM-swap & USSD fraud verification",
      "Code-switching transcription in SW + EN",
      "Repeat outage vs agent blocker detection",
    ],
  },
  {
    id: "insurers-hospitals",
    tag: "Healthcare & Insurance",
    title: "Insurers & Hospitals",
    body: "Ensure claims intake, NHIF/private policy authorizations, and patient triage desks deliver accurate coverage guidance, empathetic tone, and strict confidentiality.",
    highlights: [
      "Policy benefit & pre-auth disclosure checks",
      "Patient triage empathy & hold-time auditing",
      "Escalation review for urgent claims",
    ],
  },
  {
    id: "saccos",
    tag: "Member & Public Desks",
    title: "SACCOs & Public Desks",
    body: "Give member service cooperatives, utilities, and public-sector helplines audit visibility across loan eligibility calls, citizen inquiries, and unresolved complaint queues.",
    highlights: [
      "Service-charter response compliance",
      "Clear Swahili citizen & member tone scoring",
      "Repeat-ticket root-cause accountability",
    ],
  },
] as const;

export default function SolutionsPage() {
  return (
    <div>
      {/* ── Subpage Hero ──────────────────────────────────────────────── */}
      <section className="z-subhero" aria-labelledby="solutions-heading">
        <div className="z-container">
          <span className="z-eyebrow">Solutions · Teams &amp; Sectors</span>
          <h1 id="solutions-heading" className="z-subhero-h1">
            One platform.{" "}
            <span className="z-h1-accent">Clear answers across every seat and sector.</span>
          </h1>
          <p className="z-subhero-lead">
            Designed for regulated high-volume contact centers in East Africa—uniting QA scoring, regulatory compliance, coaching briefs, and repeat-caller intelligence.
          </p>
          <div className="z-subhero-actions">
            <Link href="/signup" className="z-btn z-btn-solid" style={{ height: "44px", paddingInline: "20px" }}>
              Start {TRIAL_CALLS}-call free trial
            </Link>
            <Link href="/talk-sales" className="z-btn z-btn-outline" style={{ height: "44px", paddingInline: "20px" }}>
              Talk to solutions team →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Roles Grid ────────────────────────────────────────────────── */}
      <section className="z-section" aria-labelledby="roles-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">Role alignment</span>
            <h2 id="roles-heading" className="z-h2">
              Clarity for every operational role.
            </h2>
          </div>

          <div className="z-subgrid-4">
            {ROLES.map((item) => (
              <article
                key={item.role}
                className={item.featured ? "z-card z-price is-featured" : "z-card z-price"}
                style={{ padding: "24px", transform: "none" }}
              >
                {item.featured ? (
                  <span className="z-price-badge">Floor core</span>
                ) : null}
                <h3 className="z-h3">{item.role}</h3>
                <p style={{ marginTop: "6px", fontSize: "13.5px", fontWeight: 600, color: "var(--z-blue-ink)" }}>
                  {item.kicker}
                </p>
                <p className="z-body" style={{ marginTop: "10px", fontSize: "14px" }}>
                  {item.body}
                </p>

                <ul className="z-list" style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--z-line)" }}>
                  {item.points.map((pt) => (
                    <li key={pt} style={{ fontSize: "13.5px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Regulated Sectors (#banks, #telecoms, #insurers-hospitals, #saccos) */}
      <section id="sectors" className="z-section z-band-alt" aria-labelledby="sectors-heading">
        <div className="z-container">
          <div className="z-head">
            <span className="z-eyebrow">East African sectors</span>
            <h2 id="sectors-heading" className="z-h2">
              Built for high-trust contact centers.
            </h2>
            <p className="z-lead">
              Pre-tuned for Swahili and English terminology in banking, telecoms, insurance, healthcare, cooperatives, and public service desks.
            </p>
          </div>

          <div className="z-subgrid-2">
            {SECTORS.map((sector) => (
              <article
                key={sector.id}
                id={sector.id}
                className="z-card"
                style={{ padding: "28px" }}
              >
                <span className="z-eyebrow">{sector.tag}</span>
                <h3 className="z-h3" style={{ marginTop: "14px", fontSize: "21px" }}>
                  {sector.title}
                </h3>
                <p className="z-body" style={{ marginTop: "8px" }}>
                  {sector.body}
                </p>

                <ul className="z-list" style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--z-line)" }}>
                  {sector.highlights.map((hl) => (
                    <li key={hl} style={{ fontSize: "14px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div style={{ marginTop: "40px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            <Link href="/how-it-works#steps" className="z-btn z-btn-outline">
              See the 6-step audit pipeline →
            </Link>
            <Link href="/pricing#calculator" className="z-btn z-btn-solid">
              Open TZS tariff calculator →
            </Link>
          </div>
        </div>
      </section>

      <ZetroPublicCta
        eyebrow="Sector walkthrough"
        title="Not sure how Zetro handles your queues and scorecards?"
        body="Share your call languages, daily call volume, and scorecard format—our Dar es Salaam team will evaluate sample calls live with your QA leads."
      />
    </div>
  );
}
