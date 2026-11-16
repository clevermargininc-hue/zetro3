"use client";

import { Globe } from "lucide-react";
import { isTanzania } from "@/lib/locale";

const COUNTRY_ISO: Record<string, string> = {
  kenya: "KE",
  uganda: "UG",
  rwanda: "RW",
  burundi: "BI",
  "south africa": "ZA",
  nigeria: "NG",
  ghana: "GH",
  ethiopia: "ET",
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  england: "GB",
  "united states": "US",
  usa: "US",
  "united states of america": "US",
  canada: "CA",
  india: "IN",
  philippines: "PH",
  zambia: "ZM",
  malawi: "MW",
  mozambique: "MZ",
  botswana: "BW",
  namibia: "NA",
  cameroon: "CM",
  senegal: "SN",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  egypt: "EG",
  morocco: "MA",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  uae: "AE",
  "united arab emirates": "AE",
  australia: "AU",
  "new zealand": "NZ",
  singapore: "SG",
  tanzania: "TZ",
  tz: "TZ",
};

export function flagIsoForCountry(country: string | null | undefined) {
  const key = (country || "").trim().toLowerCase();
  if (!key) return null;
  if (isTanzania(key)) return "tz";
  const iso = COUNTRY_ISO[key];
  if (!iso) return null;
  return iso.toLowerCase();
}

/** Tanzania flag mark — using flagcdn for a real icon */
export function TanzaniaFlagIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img
      src="https://flagcdn.com/tz.svg"
      alt="Tanzania"
      className={`object-cover rounded-sm ${className}`}
      aria-hidden
    />
  );
}

export function WorldFlagIcon({
  country,
  className = "h-7 w-7",
}: {
  country?: string;
  className?: string;
}) {
  const iso = flagIsoForCountry(country);
  if (iso) {
    return (
      <img
        src={`https://flagcdn.com/${iso}.svg`}
        alt={country || ""}
        className={`object-cover rounded-sm ${className}`}
        aria-hidden
      />
    );
  }
  return <Globe className={className} strokeWidth={1.6} aria-hidden />;
}

type Mode = "tz" | "other" | null;

type CountryRegionPickerProps = {
  mode: Mode;
  otherCountry: string;
  disabled?: boolean;
  onModeChange: (mode: "tz" | "other") => void;
  onOtherCountryChange: (value: string) => void;
};

export function CountryRegionPicker({
  mode,
  otherCountry,
  disabled,
  onModeChange,
  onOtherCountryChange,
}: CountryRegionPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange("tz")}
        aria-pressed={mode === "tz"}
        className={`flex w-full items-start gap-4 rounded-xl border bg-white p-5 text-left transition-colors ${mode === "tz" ? "border-navy bg-blue-soft/60" : "border-line hover:border-slate-300"
          }`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white">
          <TanzaniaFlagIcon className="h-11 w-11" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-ink">Tanzania</span>
          <span className="mt-1 block text-sm text-muted">Kiswahili and English</span>
        </span>
      </button>

      <div
        className={`flex w-full flex-col gap-3 rounded-xl border bg-white p-5 text-left transition-colors ${mode === "other" ? "border-navy bg-blue-soft/60" : "border-line hover:border-slate-300"
          }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("other")}
          aria-pressed={mode === "other"}
          className="flex w-full items-start gap-4 text-left"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white text-slate-500">
            <WorldFlagIcon country={otherCountry} className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-ink">Another country / region</span>
            <span className="mt-1 block text-sm text-muted">English only — type your country</span>
          </span>
        </button>

        {mode === "other" ? (
          <label className="flex w-full flex-col gap-1.5 text-sm sm:pl-[3.75rem]">
            <span className="font-medium text-ink">Country or region</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <WorldFlagIcon country={otherCountry} className="h-5 w-5" />
              </span>
              <input
                autoFocus
                value={otherCountry}
                disabled={disabled}
                onChange={(event) => onOtherCountryChange(event.target.value)}
                placeholder="e.g. Kenya, Nigeria, United Kingdom"
                className="field"
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </label>
        ) : null}
      </div>
    </div>
  );
}
