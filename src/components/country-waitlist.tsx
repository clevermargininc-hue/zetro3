"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import type { CountryOption } from "@/lib/countries";

function nameFor(countries: CountryOption[], code: string) {
  return countries.find((country) => country.code === code)?.name || code;
}

function knownCode(countries: CountryOption[], code: string | null) {
  return code && countries.some((country) => country.code === code) ? code : "";
}

export function CountrySelect({
  id,
  countries,
  value,
  onChange,
  disabled,
}: {
  id: string;
  countries: CountryOption[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      {value ? (
        <img
          src={`https://flagcdn.com/${value.toLowerCase()}.svg`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-6 -translate-y-1/2 rounded-[2px] object-cover"
        />
      ) : null}
      <select
        id={id}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field w-full"
        style={value ? { paddingLeft: "2.75rem" } : undefined}
      >
        <option value="" disabled>
          Select your country
        </option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function WaitlistForm({
  country,
  countryName,
  submitLabel = "Let me know",
}: {
  country: string;
  countryName: string;
  submitLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentFor, setSentFor] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          fullName: form.get("fullName"),
          workEmail: form.get("workEmail"),
          companyName: form.get("companyName"),
          message: form.get("message"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not send your details. Try again.");
      setSentFor(countryName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sentFor) {
    return (
      <div className="border border-line bg-bg px-5 py-6 text-center">
        <p className="text-[17px] font-semibold text-ink">Thank you!</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          You will be one of the first to know when we launch in {sentFor}. Our team has your
          message and will reply by email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Full name</span>
          <input name="fullName" required maxLength={200} className="field" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Company (optional)</span>
          <input name="companyName" maxLength={200} className="field" autoComplete="organization" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Work email</span>
        <input name="workEmail" required type="email" maxLength={320} className="field" autoComplete="email" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Message (optional)</span>
        <textarea
          name="message"
          rows={3}
          maxLength={3000}
          className="field resize-none"
          placeholder="Tell us about your contact center: calls per month, languages, team size."
        />
      </label>
      {error ? <p className="alert-error text-[13px]">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn btn-lg btn-blue">
        {loading ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

export function SalesEmailNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[13px] leading-relaxed text-muted ${className}`}>
      Contracts, payment, or a sales deal? Email us at{" "}
      <a
        href={salesMailto("Zetro — contract or sales deal")}
        className="font-semibold text-blue hover:underline"
      >
        {SALES_EMAIL}
      </a>
      .
    </p>
  );
}

/** Paystack-style notice: pick a country, see if we are live there, otherwise join the list. */
export function NotAvailablePanel({
  countries,
  allowed,
  initialCountry,
}: {
  countries: CountryOption[];
  allowed: string[];
  initialCountry: string | null;
}) {
  const [country, setCountry] = useState(() => knownCode(countries, initialCountry));
  const isLive = country !== "" && allowed.includes(country);
  const liveNames = allowed.map((code) => nameFor(countries, code)).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <label htmlFor="waitlist-country" className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Let me know when Zetro launches in</span>
        <CountrySelect id="waitlist-country" countries={countries} value={country} onChange={setCountry} />
      </label>

      {isLive ? (
        <div className="border border-blue/30 bg-blue-soft px-5 py-4">
          <p className="text-[15px] font-semibold text-ink">
            Zetro is already live in {nameFor(countries, country)}!
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            If you are in {nameFor(countries, country)} and still see this page, you may be on a VPN
            or travelling. Turn off the VPN and reload, or send us a message below and we will help.
          </p>
        </div>
      ) : null}

      {country ? (
        <WaitlistForm
          key={country}
          country={country}
          countryName={nameFor(countries, country)}
          submitLabel={isLive ? "Send message" : "Let me know"}
        />
      ) : (
        <p className="text-[13px] text-muted">Zetro is live in {liveNames}.</p>
      )}
    </div>
  );
}

/** Signup step: where are you from? Allowed countries continue; others get the waitlist form. */
export function SignupCountryGate({
  countries,
  allowed,
  initialCountry,
  children,
}: {
  countries: CountryOption[];
  allowed: string[];
  initialCountry: string | null;
  children: ReactNode;
}) {
  const [country, setCountry] = useState(() => knownCode(countries, initialCountry));
  const isLive = country !== "" && allowed.includes(country);
  const countryName = country ? nameFor(countries, country) : "";

  return (
    <div className="flex flex-col gap-6">
      <label htmlFor="signup-country" className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Where are you from?</span>
        <CountrySelect id="signup-country" countries={countries} value={country} onChange={setCountry} />
      </label>

      {isLive ? children : null}

      {country && !isLive ? (
        <div className="flex flex-col gap-5">
          <div className="border border-line bg-bg px-5 py-4">
            <p className="text-[15px] font-semibold text-ink">Zetro is not available in {countryName} yet</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              We are starting with contact centers in Tanzania. Leave your details and we will tell you
              as soon as we launch in {countryName}.
            </p>
          </div>
          <WaitlistForm key={country} country={country} countryName={countryName} />
          <SalesEmailNote />
        </div>
      ) : null}
    </div>
  );
}
