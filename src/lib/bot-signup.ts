/**
 * The fake accounts used a single random token as a name, like "tXlsQjBHPpKOWbiJW".
 * Real full names have a space, or they are not a long mix of capitals and small letters.
 */
export function looksLikeBotName(value: unknown) {
  const name = String(value || "").trim();
  if (!name || name.includes(" ")) return false;
  if (name.length < 12 || name.length > 40) return false;
  if (!/^[A-Za-z]+$/.test(name)) return false;
  const upper = (name.match(/[A-Z]/g) || []).length;
  const lower = (name.match(/[a-z]/g) || []).length;
  return upper >= 3 && lower >= 3;
}

export function hasFirstAndLastName(value: unknown) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.length >= 2);
}
