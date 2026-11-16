import Link from "next/link";
import { headers } from "next/headers";
import { AuthForm } from "@/components/auth-form";
import { SignupCountryGate } from "@/components/country-waitlist";
import { Logo } from "@/components/logo";
import { countryOptions } from "@/lib/countries";
import { allowedCountries, countryFromHeaders } from "@/lib/geo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; error?: string }>;
}) {
  const { next, email, error } = await searchParams;
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const invited = dest?.startsWith("/invite/");
  const allowed = [...allowedCountries()];
  const initialCountry = countryFromHeaders(await headers());

  return (
    <div className="simple-auth grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface-2 p-10 lg:flex">
        <div className="relative z-10">
          <Logo />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft border border-[#99F6E4] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal">
            Get Started
          </span>
          <h1 className="mt-4 max-w-md text-3xl font-bold leading-snug text-navy">
            Open a workspace. Score one call today.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Upload your existing scorecard, drop in a call recording, and get a verified coaching brief and customer journey intelligence in seconds.
          </p>
        </div>
        <p className="relative z-10 text-xs font-medium text-muted">Upload, prepare, score — then take notes to the huddle.</p>
      </div>
      <div className="grid place-items-center bg-white px-5 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Logo size="sm" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A1A3F]">
            {invited ? "Create your account to join" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {invited
              ? "Use the email this invitation was sent to. After you sign in you will join that workspace automatically."
              : "Use your work email. After sign-up you can join a team or start on your own."}
          </p>
          <div className="mt-8">
            <SignupCountryGate countries={countryOptions()} allowed={allowed} initialCountry={initialCountry}>
              <AuthForm mode="signup" next={dest} email={email} initialError={error} />
            </SignupCountryGate>
          </div>
          <p className="mt-6 text-sm text-muted">
            Already have a workspace?{" "}
            <Link
              href={
                dest
                  ? `/login?next=${encodeURIComponent(dest)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
                  : "/login"
              }
              className="font-semibold text-blue hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
