function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similar(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (Math.min(x.length, y.length) < 12) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const xs = new Set(x.split(" "));
  const ys = y.split(" ");
  const overlap = ys.filter((w) => xs.has(w)).length;
  return overlap / Math.max(ys.length, 1) > 0.86;
}

export function collapseAsrLoops(text: string) {
  if (!text) return text;

  let collapsed = text;
  for (let i = 0; i < 4; i++) {
    collapsed = collapsed.replace(/(.{10,120}?)(?:\s*\1){1,}/gi, "$1");
  }
  collapsed = collapsed.replace(/\b(\S+(?:\s+\S+){1,16})\s+\1\b/gi, "$1");

  const parts = collapsed.split(/(?<=[.?!])\s+/);
  const out: string[] = [];
  for (const part of parts) {
    const next = part.trim();
    if (!next) continue;
    if (out.some((prev) => similar(prev, next))) continue;
    out.push(next);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export function collapseTurnList<T extends { text: string; role?: string }>(turns: T[]): T[] {
  const out: T[] = [];
  for (const turn of turns) {
    const text = collapseAsrLoops(turn.text);
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev && similar(prev.text, text)) continue;
    if (
      prev &&
      prev.role &&
      turn.role &&
      prev.role === turn.role &&
      similar(prev.text, text)
    ) {
      continue;
    }
    out.push({ ...turn, text });
  }
  return out;
}
