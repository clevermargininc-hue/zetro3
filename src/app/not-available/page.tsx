import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Logo } from "@/components/logo";
import { NotAvailablePanel, SalesEmailNote } from "@/components/country-waitlist";
import { TRIAL_CALLS } from "@/lib/billing";
import { countryNameFor, countryOptions } from "@/lib/countries";
import { allowedCountries, countryFromHeaders, normalizeCountryCode } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Regional Availability | Zetro",
  description: "Check regional availability or start a workspace for your contact center.",
  robots: { index: false },
};

export default async function NotAvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const detected = normalizeCountryCode(country) || countryFromHeaders(await headers());
  const allowed = [...allowedCountries()];
  const isBlocked = Boolean(detected && allowed.length > 0 && !allowed.includes(detected));
  const detectedName = detected ? countryNameFor(detected) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#fafbfe] text-text-primary">
      <header className="border-b border-line-subtle bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo size="sm" />
          <Link href="/login" className="text-sm font-semibold text-text-secondary hover:text-navy">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-14 lg:py-20">
        <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <div className="kicker-badge mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue" />
              <span>Regional Availability</span>
            </div>
            <h1 className="section-headline text-3xl sm:text-4xl text-left">
              {isBlocked && detectedName
                ? `Rolling out to ${detectedName} soon`
                : detectedName
                  ? `Zetro is available in ${detectedName}`
                  : "Continuous QA for contact centers"}
            </h1>
            <p className="mt-4 body-editorial">
              {isBlocked
                ? "Self-serve signup is currently prioritized for supported East African and partner regions. Confirm your country on the right or join the priority rollout list."
                : "You can sign up, create a workspace, and score contact center calls against your exact scorecard standards."}
            </p>
            {!isBlocked && (
              <div className="mt-8 flex items-center gap-4">
                <Link href="/signup" className="btn btn-lg btn-blue inline-flex items-center rounded-full px-6">
                  Get started free &rarr;
                </Link>
              </div>
            )}
            <ul className="mt-8 space-y-3 text-[14px] leading-relaxed text-text-secondary">
              <li className="flex items-start gap-2.5">
                <span className="mt-1 font-bold text-emerald-600">✓</span>
                <span>
                  <strong className="font-semibold text-text-primary">Bilingual + Multilingual. </strong>
                  Engineered for East African code-switching (Kiswahili + English) and international call centers.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 font-bold text-emerald-600">✓</span>
                <span>
                  <strong className="font-semibold text-text-primary">Zero Setup Fee. </strong>
                  Start with {TRIAL_CALLS} free calls scored against your own rubric.
                </span>
              </li>
            </ul>
            <SalesEmailNote className="mt-8" />
          </div>

          <div className="rounded-3xl border border-line-subtle bg-white p-6 sm:p-8 shadow-xl shadow-neutral-900/[0.04]">
            <NotAvailablePanel
              countries={countryOptions()}
              allowed={allowed}
              initialCountry={detected}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-line-subtle bg-white py-6">
        <p className="mx-auto max-w-5xl px-6 text-[12px] font-medium text-text-muted">
          Zetro is a product of Clevermargins Software Business Solutions (CSBS).
        </p>
      </footer>
    </div>
  );
}
