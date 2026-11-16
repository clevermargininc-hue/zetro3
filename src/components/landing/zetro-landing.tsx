import Link from "next/link";
import {
  AudioLines,
  BarChart3,
  BookOpen,
  Check,
  CheckSquare,
  ClipboardCheck,
  Database,
  Download,
  Globe,
  Languages,
  MessageSquare,
  Mic,
  PhoneCall,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smile,
} from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { ZetroLandingEnhancer } from "./zetro-landing-enhancer";
import {
  ZetroBrandGlyph as BrandGlyph,
  ZetroPublicCta,
} from "./zetro-public-chrome";

/* ═══════════════════════════════════════════════════════════════════════════
   Zetro — Production SaaS Landing Page
   Discipline: Deep Navy (#0A1A3F), White (#FFFFFF), Electric Blue (#2F6BFF)
   Typography: Space Grotesk (headlines) + Inter (body)
   Voice: First-person plural ("we", "our")
   ═══════════════════════════════════════════════════════════════════════════ */

const HUNDRED_DOTS = Array.from({ length: 100 }, (_, i) => i);

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Ingest Audio",
    body: "We pull recordings from your PBX, SIP trunk, or batch upload in MP3, WAV, or M4A.",
    icon: <Download className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    num: "02",
    title: "Separate Speakers",
    body: "Our diarization engine isolates agent and caller tracks, even on noisy mobile lines.",
    icon: <AudioLines className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    num: "03",
    title: "Transcribe SW + EN",
    body: "We transcribe Kiswahili, English, and mid-sentence code-switching with timestamps.",
    icon: <Languages className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    num: "04",
    title: "Score Your Rubric",
    body: "We grade every criterion on your scorecard and cite the exact timestamped quote.",
    icon: <ClipboardCheck className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    num: "05",
    title: "Flag Compliance",
    body: "We catch missed KYC checks, fee disclosures, and regulatory breaches in real time.",
    icon: <ShieldAlert className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    num: "06",
    title: "Coach the Agent",
    body: "We send supervisors a concise coaching brief ready for the morning team huddle.",
    icon: <BookOpen className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
  },
];

const FEATURES = [
  {
    title: "Auto Scoring",
    body: "We evaluate 100% of calls against your exact weighted rubric—greeting, KYC verification, issue resolution, and closing—without fatigue or sampling bias.",
    icon: <ClipboardCheck className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    title: "Compliance Detection",
    body: "We automatically flag skipped PIN warnings, missing BoT or TCRA disclosures, and unauthorized promises before they turn into audit findings.",
    icon: <ShieldCheck className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    title: "Sentiment & Tone",
    body: "We track caller frustration, dead air, interruptions, and agent empathy across every turn so you can rescue at-risk accounts early.",
    icon: <Smile className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    title: "Agent Coaching",
    body: "We turn every low-scoring call into a concrete coaching note with timestamped moments and suggested phrasing in Kiswahili or English.",
    icon: <MessageSquare className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    title: "Team Leaderboard",
    body: "We rank agents and shifts by quality score, compliance pass rate, and handle time so supervisors recognize top performers and coach outliers.",
    icon: <BarChart3 className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />,
  },
  {
    title: "Swahili + English",
    body: "Built in Dar es Salaam for East African callers. We handle natural Kiswahili, English, and Sheng/code-switched conversations without losing context.",
    icon: <Globe className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" />,
  },
];

