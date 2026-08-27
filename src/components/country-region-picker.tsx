"use client";

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
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      <path d="M5.5 7.5c2.2 1.2 5 1.8 6.5 1.8s4.3-.6 6.5-1.8" />
      <path d="M5.5 16.5c2.2-1.2 5-1.8 6.5-1.8s4.3.6 6.5 1.8" />
    </svg>
  );
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
        className={`flex w-full items-start gap-4 border bg-white p-5 text-left ${
          mode === "tz" ? "border-blue bg-blue-soft" : "border-line hover:border-slate-300"
        }`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-line bg-white">
          <TanzaniaFlagIcon className="h-11 w-11" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-ink">Tanzania</span>
          <span className="mt-1 block text-sm text-muted">Kiswahili and English</span>
        </span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange("other")}
        className={`flex w-full flex-col gap-3 border bg-white p-5 text-left ${
          mode === "other" ? "border-blue bg-blue-soft" : "border-line hover:border-slate-300"
        }`}
      >
        <span className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-line bg-white text-slate-500">
            <WorldFlagIcon country={otherCountry} className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-ink">Another country / region</span>
            <span className="mt-1 block text-sm text-muted">English only — type your country</span>
          </span>
        </span>
        {mode === "other" ? (
          <label
            className="flex w-full flex-col gap-1.5 text-sm sm:pl-[3.75rem]"
            onClick={(event) => event.stopPropagation()}
          >
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
                className="field pl-10"
              />
            </div>
          </label>
        ) : null}
      </button>
    </div>
  );
}
