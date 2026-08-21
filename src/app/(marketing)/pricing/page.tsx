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

      <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        
        {/* Tier 1 */}
        <div className="bg-white rounded-3xl p-8 border border-line/50 flex flex-col hover:shadow-lg transition-shadow">
          <h3 className="text-2xl font-bold text-ink mb-2">Starter</h3>
          <p className="text-muted text-sm mb-6">Perfect for small teams testing the waters.</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-ink">$0.03</span>
            <span className="text-muted font-medium"> / minute</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/80 font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Bilingual Audio Transcription</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Standard QA Scorecards</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Basic Analytics</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Pay-as-you-go billing</li>
          </ul>
          <Link href="/signup" className="btn btn-blue w-full shadow-md shadow-blue/20">
            Start for free
          </Link>
        </div>

        {/* Tier 2 */}
        <div className="bg-blue rounded-3xl p-8 border border-blue shadow-xl shadow-blue/20 flex flex-col transform lg:-translate-y-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-2 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
            Most Popular
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
          <p className="text-blue-100 text-sm mb-6">For growing contact centers needing predictability.</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-white">$49</span>
            <span className="text-blue-100 font-medium"> / agent / mo</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-white font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Includes 2,000 minutes per agent</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Custom SOP & Manual Uploads</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Advanced Coaching Dashboards</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>1-Year Data Retention</li>
          </ul>
          <Link href="/signup" className="btn bg-white text-blue hover:bg-surface-2 w-full shadow-md">
            Start Free Trial
          </Link>
        </div>

        {/* Tier 3 */}
        <div className="bg-surface-2 rounded-3xl p-8 border border-line/50 flex flex-col hover:shadow-lg transition-shadow">
          <h3 className="text-2xl font-bold text-ink mb-2">Enterprise</h3>
          <p className="text-muted text-sm mb-6">For large scale operations with custom needs.</p>
          <div className="mb-6 pt-2 pb-2">
            <span className="text-3xl font-extrabold text-ink">Custom</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/80 font-medium">
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Volume Discounts</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Custom AI Fine-tuning</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>SSO & Active Directory Integration</li>
             <li className="flex gap-3"><svg className="w-5 h-5 text-ink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Dedicated Success Manager & SLAs</li>
          </ul>
          <Link href="/talk-sales" className="btn bg-white border border-line/50 text-ink hover:bg-surface-2 w-full shadow-sm">
            Contact Sales
          </Link>
        </div>

      </div>
    </div>
  );
}