const FAQS = [
  {
    q: "How accurately do you handle Swahili and English code-switching?",
    a: "We built our speech and evaluation pipeline specifically for East African contact centers. When a caller starts in Kiswahili, quotes a transaction reference in English, and switches back, we preserve both languages accurately and score the interaction against your rubric without translation loss.",
  },
  {
    q: "Can we use the exact QA scorecard our supervisors already grade on?",
    a: "Yes. During onboarding we import your existing Excel or PDF scorecard—weights, pass/fail thresholds, and mandatory compliance knockouts included. You can also maintain separate rubrics for collections, mobile money, card disputes, or outpatient appointment desks.",
  },
  {
    q: "How does Zetro connect to our PBX or call recorder?",
    a: "You can start immediately by uploading recordings in the browser, or connect your Asterisk, Avaya, Genesys, 3CX, or custom SIP recorder via our webhook and S3/SFTP ingestion endpoints. Most teams score their first batch of calls in under ten minutes.",
  },
  {
    q: "How does TZS pricing and billing work?",
    a: "We price per audited call based on monthly volume and call duration, invoiced in Tanzanian Shillings (TZS) with a TZS 500,000 monthly minimum floor after your free 50-call trial. Annual commitments receive a 10% discount.",
  },
  {
    q: "How do you protect customer recordings and banking privacy?",
    a: "All audio and transcripts are encrypted in transit (TLS 1.3) and at rest (AES-256). Each organization runs in an isolated tenant with strict row-level security, and we never train public foundation models on your recordings.",
  },
  {
    q: "Will Zetro replace our QA analysts?",
    a: "No—we free them from listening to routine calls at 1x speed. Instead of spending all week sampling 2% of recordings, your QA team reviews 100% coverage dashboards, investigates flagged compliance risks, and spends their time coaching agents.",
  },
];

