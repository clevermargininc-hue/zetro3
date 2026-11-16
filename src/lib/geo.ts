/** Countries where Zetro is accessible. Defaults to "*" (all countries worldwide). Override with ALLOWED_COUNTRIES="TZ,KE" to restrict. */
export const DEFAULT_ALLOWED_COUNTRIES = ["*"];

export const NOT_AVAILABLE_PATH = "/not-available";

/** Dev-only query param (?geo=KE) that simulates a visitor country; ?geo=clear resets it. */
export const DEV_GEO_PARAM = "geo";
export const DEV_GEO_COOKIE = "zetro-dev-geo";

const ISO_CODE = /^[A-Z]{2}$/;

export function normalizeCountryCode(value: string | null | undefined) {
  const code = (value || "").trim().toUpperCase();
  if (code === "*") return "*";
  // XX = unknown, T1 = Tor (Cloudflare).
  if (!ISO_CODE.test(code) || code === "XX" || code === "T1") return null;
  return code;
}

export function allowedCountries() {
  const raw = process.env.ALLOWED_COUNTRIES?.trim();
  if (!raw || raw === "*") {
    return new Set(["*"]);
  }
  const list = raw
    .split(",")
    .map((part) => normalizeCountryCode(part))
    .filter((code): code is string => Boolean(code));
  return new Set(list.length ? list : DEFAULT_ALLOWED_COUNTRIES);
}

export function isAllowedCountry(code: string | null | undefined) {
  const allowed = allowedCountries();
  if (allowed.has("*")) return true;
  const normalized = normalizeCountryCode(code);
  return normalized ? allowed.has(normalized) : false;
}

/** Visitor country from the hosting edge. Null when unknown (local dev, no CDN header). */
export function countryFromHeaders(headers: Headers) {
  return normalizeCountryCode(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"));
}
