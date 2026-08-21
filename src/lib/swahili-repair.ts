import { levenshtein } from "@/lib/text-distance";

/**
 * High-frequency Kiswahili + East African contact-center terms.
 * Used only to correct broken spellings of known words — not a script of any call.
 */
const LEXICON = [
  "habari",
  "karibu",
  "asante",
  "ndiyo",
  "ndio",
  "hapana",
  "sawa",
  "tafadhali",
  "samahani",
  "unazungumza",
  "nani",
  "namba",
  "simu",
  "wateja",
  "mteja",
  "umeme",
  "tokeni",
  "token",
  "mita",
  "fundi",
  "mafundi",
  "ombi",
  "maombi",
  "malipo",
  "pesa",
  "siku",
  "wiki",
  "mwezi",
  "miezi",
  "mwaka",
  "tarehe",
  "kutoka",
  "kusaidia",
  "nikusaidie",
  "subiri",
  "usubiri",
  "kufunga",
  "kufungia",
  "huduma",
  "jina",
  "akaunti",
  "hivyo",
  "sasa",
  "sifuri",
  "moja",
  "mbili",
  "tatu",
  "nne",
  "tano",
  "sita",
  "saba",
  "nane",
  "tisa",
  "kumi",
  "ishirini",
  "thelathini",
  "arobaini",
  "hamsini",
  "sitini",
  "sabini",
  "themanini",
  "tisini",
  "mia",
  "laki",
  "elfu",
  "tanesco",
  "luku",
  "mpesa",
  "mwanza",
  "dodoma",
  "arusha",
  "nairobi",
  "mombasa",
];

const LEXICON_SET = new Set(LEXICON);

function maxEdits(len: number) {
  if (len < 4) return 0;
  if (len <= 6) return 1;
  if (len <= 10) return 2;
  return 3;
}

function restoreShape(original: string, replacement: string) {
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function closestLexeme(token: string) {
  const lower = token.toLowerCase();
  if (LEXICON_SET.has(lower)) return lower;

  const budget = maxEdits(lower.length);
  if (!budget) return null;

  let best: string | null = null;
  let bestDist = budget + 1;
  let ties = 0;
  for (const word of LEXICON) {
    if (word.length < Math.ceil(lower.length * 0.75)) continue;
    const dist = levenshtein(lower, word);
    if (dist < bestDist) {
      best = word;
      bestDist = dist;
      ties = 1;
    } else if (dist === bestDist) {
      ties += 1;
    }
  }
  if (!best || bestDist === 0 || bestDist > budget || ties > 1) return null;
  if (bestDist / lower.length > 0.2) return null;
  if (bestDist > 1 && best[0] !== lower[0]) return null;
  return best;
}

function repairToken(token: string) {
  if (!/^[\p{L}]+$/u.test(token)) return token;

  const fused = token.match(/^(ku|kwa|na|ya|wa)([\p{L}]{4,})$/u);
  if (fused) {
    const rest = fused[2].toLowerCase();
    if (LEXICON_SET.has(rest)) {
      const prefix = rest === "wateja" ? "kwa" : fused[1].toLowerCase();
      return `${prefix} ${restoreShape(fused[2], rest)}`;
    }
  }

  const match = closestLexeme(token);
  if (!match || match === token.toLowerCase()) return token;
  return restoreShape(token, match);
}

export function repairSwahiliTranscript(text: string) {
  if (!text) return text;
  return text
    .split(/(\s+|[.?,!:;]+)/)
    .map((part) => repairToken(part))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
