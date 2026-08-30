import type { LanguageMode } from "@/lib/types";

const MODES: LanguageMode[] = ["auto", "en", "sw", "mixed"];

export function isTanzania(country: string | null | undefined) {
  const value = (country || "").trim().toLowerCase();
  return value === "tanzania" || value === "tz" || value === "united republic of tanzania";
}

/** Existing workspaces with no country are treated as Tanzania, the home market. */
export function displayCountry(country: string | null | undefined) {
  const value = (country || "").trim();
  return value || "Tanzania";
}

export function workspaceLanguages(country: string | null | undefined) {
  if (isTanzania(displayCountry(country))) {
    return {
      bilingual: true as const,
      label: "Kiswahili and English",
      defaultMode: "mixed" as LanguageMode,
    };
  }
  return {
    bilingual: false as const,
    label: "English only",
    defaultMode: "en" as LanguageMode,
  };
}

export function resolvedLanguageMode(
  country: string | null | undefined,
  requested?: LanguageMode | null,
): LanguageMode {
  const langs = workspaceLanguages(country);
  if (!langs.bilingual) return "en";
  if (!requested || requested === "auto") return langs.defaultMode;
  if (MODES.includes(requested)) return requested;
  return langs.defaultMode;
}

export function normalizeCountry(tanzania: boolean, other?: string) {
  if (tanzania) return "Tanzania";
  const name = (other || "").trim();
  if (name.length < 2) throw new Error("Enter your country.");
  if (isTanzania(name)) return "Tanzania";
  return name.replace(/\s+/g, " ");
}

export function parseCountryName(raw: string | null | undefined) {
  const name = (raw || "").trim();
  if (name.length < 2) throw new Error("Choose where you operate.");
  return isTanzania(name) ? "Tanzania" : name.replace(/\s+/g, " ");
}
