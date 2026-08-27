import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Zetro",
  description: "Transparent pricing for Zetro QA Intelligence.",
};

function Check() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const PLANS = [
  {
    name: "Starter",
    price: "$99",
    period: "/ month",
    blurb: "For small teams getting started with AI-powered QA.",
    href: "/signup",
    cta: "Start free",
    featured: false,
    features: [
      "2,000 AI minutes",
      "Automated QA scorecards",
      "Compliance checks & sentiment analysis",
      "Agent performance & basic analytics",
      "English + Swahili",
      "Renew monthly. Cancel anytime.",
    ],
  },
  {
    name: "Growth",
    price: "$149",
    period: "/ month",
    blurb: "For growing contact centers that need full QA automation.",
    href: "/signup",
    cta: "Start free",
    featured: true,
    features: [
      "10,000 AI minutes",
      "Everything in Starter",
      "Advanced QA scorecards",
      "Custom SOPs & knowledge base",
      "Team & agent analytics",
      "Priority support",
    ],
  },
  {
    name: "Professional",
    price: "$299",
    period: "/ month",
    blurb: "For large contact centers with complex requirements.",
    href: "/signup",
    cta: "Start free",
    featured: false,
    features: [
      "25,000 AI minutes",
      "Custom integrations & custom retention",
      "SSO / Microsoft Entra",
      "Custom QA & AI policies",
      "Dedicated support & SLA",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "For global organizations requiring ultimate control and scale.",
    href: "/talk-sales",
    cta: "Talk to sales",
    featured: false,
    features: [
      "Volume-based discounts",
      "On-premise deployment options",
      "Dedicated account manager",
      "White-glove onboarding",
    ],
  },
] as const;

const OVERAGE = [
  { plan: "Starter", rate: "$0.05", note: "/ min" },
  { plan: "Growth", rate: "$0.035", note: "/ min" },
  { plan: "Professional", rate: "$0.02", note: "/ min" },
  { plan: "Enterprise", rate: "Custom", note: "(< $0.02)" },
];

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="page-kicker">Pricing</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Plans that scale with call volume
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          No hidden fees. Pay a predictable monthly rate for included AI minutes, then only for what you process beyond that.
        </p>
      </header>

      <div className="mt-12 grid border border-line bg-white lg:grid-cols-4">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col border-b border-line p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 ${
              plan.featured ? "bg-blue-soft/40 ring-1 ring-inset ring-blue" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink">{plan.name}</h2>
              {plan.featured ? <span className="chip">Recommended</span> : null}
            </div>
            <p className="mt-2 min-h-[40px] text-[13px] leading-relaxed text-muted">{plan.blurb}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-[32px] font-semibold tracking-tight text-ink">{plan.price}</span>
              {plan.period ? <span className="text-[13px] text-muted">{plan.period}</span> : null}
            </p>
            <Link
              href={plan.href}
              className={`btn mt-5 w-full ${plan.featured ? "btn-blue" : "btn-ghost"}`}
            >
              {plan.cta}
            </Link>
            <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
              {plan.features.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="mt-10 border border-line bg-white">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Overage</h2>
          <p className="mt-1 text-[13px] text-muted">
            If you exceed included monthly AI minutes, additional minutes are billed at the plan rate.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th className="text-right">Rate beyond included minutes</th>
              </tr>
            </thead>
            <tbody>
              {OVERAGE.map((row) => (
                <tr key={row.plan}>
                  <td className="font-medium text-ink">{row.plan}</td>
                  <td className="text-right tabular-nums text-ink">
                    {row.rate} <span className="font-normal text-muted">{row.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          ["Bilingual by default", "Tanzania workspaces audit in Kiswahili and English. Other regions audit in English."],
          ["Cancel anytime", "Starter, Growth, and Professional renew monthly. Stop at the end of the billing period."],
          ["Need a custom contract?", "Enterprise covers volume pricing, on-premise options, and a dedicated account team."],
        ].map(([title, body]) => (
          <div key={title} className="bg-white px-6 py-5">
            <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border border-line bg-white px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[15px] font-semibold text-ink">Not sure which plan fits your volume?</p>
          <p className="mt-1 text-[13px] text-muted">We’ll map minutes to your contact center and recommend a tier.</p>
        </div>
        <Link href="/talk-sales" className="btn btn-blue shrink-0">
          Talk to sales
        </Link>
      </div>
    </div>
  );
}
