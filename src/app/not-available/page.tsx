import type { Metadata } from "next";
import { headers } from "next/headers";
import { Logo } from "@/components/logo";
import { NotAvailablePanel, SalesEmailNote } from "@/components/country-waitlist";
import { countryNameFor, countryOptions } from "@/lib/countries";
import { allowedCountries, countryFromHeaders, normalizeCountryCode } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Not available in your country yet | Zetro",
  description: "Zetro is live in Tanzania. Tell us where you are and we will let you know when we launch there.",
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
  const detectedName = detected && !allowed.includes(detected) ? countryNameFor(detected) : null;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-[var(--border)] bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-14 lg:py-20">
        <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="page-kicker">Tanzania only, for now</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
              {detectedName
                ? `Zetro is not available in ${detectedName} yet`
                : "Find out when Zetro launches in your country"}
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">
              We are starting with contact centers in Tanzania, where we score calls in English and
              Kiswahili. Tell us where you are from and we will let you know as soon as Zetro is live
              in your country.
            </p>
            <ul className="mt-8 space-y-3 text-[14px] leading-relaxed text-muted">
              <li>
                <span className="font-semibold text-ink">No spam. </span>
                One email when we launch in your country.
              </li>
              <li>
                <span className="font-semibold text-ink">Real people read it. </span>
                Your message goes straight to our sales team.
              </li>
            </ul>
            <SalesEmailNote className="mt-8" />
          </div>

          <div className="surface p-6 sm:p-8">
            <NotAvailablePanel
              countries={countryOptions()}
              allowed={allowed}
              initialCountry={detected}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E3EBFB] bg-[#F3F6FD] py-6">
        <p className="mx-auto max-w-5xl px-6 text-[12px] font-semibold text-ink">
          Zetro is a product of Clevermargins Software Business Solutions (CSBS).
        </p>
      </footer>
    </div>
  );
}
