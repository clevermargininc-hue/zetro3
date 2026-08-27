import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solutions | Zetro",
  description: "Zetro AI solutions tailored for QA Managers, Operations Directors, and specific industries.",
};

export default function SolutionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20 lg:py-32">
      <div className="text-center mb-20 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl mb-6">
          Built for the <span className="text-blue">entire team</span>
        </h1>
        <p className="text-xl text-muted leading-relaxed">
          From the frontline agent to the Director of Operations, Zetro turns black-box conversations into actionable intelligence.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-3 mb-32">
        {/* Role 1 */}
        <div className="bg-white rounded-3xl p-10 border border-line/40 shadow-sm hover:shadow-sm transition-all group">
          <h3 className="text-2xl font-bold text-ink mb-2">For QA Managers</h3>
          <p className="text-blue font-medium mb-6">Stop listening. Start coaching.</p>
          <p className="text-muted leading-relaxed mb-6">
            Spend less time hunting for the 1% of calls to review, and more time actually helping your agents improve. Zetro automatically flags non-compliant calls and highlights exactly where the conversation went wrong.
          </p>
          <ul className="space-y-3 text-sm text-ink/80 font-medium">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              100% Audit Coverage
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Targeted Coaching Recommendations
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Automated Scorecard Filling
            </li>
          </ul>
        </div>

        {/* Role 2 */}
        <div className="bg-blue rounded-3xl p-10 shadow-sm shadow-blue/20 transition-all text-white transform lg:-translate-y-4">
          <h3 className="text-2xl font-bold mb-2">For Operations Directors</h3>
          <p className="text-blue-200 font-medium mb-6">Mitigate risk. Maximize ROI.</p>
          <p className="text-white/80 leading-relaxed mb-6">
            Ensure that standard operating procedures are being followed across the entire floor. Identify compliance risks, fraud attempts, or negative customer sentiment before they escalate into major business problems.
          </p>
          <ul className="space-y-3 text-sm text-white font-medium">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Real-time Compliance Alerts
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Macro Trend Analysis
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Agent Performance Leaderboards
            </li>
          </ul>
        </div>

        {/* Role 3 */}
        <div className="bg-white rounded-3xl p-10 border border-line/40 shadow-sm hover:shadow-sm transition-all group">
          <h3 className="text-2xl font-bold text-ink mb-2">For Agents</h3>
          <p className="text-blue font-medium mb-6">Fair, unbiased evaluations.</p>
          <p className="text-muted leading-relaxed mb-6">
            Agents hate being judged on just one "bad call" that happened to be selected for manual review. Zetro evaluates every single interaction, ensuring that agents are graded on their average performance, not their worst day.
          </p>
          <ul className="space-y-3 text-sm text-ink/80 font-medium">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Objective AI Scoring
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Clear Feedback Loop
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Recognition for Top Performers
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line/40 pt-20">
        <h2 className="text-3xl font-bold text-center text-ink mb-16">Trusted across Industries</h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-surface-2 p-8 rounded-3xl">
            <h4 className="font-bold text-xl text-ink mb-3">Telecommunications</h4>
            <p className="text-muted">Ensure sales agents are correctly disclosing terms and conditions when upselling data packages or mobile money services in both English and Swahili.</p>
          </div>
          <div className="bg-surface-2 p-8 rounded-3xl">
            <h4 className="font-bold text-xl text-ink mb-3">Financial Services</h4>
            <p className="text-muted">Audit debt collection calls for empathy and regulatory compliance. Detect fraudulent patterns automatically based on audio transcriptions.</p>
          </div>
          <div className="bg-surface-2 p-8 rounded-3xl">
            <h4 className="font-bold text-xl text-ink mb-3">BPO & Outsourcing</h4>
            <p className="text-muted">Prove SLA adherence to your clients with concrete data. Provide clients with a transparent dashboard of their campaigns' QA scores.</p>
          </div>
          <div className="bg-surface-2 p-8 rounded-3xl">
            <h4 className="font-bold text-xl text-ink mb-3">E-commerce</h4>
            <p className="text-muted">Track product mentions, delivery complaints, and monitor the resolution rate of common customer inquiries without manual sampling.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-20 text-center">
        <Link href="/talk-sales" className="btn btn-lg btn-blue shadow-sm shadow-blue/20 hover:-translate-y-1 transition-all px-10">
          Discuss your Use Case
        </Link>
      </div>
    </div>
  );
}
