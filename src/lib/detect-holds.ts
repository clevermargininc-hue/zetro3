import type { GenericUtterance } from "@/lib/types";

export const HOLD_ASR_KEYTERMS = [
  "please hold",
  "hold on",
  "stay on the line",
  "one moment",
  "putting you on hold",
  "don't hang up",
  "check back",
  "tafadhali subiri",
  "ngoja kidogo",
  "subiri kidogo",
  "nikushike",
  "nitarudi",
  "usikate",
];

const HOLD_CUE =
  /\b(please\s+hold|hold\s+on|hold\s+the\s+line|stay\s+on\s+the\s+line|one\s+moment|just\s+a\s+moment|bear\s+with\s+me|i'?ll\s+be\s+right\s+back|putting\s+you\s+on\s+hold|put\s+you\s+on\s+hold|don'?t\s+hang\s+up|let\s+me\s+(check|look|confirm|verify|find)|tafadhali\s+subiri|subiri\s+kidogo|ngoja\s+kidogo|naomba\s+ungoje|naomba\s+unisubiri|nikushike|shikilia|nitarudi|usikate|usikate\s+simu|kidogo\s+tu)\b/i;

const SILENCE_HOLD_MS = 8_000;

export type HoldEvent = {
  type: "verbal" | "silence";
  utterance_index: number;
  start_s: number;
  end_s: number;
  duration_s: number;
  quote: string;
};

export type HoldListenResult = {
  detected: boolean;
  events: HoldEvent[];
  total_hold_s: number;
};

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function detectHoldEvents(utterances: GenericUtterance[]): HoldListenResult {
  const events: HoldEvent[] = [];

  for (let i = 0; i < utterances.length; i++) {
    const u = utterances[i];
    const text = String(u.text || "").replace(/\s+/g, " ").trim();
    const saidHold = Boolean(text && HOLD_CUE.test(text));
    if (saidHold) {
      const start_s = Math.floor((u.start || 0) / 1000);
      let resume = utterances[i + 1];
      for (let j = i + 1; j < utterances.length; j++) {
        const gapFromCue = (utterances[j].start || 0) - (u.end || u.start || 0);
        if (gapFromCue >= 1500) {
          resume = utterances[j];
          break;
        }
        resume = utterances[j];
      }
      const endMs = resume?.start ?? u.end ?? u.start;
      const end_s = Math.max(start_s, Math.floor((endMs || 0) / 1000));
      events.push({
        type: "verbal",
        utterance_index: i,
        start_s,
        end_s,
        duration_s: Math.max(0, end_s - start_s),
        quote: text.slice(0, 180),
      });
    }

    const next = utterances[i + 1];
    if (!next) continue;
    const gap = (next.start || 0) - (u.end || u.start || 0);
    if (gap >= SILENCE_HOLD_MS && saidHold) {
      const start_s = Math.floor((u.end || u.start || 0) / 1000);
      const end_s = Math.floor((next.start || 0) / 1000);
      events.push({
        type: "silence",
        utterance_index: i,
        start_s,
        end_s,
        duration_s: Math.max(1, end_s - start_s),
        quote: text ? `Silence after: “${text.slice(0, 120)}”` : "Silence in the audio",
      });
    }
  }

  const merged: HoldEvent[] = [];
  for (const event of events.sort((a, b) => a.start_s - b.start_s)) {
    const last = merged[merged.length - 1];
    if (last && event.start_s <= last.end_s + 2) {
      last.end_s = Math.max(last.end_s, event.end_s);
      last.duration_s = Math.max(1, last.end_s - last.start_s);
      if (event.type === "verbal" && last.type !== "verbal") {
        last.type = "verbal";
        last.quote = event.quote;
        last.utterance_index = event.utterance_index;
      }
      continue;
    }
    merged.push({ ...event });
  }

  const total_hold_s = merged.reduce((sum, row) => sum + row.duration_s, 0);
  return {
    detected: merged.length > 0,
    events: merged,
    total_hold_s,
  };
}

export function formatHoldListenBlock(
  listen: HoldListenResult,
  hasCompanyProcedure: boolean,
) {
  if (!listen.detected) {
    return `CALL LISTENING — HOLD / WAIT
No hold or wait was heard in this recording (no hold language and no silence gap ≥ 8 seconds).
${
  hasCompanyProcedure
    ? "A company HOLDING PROCEDURE file exists, but it does not apply to this call. Do not penalize holding procedure."
    : "No company holding procedure is uploaded. Do not invent hold rules."
}`;
  }

  const lines = listen.events.map((event, i) => {
    const kind = event.type === "verbal" ? "agent said a hold/wait phrase" : "silence in the audio (likely on hold)";
    return `${i + 1}. ${clock(event.start_s)}–${clock(event.end_s)} (${event.duration_s}s) — ${kind}. [utterance ${event.utterance_index}] ${event.quote}`;
  });

  return `CALL LISTENING — HOLD / WAIT (from audio timestamps + transcript)
The model must treat this as having heard the call. Hold/wait WAS detected.
Total hold/wait time ≈ ${listen.total_hold_s}s.
Events:
${lines.join("\n")}
${
  hasCompanyProcedure
    ? `A company HOLDING PROCEDURE file is provided. For EACH rule in that file, check whether the agent followed it on these hold events (permission to hold, hold language/key terms, check-back interval, what to say when returning). Quote the call at the timestamp. If a rule was missed, list it in hold_findings and cut ONLY the company Hold / Holding procedure parameter. Do not deduct Professionalism, Opening, Empathy, or any other parameter for a hold miss.`
    : `No company holding procedure file is uploaded. Do not invent a hold policy.`
}`;
}
