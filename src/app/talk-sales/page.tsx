import Link from "next/link";
import { Metadata } from "next";
import { Logo } from "@/components/logo";
import { SalesForm } from "@/components/sales-form";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Talk to sales | Zetro",
  description: "Tell us how many calls you score and how long they last. We reply with a quote in TZS.",
};

export default async function TalkSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ calls?: string; minutes?: string; billing?: string }>;
}) {
  const { calls, minutes, billing } = await searchParams;

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col">
      <header className="border-b border-line/40 bg-white/70 none-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <Link href="/pricing" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">
            Back to pricing
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-12 lg:py-20">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          <div className="animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line/50 shadow-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue animate-pulse"></span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-muted">Talk to us</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-ink mb-6 leading-tight">
              Tell us your calls. <br />We will send a quote.
            </h1>
            
            <p className="text-[16px] leading-relaxed text-muted mb-8">
              How many calls you want scored each month and how long they last. That sets the price per call. Invoices are in TZS.
            </p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-line/40 shadow-sm text-blue font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-ink">You pay per scored call</h3>
                  <p className="text-sm text-muted mt-1">Priced by call length and monthly volume. Failed uploads are free.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-line/40 shadow-sm text-blue font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-ink">Your scorecard</h3>
                  <p className="text-sm text-muted mt-1">We mark calls the way you already judge quality.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-line/40 shadow-sm text-blue font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-ink">Invoices by email, in TZS</h3>
                  <p className="text-sm text-muted mt-1">
                    No online payment yet. For contracts, payment, and deals, email{" "}
                    <a href={salesMailto("Zetro — contract or sales deal")} className="font-semibold text-blue hover:underline">
                      {SALES_EMAIL}
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
            <div className="bg-white rounded-3xl p-8 border border-line/40 shadow-sm shadow-blue/5">
              <h2 className="text-2xl font-bold tracking-tight text-ink mb-2">Ask for a quote</h2>
              <p className="text-sm text-muted mb-8">
                Tell us your volume. We reply with a price per call in TZS. This form does not charge you.
              </p>
              
              <SalesForm
                initialCalls={calls}
                initialMinutes={minutes}
                initialBilling={billing}
              />
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