export function ZetroLanding({ signedIn = false }: { signedIn?: boolean }) {
  void signedIn;
  return (
    <>
      <ZetroLandingEnhancer />

      {/* ═════════════════════════════════════════════════════════════════
          HERO — Rounded Dot-Grid Container + Radiating Hairlines + Cards
          ═════════════════════════════════════════════════════════════════ */}
        <div className="z-hero-shell">
          <section className="z-hero" aria-labelledby="hero-heading">
            <div className="z-hero-inner">
              {/* Central Logo Tile + Diagonal Hairlines + Dashed Connectors + Top Label Cards */}
              <div className="z-hub">
                <svg
                  className="z-rays"
                  viewBox="0 0 3200 2200"
                  aria-hidden="true"
                  focusable="false"
                >
                  <line x1="1600" y1="1100" x2="0" y2="0" />
                  <line x1="1600" y1="1100" x2="3200" y2="0" />
                  <line x1="1600" y1="1100" x2="0" y2="2200" />
                  <line x1="1600" y1="1100" x2="3200" y2="2200" />
                  <line x1="1600" y1="1100" x2="0" y2="620" />
                  <line x1="1600" y1="1100" x2="3200" y2="620" />
                  <line x1="1600" y1="1100" x2="0" y2="1580" />
                  <line x1="1600" y1="1100" x2="3200" y2="1580" />
                  <circle cx="1600" cy="1100" r="240" />
                  <circle cx="1600" cy="1100" r="460" />
                </svg>

                {/* Faint dashed connector lines from central tile to top-left & top-right label cards */}
                <svg
                  className="z-links z-xl-only"
                  viewBox="0 0 1200 200"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M 568 100 C 425 100, 305 80, 198 80" />
                  <circle cx="198" cy="80" r="3.5" />
                  <path d="M 632 100 C 775 100, 895 84, 1002 84" />
                  <circle cx="1002" cy="84" r="3.5" />
                </svg>

                {/* Top-left floating label cards */}
                <div className="z-label z-label-left z-xl-only" aria-hidden="true">
                  <div
                    className="z-label-card z-float"
                    style={{ "--dur": "6.8s", "--delay": "0.2s", "--amp": "-4px" } as React.CSSProperties}
                  >
                    <div className="z-label-head">
                      <span className="z-label-icon">
                        <Check className="h-[13px] w-[13px]" strokeWidth={2.4} />
                      </span>
                      <span>Auto Scoring</span>
                    </div>
                    <span className="z-skel" style={{ width: "86%" }} />
                    <span className="z-skel" style={{ width: "62%" }} />
                    <div className="z-label-head" style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--z-line)" }}>
                      <span className="z-label-icon">
                        <Smile className="h-[13px] w-[13px]" strokeWidth={2.4} />
                      </span>
                      <span>Sentiment</span>
                    </div>
                    <span className="z-skel" style={{ width: "74%" }} />
                  </div>
                </div>

                {/* Top-right floating label cards */}
                <div className="z-label z-label-right z-xl-only" aria-hidden="true">
                  <div
                    className="z-label-card z-float"
                    style={{ "--dur": "7.4s", "--delay": "1.1s", "--amp": "-5px" } as React.CSSProperties}
                  >
                    <div className="z-label-head">
                      <span className="z-label-icon">
                        <Shield className="h-[13px] w-[13px]" strokeWidth={2.4} />
                      </span>
                      <span>Compliance</span>
                    </div>
                    <span className="z-skel" style={{ width: "82%" }} />
                    <span className="z-skel" style={{ width: "58%" }} />
                    <div className="z-label-head" style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--z-line)" }}>
                      <span className="z-label-icon">
                        <BookOpen className="h-[13px] w-[13px]" strokeWidth={2.4} />
                      </span>
                      <span>Coaching</span>
                    </div>
                    <span className="z-skel" style={{ width: "70%" }} />
                  </div>
                </div>

                {/* Central rounded-square logo tile */}
                <div className="z-hub-tile">
                  <BrandGlyph size={38} />
                </div>
              </div>

              {/* Exact two-line headline */}
              <h1 id="hero-heading" className="z-h1">
                <span className="z-h1-line">AI that listens to every call,</span>
                <span className="z-h1-line z-h1-accent">
                  so your QA team doesn&apos;t have to.
                </span>
              </h1>

              {/* One-sentence muted gray subheadline (11 words, first-person plural) */}
              <p className="z-hero-sub">
                We audit 100% of your Swahili and English calls in minutes.
              </p>

              {/* Social proof row: 6 overlapping circular avatars + trust line */}
              <div className="z-proof" aria-label="Customer proof">
                <div className="z-avatars" aria-hidden="true">
                  <span className="z-av-1">NM</span>
                  <span className="z-av-2">BK</span>
                  <span className="z-av-3">ZJ</span>
                  <span className="z-av-4">KM</span>
                  <span className="z-av-5">FA</span>
                  <span className="z-av-6">SL</span>
                </div>
                <p className="z-proof-text">
                  <strong>1,420,000+</strong> calls audited for East African QA teams
                </p>
              </div>

              {/* Primary pill CTA */}
              <Link href="/signup" className="z-btn-pill">
                <span>Start 50-call free trial</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
              <p className="z-micro">No credit card required · Ready in 10 minutes</p>

              {/* Lower-center: 5 channel/integration icon tiles arranged in a gentle arc */}
              <div className="z-tiles" role="list" aria-label="Supported channels and integrations">
                {[
                  {
                    label: "SIP / PBX",
                    y: "14px",
                    delay: "0s",
                    icon: <PhoneCall className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
                  },
                  {
                    label: "WhatsApp",
                    y: "5px",
                    delay: "0.9s",
                    icon: <BrandIcon brand="whatsapp" size={22} variant="mark" />,
                  },
                  {
                    label: "Swahili + EN",
                    y: "0px",
                    delay: "1.6s",
                    icon: <Mic className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
                  },
                  {
                    label: "CRM Sync",
                    y: "5px",
                    delay: "2.3s",
                    icon: <Database className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
                  },
                  {
                    label: "Scorecards",
                    y: "14px",
                    delay: "3.1s",
                    icon: <CheckSquare className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />,
                  },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    role="listitem"
                    className="z-tile-slot"
                    style={{ "--y": tile.y } as React.CSSProperties}
                  >
                    <div
                      className="z-tile z-float"
                      style={{ "--dur": "6.5s", "--delay": tile.delay, "--amp": "-4px" } as React.CSSProperties}
                    >
                      {tile.icon}
                    </div>
                    <span className="z-tile-label">{tile.label}</span>
                  </div>
                ))}
              </div>

              {/* Floating Signature Product Cards (bottom-left transcript + bottom-right scorecard) */}
              <div className="z-stage" aria-label="Sample Zetro call audit preview">
                {/* Bottom-Left: Rotated (-5deg) Call Transcript Card */}
                <div className="z-pos-transcript">
                  <article
                    className="z-fcard z-float"
                    style={{ "--dur": "7.5s", "--delay": "0.4s", "--amp": "-6px" } as React.CSSProperties}
                    aria-label="Sample audited call transcript"
                  >
                    <div className="z-fcard-head">
                      <div className="z-fcard-title">
                        <span className="z-fcard-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2 10v4M6 7v10M10 4v16M14 8v8M18 6v12M22 10v4" />
                          </svg>
                        </span>
                        <div>
                          <strong>Call #TZ-84920 · SimBanking Dispute</strong>
                          <span>03:42 · Dar es Salaam Inbound · SW + EN</span>
                        </div>
                      </div>
                      <span className="z-chip">Diarized</span>
                    </div>

                    <ol className="z-lines">
                      <li>
                        <time>00:08</time>
                        <div>
                          <span className="z-speaker" data-role="agent">
                            AGENT · NEEMA M.
                          </span>
                          <p>
                            Habari za asubuhi, karibu huduma kwa wateja. Naongea na Bwana Juma?
                          </p>
                          <span className="z-qa z-qa-pass">
                            ✓ Greeting &amp; ID check · +15 pts
                          </span>
                        </div>
                      </li>
                      <li>
                        <time>00:26</time>
                        <div>
                          <span className="z-speaker">CALLER</span>
                          <p>
                            Ndiyo, nimetuma TZS 450,000 kwa wakala lakini haijaingia kwenye akaunti.
                          </p>
                        </div>
                      </li>
                      <li className="is-flagged">
                        <time>01:14</time>
                        <div>
                          <span className="z-speaker" data-role="agent">
                            AGENT · NEEMA M.
                          </span>
                          <p>
                            Nitafungua reversal ticket sasa hivi. Utapata SMS ndani ya masaa 24.
                          </p>
                          <span className="z-qa z-qa-flag">
                            ! Flag: DOB verification skipped before ticket
                          </span>
                        </div>
                      </li>
                    </ol>
                  </article>
                </div>

                {/* Bottom-Right: Rotated (+4deg) Agent Scorecard Card */}
                <div className="z-pos-scorecard">
                  <article
                    className="z-fcard z-float"
                    style={{ "--dur": "6.8s", "--delay": "1.3s", "--amp": "-5px" } as React.CSSProperties}
                    aria-label="Sample agent QA scorecard"
                  >
                    <div className="z-fcard-head">
                      <div className="z-agent">
                        <span className="z-agent-avatar" aria-hidden="true">
                          NM
                        </span>
                        <div>
                          <strong>Neema Mwakasege</strong>
                          <span>Tier-1 Banking Desk · 38 calls today</span>
                        </div>
                      </div>
                      <span className="z-chip">QA Rubric v4</span>
                    </div>

                    <div className="z-score-row">
                      <div>
                        <div className="z-score">
                          92<span className="z-score-max">/100</span>
                        </div>
                        <span className="z-score-label">
                          +6.4 pts vs last 30 days
                        </span>
                      </div>
                      <svg
                        className="z-spark"
                        viewBox="0 0 112 44"
                        aria-hidden="true"
                      >
                        <path d="M2 36 L20 31 L38 28 L56 30 L74 20 L92 15 L108 9 L108 42 L2 42 Z" />
                        <polyline points="2,36 20,31 38,28 56,30 74,20 92,15 108,9" />
                        <circle cx="108" cy="9" r="3.2" />
                      </svg>
                    </div>

                    <div className="z-bars">
                      <div>
                        <div className="z-bar-top">
                          <span>Greeting &amp; tone</span>
                          <b>98%</b>
                        </div>
                        <div className="z-bar">
                          <span style={{ width: "98%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="z-bar-top">
                          <span>Issue resolution</span>
                          <b>94%</b>
                        </div>
                        <div className="z-bar">
                          <span style={{ width: "94%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="z-bar-top">
                          <span>
                            KYC &amp; compliance <em>1 flag</em>
                          </span>
                          <b>76%</b>
                        </div>
                        <div className="z-bar is-low">
                          <span style={{ width: "76%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="z-bar-top">
                          <span>Wrap-up &amp; SLA notice</span>
                          <b>96%</b>
                        </div>
                        <div className="z-bar">
                          <span style={{ width: "96%" }} />
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            1. TRUST BAR — Sector Placeholders
            ═════════════════════════════════════════════════════════════════ */}
        <section className="z-trust" aria-label="Sectors we serve in Tanzania and East Africa">
          <div className="z-container">
            <p className="z-trust-caption">
              Built for regulated contact centers across Tanzania &amp; East Africa
            </p>
            <div className="z-trust-row">
              {[
                {
                  name: "Commercial Banks",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m3 9 9-6 9 6" />
                      <path d="M4 10h16" />
                      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
                      <path d="M3 18h18" />
                    </svg>
                  ),
                },
                {
                  name: "Mobile Networks",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 20h.01" />
                      <path d="M7 20v-4" />
                      <path d="M12 20v-8" />
                      <path d="M17 20V8" />
                      <path d="M22 4v16" />
                    </svg>
                  ),
                },
                {
                  name: "General Insurers",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
                {
                  name: "Referral Hospitals",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="18" height="18" x="3" y="3" rx="3" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                  ),
                },
                {
                  name: "Tier-1 SACCOs",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="7" r="4" />
                      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
                    </svg>
                  ),
                },
                {
                  name: "Government Desks",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 22h16" />
                      <path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7" />
                      <polygon points="12 2 20 7 4 7" />
                    </svg>
                  ),
                },
              ].map((sector) => (
                <div key={sector.name} className="z-trust-logo">
                  {sector.icon}
                  <span>{sector.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            2. PROBLEM VS SOLUTION — 2% Manual Sampling vs 100% Zetro
            ═════════════════════════════════════════════════════════════════ */}
        <section className="z-section" data-reveal aria-labelledby="compare-heading">
          <div className="z-container">
            <div className="z-head">
              <span className="z-eyebrow">Why manual sampling fails</span>
              <h2 id="compare-heading" className="z-h2">
                Manual QA samples 2% of calls. We review 100%.
              </h2>
              <p className="z-lead">
                When supervisors only hear two calls out of every hundred, compliance breaches, repeat complaints, and broken journeys stay hidden in the other 98%.
              </p>
            </div>

            <div className="z-grid-2">
              {/* Left: Manual QA */}
              <article className="z-card z-compare">
                <span className="z-compare-kicker">Manual spreadsheet QA</span>
                <div className="z-compare-stat">2%</div>
                <p className="z-body" style={{ marginTop: "6px" }}>
                  2 of every 100 calls audited · 98 go unheard
                </p>

                <div className="z-dots" aria-hidden="true">
                  {HUNDRED_DOTS.map((i) => (
                    <span key={i} className={i < 2 ? "is-on" : undefined} />
                  ))}
                </div>

                <ul className="z-list is-muted">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Supervisors spend 35+ minutes grading a single 5-minute call</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Kiswahili and code-switched calls are skipped or inconsistently scored</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Skipped KYC and fee disclosures surface only after regulator complaints</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Agents receive feedback weeks after the customer interaction</span>
                  </li>
                </ul>
              </article>

              {/* Right: Zetro 100% */}
              <article className="z-card z-compare is-zetro">
                <span className="z-compare-kicker">Zetro automated QA</span>
                <div className="z-compare-stat">100%</div>
                <p className="z-body" style={{ marginTop: "6px" }}>
                  Every call transcribed, scored, and checked for compliance
                </p>

                <div className="z-dots is-all" aria-hidden="true">
                  {HUNDRED_DOTS.map((i) => (
                    <span key={i} />
                  ))}
                </div>

                <ul className="z-list">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Every call scored against your weighted rubric in under 3 minutes</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Native Kiswahili + English speaker separation and timestamped evidence</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Instant alerts when mandatory KYC or disclosure lines are missed</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Same-day coaching notes ready for your morning supervisor huddle</span>
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            3. HOW IT WORKS — 6-Step Connected AI Pipeline
            ═════════════════════════════════════════════════════════════════ */}
        <section
          id="how-it-works"
          className="z-section"
          style={{ background: "var(--z-canvas)", borderTop: "1px solid var(--z-line)", borderBottom: "1px solid var(--z-line)" }}
          data-reveal
          aria-labelledby="pipeline-heading"
        >
          <div className="z-container">
            <div className="z-head">
              <span className="z-eyebrow">How it works</span>
              <h2 id="pipeline-heading" className="z-h2">
                Six steps from raw call audio to morning coaching.
              </h2>
              <p className="z-lead">
                Our pipeline turns every recording into a structured, auditable QA record without changing how your agents take calls.
              </p>
            </div>

            <ol className="z-flow">
              {PIPELINE_STEPS.map((step) => (
                <li key={step.num} className="z-card">
                  <div className="z-step-top">
                    <span className="z-icon-box">{step.icon}</span>
                    <span className="z-step-num">{step.num}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            4. FEATURE GRID — 6 Core Capabilities
            ═════════════════════════════════════════════════════════════════ */}
        <section id="features" className="z-section" data-reveal aria-labelledby="features-heading">
          <div className="z-container">
            <div className="z-head">
              <span className="z-eyebrow">Capabilities</span>
              <h2 id="features-heading" className="z-h2">
                Built for high-volume East African contact centers.
              </h2>
              <p className="z-lead">
                Everything your QA analysts, team leads, and compliance officers need in one disciplined workspace.
              </p>
            </div>

            <div className="z-grid-3">
              {FEATURES.map((f) => (
                <article key={f.title} className="z-card z-feature">
                  <span className="z-icon-box">{f.icon}</span>
                  <h3 className="z-h3">{f.title}</h3>
                  <p className="z-body">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            5. DASHBOARD SHOWCASE — Tilted Product Mock in Dot-Grid Frame
            ═════════════════════════════════════════════════════════════════ */}
        <section id="platform" className="z-section" style={{ paddingTop: "24px" }} data-reveal aria-labelledby="showcase-heading">
          <div className="z-container">
            <div className="z-head">
              <span className="z-eyebrow">Supervisor command center</span>
              <h2 id="showcase-heading" className="z-h2">
                See every agent, every rubric, and every risk at a glance.
              </h2>
              <p className="z-lead">
                We surface the exact calls that need human attention—from skipped identity verification to repeat mobile-money disputes.
              </p>
            </div>

            <div className="z-frame">
              <div className="z-mock" role="region" aria-label="Zetro QA dashboard preview">
                <aside className="z-mock-side" aria-hidden="true">
                  <div className="z-mock-brand">
                    <BrandGlyph size={24} />
                    <span>Zetro</span>
                  </div>
                  <div className="z-mock-nav">
                    <span className="is-active">Overview</span>
                    <span>Score calls</span>
                    <span>Calls (14,820)</span>
                    <span>Customer Intel</span>
                    <span>Leaderboard</span>
                    <span>Compliance</span>
                    <span>Scorecards</span>
                    <span>Settings</span>
                  </div>
                </aside>

                <div className="z-mock-main">
                  <div className="z-mock-top">
                    <div>
                      <small>DAR ES SALAAM CONTACT CENTER · RUBRIC V4.2</small>
                      <h3>Quality &amp; Compliance Overview</h3>
                    </div>
                    <div className="z-seg" aria-hidden="true">
                      <span>7 days</span>
                      <span className="is-active">30 days</span>
                      <span>90 days</span>
                    </div>
                  </div>

                  <div className="z-kpis">
                    <div className="z-kpi">
                      <span>Average QA score</span>
                      <strong>88.4%</strong>
                      <small>+4.2% vs prior 30d</small>
                    </div>
                    <div className="z-kpi">
                      <span>Calls audited</span>
                      <strong>14,820</strong>
                      <small>100% coverage · SW/EN</small>
                    </div>
                    <div className="z-kpi">
                      <span>Compliance pass rate</span>
                      <strong>96.2%</strong>
                      <small>42 calls flagged</small>
                    </div>
                    <div className="z-kpi">
                      <span>Avg handle time</span>
                      <strong>03:42</strong>
                      <small>-18s vs target</small>
                    </div>
                  </div>

                  <div className="z-mock-row">
                    <div className="z-panel">
                      <div className="z-panel-title">
                        <strong>Quality score &amp; compliance trend</strong>
                        <span>Apr 1 – Apr 30</span>
                      </div>
                      <svg className="z-trend" viewBox="0 0 460 140" aria-hidden="true">
                        <line className="grid" x1="0" y1="25" x2="460" y2="25" />
                        <line className="grid" x1="0" y1="65" x2="460" y2="65" />
                        <line className="grid" x1="0" y1="105" x2="460" y2="105" />
                        <path
                          className="area"
                          d="M 8 92 L 72 80 L 136 74 L 200 62 L 264 58 L 328 42 L 392 34 L 452 24 L 452 120 L 8 120 Z"
                        />
                        <polyline
                          className="line"
                          points="8,92 72,80 136,74 200,62 264,58 328,42 392,34 452,24"
                        />
                        <text x="8" y="135">Wk 1 · 82.1%</text>
                        <text x="160" y="135">Wk 2 · 85.0%</text>
                        <text x="312" y="135">Wk 3 · 87.3%</text>
                        <text x="398" y="135">Wk 4 · 88.4%</text>
                      </svg>
                    </div>

                    <div className="z-panel">
                      <div className="z-panel-title">
                        <strong>Agent leaderboard</strong>
                        <span>This month</span>
                      </div>
                      <ol className="z-board">
                        {[
                          { rank: "01", name: "Neema Mwakasege", calls: "412 calls", score: "94%" },
                          { rank: "02", name: "Baraka Kimaro", calls: "389 calls", score: "91%" },
                          { rank: "03", name: "Zuhura Juma", calls: "405 calls", score: "89%" },
                          { rank: "04", name: "Kelvin Mushi", calls: "356 calls", score: "86%" },
                        ].map((a) => (
                          <li key={a.rank}>
                            <span>{a.rank}</span>
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                <span>{a.name}</span>
                                <span style={{ color: "var(--z-muted)", fontSize: "11px" }}>{a.calls}</span>
                              </div>
                              <div className="z-bar">
                                <span style={{ width: a.score }} />
                              </div>
                            </div>
                            <b>{a.score}</b>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <ul className="z-flags" aria-label="Recent compliance flags">
                    <li>
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        KYC flag · DOB confirmation skipped on reversal request
                      </span>
                      <span>Call #TZ-84920 · 01:14</span>
                    </li>
                    <li>
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        Disclosure flag · Loan processing fee not stated in Kiswahili
                      </span>
                      <span>Call #TZ-84897 · 02:09</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            6. PRICING — 3 Tiers (TZS Tariff from billing.ts)
            ═════════════════════════════════════════════════════════════════ */}
        <section
          id="pricing"
          className="z-section"
          style={{ background: "var(--z-canvas)", borderTop: "1px solid var(--z-line)", borderBottom: "1px solid var(--z-line)" }}
          data-reveal
          aria-labelledby="pricing-heading"
        >
          <div className="z-container">
            <div className="z-head">
              <span className="z-eyebrow">Transparent TZS pricing</span>
              <h2 id="pricing-heading" className="z-h2">
                Start with 50 free calls. Scale across your floor.
              </h2>
              <p className="z-lead">
                We invoice in Tanzanian Shillings based on call duration and monthly volume, with a 10% discount on annual commitments.
              </p>
            </div>

            <div className="z-pricing">
              {/* Tier 1: Pilot Trial */}
              <article className="z-card z-price">
                <h3 className="z-price-name">Pilot Trial</h3>
                <p className="z-price-blurb">
                  Test Zetro on your own Swahili and English recordings.
                </p>
                <div className="z-price-amount">
                  <strong>TZS 0</strong>
                  <small>/ first 50 calls</small>
                </div>
                <p className="z-price-unit">
                  No credit card · Full rubric &amp; diarization access
                </p>

                <ul className="z-list">
                  {[
                    "50 audited calls included free",
                    "Custom QA scorecard setup",
                    "Kiswahili + English transcription",
                    "Timestamped compliance flags",
                    "Supervisor coaching summaries",
                  ].map((item) => (
                    <li key={item}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="z-btn z-btn-outline z-price-cta">
                  Start 50-call trial
                </Link>
              </article>

              {/* Tier 2: Growth Floor (Highlighted with Electric Blue Border + Glow) */}
              <article className="z-card z-price is-featured">
                <span className="z-price-badge">Most popular</span>
                <h3 className="z-price-name">Growth Floor</h3>
                <p className="z-price-blurb">
                  For active contact centers auditing 1,000–30,000 calls/month.
                </p>
                <div className="z-price-amount">
                  <small>From</small>
                  <strong>TZS 135</strong>
                  <small>/ call</small>
                </div>
                <p className="z-price-unit">
                  TZS 500,000 monthly minimum floor · 90-day audio retention
                </p>

                <ul className="z-list">
                  {[
                    "100% call coverage across all queues",
                    "Unlimited QA scorecards & departments",
                    "Automated KYC & regulatory knockout alerts",
                    "Agent leaderboard & shift analytics",
                    "Repeat-caller & issue intelligence",
                    "10% discount on annual TZS contracts",
                  ].map((item) => (
                    <li key={item}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="z-btn z-btn-solid z-price-cta">
                  Get started
                </Link>
              </article>

              {/* Tier 3: Enterprise */}
              <article className="z-card z-price">
                <h3 className="z-price-name">Enterprise &amp; Public Sector</h3>
                <p className="z-price-blurb">
                  For banks, telecoms, insurers &amp; agencies over 30,000 calls/month.
                </p>
                <div className="z-price-amount">
                  <strong>Custom</strong>
                  <small>volume tariff</small>
                </div>
                <p className="z-price-unit">
                  Rates down to TZS 125/call · Dedicated onboarding
                </p>

                <ul className="z-list">
                  {[
                    "30,000 to 1,000,000+ monthly calls",
                    "Direct PBX, SIP & S3/SFTP ingestion",
                    "Role-based access & audit logs",
                    "Custom SLA & Dar es Salaam support",
                    "TZS invoicing on 30-day payment terms",
                  ].map((item) => (
                    <li key={item}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2459E8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/talk-sales" className="z-btn z-btn-outline z-price-cta">
                  Talk to our team
                </Link>
              </article>
            </div>

            <p className="z-price-note">
              All TZS figures exclude 18% VAT. Need an exact quote for your call-length mix?{" "}
              <Link href="/pricing#calculator" style={{ color: "var(--z-blue-ink)", fontWeight: 600, textDecoration: "underline" }}>
                Open the full TZS tariff calculator →
              </Link>
            </p>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            7. FAQ ACCORDION
            ═════════════════════════════════════════════════════════════════ */}
        <section id="faq" className="z-section" data-reveal aria-labelledby="faq-heading">
          <div className="z-container">
            <div className="z-head">
              <span className="z-eyebrow">FAQ</span>
              <h2 id="faq-heading" className="z-h2">
                Answers for QA, operations, and compliance leaders.
              </h2>
            </div>

            <div className="z-faq">
              {FAQS.map((item, idx) => (
                <details key={item.q} open={idx === 0}>
                  <summary>
                    <span>{item.q}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            8. FINAL CTA BAND — Deep Navy (#0A1A3F)
            ═════════════════════════════════════════════════════════════════ */}
        <div data-reveal>
          <ZetroPublicCta />
        </div>
    </>
  );
}
