import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Zetro",
  description: "Transparent pricing for Zetro QA Intelligence.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20 lg:py-32">
      <div className="text-center mb-20 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl mb-6">
          Simple, <span className="text-blue">transparent</span> pricing
        </h1>
        <p className="text-xl text-muted leading-relaxed">
          No hidden fees. Only pay for the audio you process, or choose a predictable monthly plan for your entire team.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        
        {/* Tier 1 */}
        <div className="bg-white rounded-3xl p-8 border border-line/50 flex flex-col hover:shadow-lg transition-shadow">
          <h3 className="text-2xl font-bold text-ink mb-2">Starter</h3>
          <p className="text-muted text-sm mb-6">For small teams getting started with AI-powered QA.</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-ink">$99</span>
            <span className="text-muted font-medium"> / month</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/80 font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>2,000 AI minutes</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Automated QA scorecards</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Compliance checks & Sentiment analysis</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Agent performance & Basic analytics</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>English + Swahili</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Renew monthly. Cancel anytime.</li>
          </ul>
          <Link href="/signup" className="btn btn-blue w-full shadow-md shadow-blue/20">
            Start Free
          </Link>
        </div>

        {/* Tier 2 */}
        <div className="bg-blue rounded-3xl p-8 border border-blue shadow-sm shadow-blue/20 flex flex-col transform lg:-translate-y-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-2 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
            Most Popular
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
          <p className="text-blue-100 text-sm mb-6">For growing contact centers that need full QA automation.</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-white">$149</span>
            <span className="text-blue-100 font-medium"> / month</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-white font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>10,000 AI minutes</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Everything in Starter</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Advanced QA scorecards</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Custom SOPs & knowledge base</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Team & agent analytics</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Priority support</li>
          </ul>
          <Link href="/signup" className="btn bg-white text-blue hover:bg-surface-2 w-full shadow-md">
            Start Free
          </Link>
        </div>

        {/* Tier 3 */}
        <div className="bg-surface-2 rounded-3xl p-8 border border-line/50 flex flex-col hover:shadow-lg transition-shadow">
          <h3 className="text-2xl font-bold text-ink mb-2">Professional</h3>
          <p className="text-muted text-sm mb-6">For large contact centers with complex requirements.</p>
          <div className="mb-6 pt-2 pb-2">
            <span className="text-4xl font-extrabold text-ink">$299</span>
            <span className="text-muted font-medium"> / month</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/80 font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>25,000 AI minutes</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Custom integrations & Custom retention</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>SSO / Microsoft Entra</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Custom QA & AI Policies</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Dedicated support & SLA</li>
          </ul>
          <Link href="/signup" className="btn bg-white border border-line/50 text-ink hover:bg-surface-2 w-full shadow-sm">
            Start Free
          </Link>
        </div>

        {/* Tier 4 */}
        <div className="bg-surface-2 rounded-3xl p-8 border border-line/50 flex flex-col hover:shadow-lg transition-shadow">
          <h3 className="text-2xl font-bold text-ink mb-2">Enterprise</h3>
          <p className="text-muted text-sm mb-6">For global organizations requiring ultimate control and scale.</p>
          <div className="mb-6 pt-2 pb-2">
            <span className="text-3xl font-extrabold text-ink">Custom</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/80 font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Volume-based discounts</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>On-premise deployment options</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Dedicated account manager</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>White-glove onboarding</li>
          </ul>
          <Link href="/talk-sales" className="btn bg-white border border-line/50 text-ink hover:bg-surface-2 w-full shadow-sm">
            Talk to Sales
          </Link>
        </div>

      </div>

      <div className="max-w-4xl mx-auto mt-16 p-8 bg-surface-2 border border-line/50 rounded-lg">
        <h4 className="font-bold text-ink mb-4">Overage Pricing (Pay as you scale)</h4>
        <p className="text-muted text-sm mb-4">If you exceed your included monthly AI minutes, you will only be billed for what you use:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium">
          <div className="bg-white p-4 rounded-lg border border-line/40">
            <span className="block text-muted mb-1">Starter</span>
            <span className="text-ink text-lg font-bold">$0.05 <span className="text-sm font-normal text-muted">/ min</span></span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-line/40">
            <span className="block text-muted mb-1">Growth</span>
            <span className="text-ink text-lg font-bold">$0.035 <span className="text-sm font-normal text-muted">/ min</span></span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-line/40">
            <span className="block text-muted mb-1">Professional</span>
            <span className="text-ink text-lg font-bold">$0.02 <span className="text-sm font-normal text-muted">/ min</span></span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-line/40">
            <span className="block text-muted mb-1">Enterprise</span>
            <span className="text-ink text-lg font-bold">Custom <span className="text-sm font-normal text-muted">(&#60; $0.02)</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
