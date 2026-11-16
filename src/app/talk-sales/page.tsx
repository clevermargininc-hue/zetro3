import "../(marketing)/z-landing.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ZetroPublicFooter, ZetroPublicNav } from "@/components/landing/zetro-public-chrome";
import { SalesForm } from "@/components/sales-form";
import { TRIAL_CALLS } from "@/lib/billing";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Book a Demo & Talk to Sales | Zetro",
  description:
    "Tell us how many calls you score and average duration. Our Dar es Salaam team will reply with an official quote in Tanzanian Shillings.",
};

const BENEFITS = [
  {
    step: "01",
    label: "Billing",
    title: "Pay per scored call",
    desc: "Priced strictly by recording duration and monthly volume tier. Failed or unscored uploads are never billed.",
  },
  {
    step: "02",
    label: "Standards",
    title: "Your own company scorecard",
    desc: "Upload your existing Excel, Word, or PDF guidelines. Zetro applies your exact weights and Auto-Zero triggers.",
  },
  {
    step: "03",
    label: "Commercials",
    title: "30-day TZS invoicing",
    desc: "Monthly or annual enterprise contracts invoiced in Tanzanian Shillings with 30-day terms and zero online card required.",
  },
] as const;

export default async function TalkSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ calls?: string; minutes?: string; billing?: string }>;
}) {
  const { calls, minutes, billing } = await searchParams;

  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return (
    <div className="z-landing flex min-h-full flex-col antialiased">
      <a href="#main-content" className="z-skip">
        Skip to main content
      </a>

      <ZetroPublicNav signedIn={signedIn} />

      <main id="main-content" className="flex-1">
        {/* ── Subhero ───────────────────────────────────────────────── */}
        <section className="z-subhero" aria-labelledby="sales-heading">
          <div className="z-container">
            <span className="z-eyebrow">Dar es Salaam commercial team · Demo &amp; Quote</span>
            <h1 id="sales-heading" className="z-subhero-h1">
              Tell us your call volume.{" "}
              <span className="z-h1-accent">We&apos;ll prepare a custom TZS proposal.</span>
            </h1>
            <p className="z-subhero-lead">
              Book a live walkthrough with our East Africa engineering and QA team or request an
              official enterprise quote in Tanzanian Shillings based on your monthly call length
              and queue count.
            </p>
          </div>
        </section>

        {/* ── Two-Column Demo + Quote Request ───────────────────────── */}
        <section className="z-section" style={{ paddingTop: "56px", paddingBottom: "88px" }}>
          <div className="z-container">
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Column: Benefits & Direct Contact */}
              <div className="space-y-6 lg:col-span-5">
                <div className="z-card divide-y divide-[#E3E9F5] overflow-hidden">
                  {BENEFITS.map((item) => (
                    <div key={item.step} className="p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2459E8]">
                        {item.step} · {item.label}
                      </p>
                      <h2 className="font-display mt-1.5 text-[17px] font-bold text-[#0A1A3F]">
                        {item.title}
                      </h2>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5A6882]">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[16px] border border-[#DCE6FF] bg-[#EEF3FF]/70 p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2459E8]">
                    Direct commercial inquiries
                  </p>
                  <h2 className="font-display mt-1.5 text-[17px] font-bold text-[#0A1A3F]">
                    Prefer email or direct procurement review?
                  </h2>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5A6882]">
                    Send your floor requirements or RFP notes directly. We respond within one
                    business day with a commercial quote in TZS.
                  </p>
                  <a
                    href={salesMailto("Zetro — contract or sales deal")}
                    className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#2459E8] hover:underline"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{SALES_EMAIL}</span>
                  </a>
                </div>

                <div className="z-card flex items-center justify-between gap-4 p-4 text-[13px] text-[#0A1A3F]">
                  <span className="font-medium">
                    Includes {TRIAL_CALLS} free calls scored on your own rubric
                  </span>
                  <Link
                    href="/pricing#calculator"
                    className="shrink-0 font-semibold text-[#2459E8] hover:underline"
                  >
                    Open calculator →
                  </Link>
                </div>
              </div>

              {/* Right Column: Official Quote Form */}
              <div className="lg:col-span-7">
                <div className="z-card overflow-hidden">
                  <div className="border-b border-[#E3E9F5] bg-[#F8FAFF] px-6 py-5 sm:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2459E8]">
                      Quote &amp; walkthrough request
                    </p>
                    <h2 className="font-display mt-1 text-[21px] font-bold text-[#0A1A3F]">
                      Request an official quote in TZS
                    </h2>
                    <p className="mt-1 text-[13.5px] text-[#5A6882]">
                      Share your estimated monthly call volume and recording length. No card required.
                    </p>
                  </div>

                  <div className="p-6 sm:p-8">
                    <SalesForm
                      initialCalls={calls}
                      initialMinutes={minutes}
                      initialBilling={billing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ZetroPublicFooter signedIn={signedIn} />
    </div>
  );
}
