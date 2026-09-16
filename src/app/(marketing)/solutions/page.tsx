import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solutions | Zetro",
  description: "Zetro AI solutions tailored for QA Managers, Operations Directors, and specific industries.",
};

function Check() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const ROLES = [
  {
    title: "QA managers",
    kicker: "Stop sampling. Start coaching.",
    body: "Spend less time hunting for the 1% of calls to review, and more time helping agents improve. Zetro flags non-compliant calls and shows where the conversation went wrong.",
    points: ["100% audit coverage", "Targeted coaching recommendations", "Automated scorecard filling"],
    featured: false,
  },
  {
    title: "Operations directors",
    kicker: "Mitigate risk. Maximize ROI.",
    body: "Confirm that standard operating procedures are followed across the floor. Identify compliance risk, fraud attempts, or negative sentiment before they escalate.",
    points: ["Real-time compliance alerts", "Macro trend analysis", "Agent performance rankings"],
    featured: true,
  },
  {
    title: "Agents",
    kicker: "Fair, consistent evaluations.",
    body: "Agents should not be judged on one bad call that happened to be sampled. Zetro evaluates every interaction so people are graded on typical performance, not a single worst moment.",
    points: ["Objective AI scoring", "Clear feedback loop", "Recognition for top performers"],
    featured: false,
  },
] as const;

const INDUSTRIES = [
  {
    title: "Telecommunications",
    body: "Ensure sales agents correctly disclose terms when upselling data packages or mobile money services in both English and Swahili.",
  },
  {
    title: "Financial services",
    body: "Audit debt collection calls for empathy and regulatory compliance. Detect fraudulent patterns from the transcript.",
  },
  {
    title: "BPO & outsourcing",
    body: "Prove SLA adherence to clients with concrete data. Share a transparent dashboard of campaign QA scores.",
  },
  {
    title: "E-commerce",
    body: "Track product mentions, delivery complaints, and resolution rates without manual sampling.",
  },
] as const;

export default function SolutionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="max-w-2xl">
        <p className="page-kicker">Solutions</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Built for the whole floor
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          From the frontline agent to the director of operations, Zetro turns conversations into evidence you can act on.
        </p>
      </header>

      <div className="mt-12 grid border border-line bg-white lg:grid-cols-3">
        {ROLES.map((role) => (
          <article
            key={role.title}
            className={`flex flex-col border-b border-line p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 ${
              role.featured ? "bg-blue-soft ring-2 ring-inset ring-blue" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[16px] font-semibold text-ink">{role.title}</h2>
              {role.featured ? <span className="chip chip-ok">Operations</span> : null}
            </div>
            <p className="mt-2 text-[13px] font-medium text-ink">{role.kicker}</p>
            <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted">{role.body}</p>
            <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
              {role.points.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-[15px] font-semibold text-ink">Industries</h2>
        <p className="mt-1 text-[13px] text-muted">The same audit workflow, applied to regulated and high-volume service lines.</p>
        <div className="mt-4 grid border border-line bg-white sm:grid-cols-2">
          {INDUSTRIES.map((item, index) => (
            <article
              key={item.title}
              className={`p-6 ${index % 2 === 0 ? "sm:border-r border-line" : ""} ${
                index < 2 ? "border-b border-line" : ""
              }`}
            >
              <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border border-line bg-white px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[15px] font-semibold text-ink">Discuss your use case</p>
          <p className="mt-1 text-[13px] text-muted">We’ll map Zetro to your QA process, languages, and volume.</p>
        </div>
        <Link href="/talk-sales" className="btn btn-blue shrink-0">
          Talk to sales
        </Link>
      </div>
    </div>
  );
}
