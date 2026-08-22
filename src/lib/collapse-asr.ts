import { nearDuplicate, soften } from "@/lib/text-distance";
import { repairSwahiliTranscript } from "@/lib/swahili-repair";

function normalize(text: string) {
  return soften(text);
}

function sameText(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  return Boolean(x) && x === y;
}

function collapseRepeatedPhrases(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let skipped = false;
    const maxN = Math.min(20, Math.floor((words.length - i) / 2));
    for (let n = maxN; n >= 6; n--) {
      const chunk = words.slice(i, i + n).join(" ");
      let copies = 0;
      while (
        i + n * (copies + 1) <= words.length &&
        nearDuplicate(chunk, words.slice(i + n * (copies + 1), i + n * (copies + 2)).join(" "))
      ) {
        copies += 1;
      }
      if (copies > 0) {
        out.push(...words.slice(i, i + n));
        i += n * (copies + 1);
        skipped = true;
        break;
      }
    }
    if (!skipped) {
      out.push(words[i]);
      i += 1;
    }
  }
  return out.join(" ");
}

/** Collapse ASR stutter loops. Does not invent new wording. */
export function collapseAsrLoops(text: string) {
  if (!text) return text;

  let collapsed = collapseRepeatedPhrases(text);
  for (let i = 0; i < 4; i++) {
    collapsed = collapsed.replace(/(.{10,120}?)(?:\s*\1){1,}/gi, "$1");
  }
  collapsed = collapsed.replace(/\b(\S+(?:\s+\S+){1,16})\s+\1\b/gi, "$1");

  const parts = collapsed.split(/(?<=[.?!])\s+/);
  const out: string[] = [];
  for (const part of parts) {
    const next = part.trim();
    if (!next) continue;
    const prev = out[out.length - 1];
    if (prev && (sameText(prev, next) || nearDuplicate(prev, next))) continue;
    out.push(next);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export function collapseTurnList<T extends { text: string }>(
  turns: T[],
  options?: { bilingual?: boolean; extraLexicon?: string[] },
): T[] {
  const bilingual = options?.bilingual !== false;
  const extraLexicon = options?.extraLexicon || [];
  const out: T[] = [];
  for (const turn of turns) {
    const text = collapseAsrLoops(
      bilingual ? repairSwahiliTranscript(turn.text, extraLexicon) : turn.text,
    );
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev && (sameText(prev.text, text) || nearDuplicate(prev.text, text))) continue;
    out.push({ ...turn, text });
  }
  return out;
}
