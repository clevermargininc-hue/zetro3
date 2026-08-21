export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const next = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    next[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = next[j];
  }
  return prev[b.length];
}

export function soften(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function nearDuplicate(a: string, b: string) {
  const x = soften(a);
  const y = soften(b);
  if (!x || !y) return false;
  if (x === y) return true;

  const minLen = Math.min(x.length, y.length);
  if (minLen < 24) return false;

  const dist = levenshtein(x, y);
  const limit = Math.max(x.length, y.length);
  if (dist / limit <= 0.18) return true;

  const xs = x.split(" ");
  const ys = y.split(" ");
  if (Math.min(xs.length, ys.length) < 5) return false;
  const set = new Set(xs);
  const overlap = ys.filter((w) => set.has(w)).length;
  return overlap / Math.max(xs.length, ys.length) >= 0.8;
}
