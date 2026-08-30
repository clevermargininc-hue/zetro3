/**
 * Scorecard text may include short clean Kiswahili/English evidence.
 * Broken ASR tokens must never appear on the scorecard.
 */

const VOWELS = /[aeiouAEIOU]/;

function lettersOnly(token: string) {
  return token.replace(/[^\p{L}]/gu, "");
}

export function tokenLooksBroken(token: string) {
  const trimmed = token.replace(/^[“”"'«»(\[]+|[“”"'«»),.!?;:\]]+$/g, "");
  const letters = lettersOnly(trimmed);
  if (!letters) return false;
  if (letters.length <= 2) return false;
  if (/^[A-Z]{2,8}$/.test(trimmed)) return false;
  if (/(.)\1{3,}/.test(letters)) return true;
  if (letters.length >= 4 && !VOWELS.test(letters)) return true;
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(letters)) return true;
  if (letters.length >= 6) {
    const vowelCount = (letters.match(/[aeiouAEIOU]/g) || []).length;
    if (vowelCount / letters.length < 0.18) return true;
  }
  if (letters.length > 24 && !trimmed.includes("-")) return true;
  return false;
}

export function isCleanScorePhrase(text: string) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((token) => !tokenLooksBroken(token));
}

export function stripBrokenWords(text: string) {
  if (!text) return "";
  const cleaned = text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return tokenLooksBroken(part) ? "" : part;
    })
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
  return cleaned;
}

export function cleanScoreQuote(modelQuote: string, utteranceText = "") {
  const fromModel = stripBrokenWords(modelQuote);
  if (isCleanScorePhrase(fromModel) && fromModel.length >= 6) {
    return fromModel.slice(0, 180);
  }
  const fromTurn = stripBrokenWords(utteranceText);
  if (isCleanScorePhrase(fromTurn) && fromTurn.length >= 6) {
    return fromTurn.split(/\s+/).slice(0, 18).join(" ").slice(0, 180);
  }
  return "";
}

export function cleanScoreLine(text: string) {
  return stripBrokenWords(String(text || ""));
}

export function cleanScoreLines(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => cleanScoreLine(String(item || "")))
    .filter((line) => line.length >= 4);
}
