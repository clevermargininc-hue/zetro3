import Link from "next/link";
import { Logo } from "@/components/logo";
import { SalesForm } from "@/components/sales-form";


export default function TalkSalesPage() {
  return (
    <div className="min-h-screen bg-surface-2 flex flex-col">
      <header className="border-b border-line/40 bg-white/70 none-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <Link href="/" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-12 lg:py-20">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          <div className="animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line/50 shadow-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue animate-pulse"></span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-muted">Enterprise Solutions</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-ink mb-6 leading-tight">
              Transform your <br />contact center QA.
            </h1>
            
            <p className="text-[16px] leading-relaxed text-muted mb-8">
              Zetro provides enterprise-grade quality intelligence. Talk to our team to discover how we can help you transcribe, analyze, and score every conversation automatically.
            </p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-line/40 shadow-sm text-blue font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-ink">Bilingual Mastery</h3>
                  <p className="text-sm text-muted mt-1">Used in Tanzania for Kiswahili and English. English only elsewhere.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-line/40 shadow-sm text-blue font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-ink">Custom Scorecards</h3>
                  <p className="text-sm text-muted mt-1">Audit against your unique compliance rules and SOPs.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-line/40 shadow-sm text-blue font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-ink">Actionable Intelligence</h3>
                  <p className="text-sm text-muted mt-1">Stop guessing and start coaching from real evidence.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
            <div className="bg-white rounded-3xl p-8 border border-line/40 shadow-sm shadow-blue/5">
              <h2 className="text-2xl font-bold tracking-tight text-ink mb-2">Request a Demo</h2>
              <p className="text-sm text-muted mb-8">Fill out the form below and our sales team will reach out shortly.</p>
              
              <SalesForm />
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
