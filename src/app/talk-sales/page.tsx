import Link from "next/link";
import { Metadata } from "next";
import { MarketingNav } from "@/components/marketing-nav";
import { SalesForm } from "@/components/sales-form";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = {
  title: "Talk to Sales | Zetro",
  description:
    "Tell us how many calls you score and average duration. We will reply with a customized quote in Tanzanian shillings.",
};

const BENEFITS = [
  {
    step: "01",
    label: "Billing",
    title: "Pay per scored call",
    desc: "Priced strictly by recording length and monthly volume tier. Failed or unscored uploads are always free.",
  },
  {
    step: "02",
    label: "Standards",
    title: "Your own scorecard",
    desc: "Upload your existing Excel, Word, or PDF guidelines. We score to your exact criteria weights and Auto-Zero rules.",
  },
  {
    step: "03",
    label: "Terms",
    title: "Invoicing in TZS",
    desc: "Direct monthly or annual invoicing payable within 30 days. No credit card required, with US dollars as a reference.",
  },
];

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
    <div className="marketing-shell flex min-h-full flex-col bg-white">
      <MarketingNav signedIn={signedIn} />

      <main className="flex-1 bg-white py-12 lg:py-20">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-2xl">
            <p className="page-kicker">Enterprise &amp; Volume</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Tell us your calls. We will send a quote.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">
              How many calls you want scored each month and how long they last sets your price per call.
              Invoices are issued in Tanzanian shillings.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Benefit Cards */}
            <div className="space-y-6 lg:col-span-5">
              <div className="grid gap-px border border-[#E3EBFB] bg-[#E3EBFB] rounded-none overflow-hidden shadow-xs">
                {BENEFITS.map((item) => (
                  <div key={item.step} className="bg-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">
                      {item.step} · {item.label}
                    </p>
                    <h3 className="mt-1 text-[15px] font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Direct email highlight card */}
              <div className="border border-[#E3EBFB] bg-[#F3F6FD] p-5 rounded-none shadow-xs">
                <span className="inline-block px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-[#04B6DA] text-white">
                  Direct Contract Inquiries
                </span>
                <h3 className="mt-2 text-[15px] font-semibold text-ink">Prefer email or phone?</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Email us with your floor requirements. We will review and reply within one business
                  day with an agreement.
                </p>
                <a
                  href={salesMailto("Zetro — contract or sales deal")}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#04B6DA] hover:text-[#039EBE] underline"
                >
                  <svg className="h-4 w-4 shrink-0 text-[#04B6DA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

              <div className="flex items-center gap-2 text-[12px] text-muted">
                <Icon icon={faCheck} size="xs" chip="accent" className="w-2.5 h-2.5" />
                <span>Includes 5 free trial calls scored on your own scorecard</span>
              </div>
            </div>

            {/* Right Column: Sales Quote Form Card */}
            <div className="lg:col-span-7">
              <div className="border border-[#E3EBFB] bg-white rounded-none overflow-hidden shadow-md">
                <div className="border-b border-[#E3EBFB] bg-[#F3F6FD] px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#061C52]">
                    Quote Request
                  </p>
                  <h2 className="mt-0.5 text-[18px] font-semibold text-ink">
                    Ask for a custom price in TZS
                  </h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Tell us your volume. We reply with a price per call in TZS. This form does not charge your card.
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
      </main>

      {/* Footer matching standard marketing layout */}
      <footer className="mt-auto border-t border-[#039EBE] bg-[#061C52] text-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-[12px] font-semibold text-[#E3EBFB]">
            Zetro is a product of Clevermargins Software Business Solutions (CSBS).
          </p>
          <div className="flex items-center gap-6 text-[13px] font-semibold text-[#E3EBFB]">
            <Link href="/pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/how-it-works" className="hover:text-white">
              How it works
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
