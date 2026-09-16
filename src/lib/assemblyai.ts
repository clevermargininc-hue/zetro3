import { Agent, fetch as undiciFetch } from "undici";
import dns from "node:dns";
import type { AssemblyUtterance, LanguageMode } from "@/lib/types";
import { getServerEnv } from "@/lib/env";

dns.setDefaultResultOrder("ipv4first");

const BASE = "https://api.assemblyai.com";

const dispatcher = new Agent({
  connectTimeout: 60_000,
  headersTimeout: 5 * 60_000,
  bodyTimeout: 10 * 60_000,
});

function headers() {
  return {
    authorization: getServerEnv().assemblyAiKey,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorText(error: unknown) {
  const err = error as Error & { cause?: { code?: string; message?: string } };
  return [err?.message, err?.cause?.code, err?.cause?.message].filter(Boolean).join(" ");
}

export function isAssemblyNetworkError(error: unknown) {
  return /fetch failed|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|UND_ERR_SOCKET|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|Connect Timeout/i.test(
    errorText(error),
  );
}

export function assemblyNetworkMessage(error: unknown) {
  if (isAssemblyNetworkError(error)) {
    return "Could not reach AssemblyAI. Check your internet connection and try transcribing again.";
  }
  return error instanceof Error ? error.message : "AssemblyAI request failed";
}

async function assemblyFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string | Uint8Array },
  attempts = 4,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await undiciFetch(url, { ...init, dispatcher });
    } catch (error) {
      lastError = error;
      if (!isAssemblyNetworkError(error) || attempt === attempts - 1) {
        throw new Error(assemblyNetworkMessage(error));
      }
      await sleep(1500 * 2 ** attempt);
    }
  }
  throw new Error(assemblyNetworkMessage(lastError));
}

export async function uploadToAssemblyAI(bytes: ArrayBuffer) {
  const res = await assemblyFetch(`${BASE}/v2/upload`, {
    method: "POST",
    headers: headers(),
    body: new Uint8Array(bytes),
  });
  if (!res.ok) {
    throw new Error(`AssemblyAI upload failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { upload_url: string };
  return json.upload_url;
}

function mergeKeyterms(keyterms: string[]) {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const term of keyterms) {
    const cleaned = term.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(cleaned);
    if (merged.length >= 50) break;
  }
  return merged;
}

function withKeyterms(body: Record<string, unknown>, keyterms: string[]) {
  if (keyterms.length) body.keyterms_prompt = keyterms;
  return body;
}

/** Kiswahili + English in the same call. Pin both languages so ASR does not guess English-only. */
function bilingualAsrBody(audioUrl: string, keyterms: string[]) {
  return withKeyterms(
    {
      audio_url: audioUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
      speech_models: ["universal-2"],
      language_detection: true,
      language_codes: ["en", "sw"],
      language_detection_options: {
        code_switching: true,
        code_switching_confidence_threshold: 0,
      },
      speech_understanding: {
        request: {
          speaker_identification: {
            speaker_type: "role",
            speakers: [{ role: "Agent" }, { role: "Customer" }],
          },
        },
      },
    },
    keyterms,
  );
}

function transcriptBody(
  audioUrl: string,
  languageMode: LanguageMode,
  keyterms: string[] = [],
) {
  const merged = mergeKeyterms(keyterms);

  if (languageMode === "en") {
    return withKeyterms(
      {
        audio_url: audioUrl,
        speaker_labels: true,
        punctuate: true,
        format_text: true,
        speech_models: ["universal-3-5-pro", "universal-2"],
        language_code: "en",
        speech_understanding: {
          request: {
            speaker_identification: {
              speaker_type: "role",
              speakers: [{ role: "Agent" }, { role: "Customer" }],
            },
          },
        },
      },
      merged,
    );
  }

  if (languageMode === "sw") {
    return withKeyterms(
      {
        audio_url: audioUrl,
        speaker_labels: true,
        punctuate: true,
        format_text: true,
        speech_models: ["universal-2"],
        language_code: "sw",
        speech_understanding: {
          request: {
            speaker_identification: {
              speaker_type: "role",
              speakers: [{ role: "Agent" }, { role: "Customer" }],
            },
          },
        },
      },
      merged,
    );
  }

  return bilingualAsrBody(audioUrl, merged);
}

function stripOptionalAsrFields(payload: Record<string, unknown>) {
  const {
    speech_understanding: _su,
    language_codes: _lc,
    keyterms_prompt: _kt,
    ...rest
  } = payload;
  return rest;
}

export async function submitTranscript(
  audioUrl: string,
  languageMode: LanguageMode,
  keyterms: string[] = [],
) {
  const payload = transcriptBody(audioUrl, languageMode, keyterms);
  let res = await assemblyFetch(`${BASE}/v2/transcript`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok && (languageMode === "mixed" || languageMode === "auto")) {
    const withoutCodes = stripOptionalAsrFields(payload);
    withoutCodes.speech_models = ["universal-2"];
    withoutCodes.language_detection = true;
    withoutCodes.language_detection_options = {
      code_switching: true,
      code_switching_confidence_threshold: 0,
    };
    delete withoutCodes.language_code;
    res = await assemblyFetch(`${BASE}/v2/transcript`, {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify(withoutCodes),
    });
  }

  if (!res.ok && (languageMode === "mixed" || languageMode === "auto" || languageMode === "sw")) {
    const swOnly = stripOptionalAsrFields(payload);
    swOnly.speech_models = ["universal-2"];
    swOnly.language_code = "sw";
    delete swOnly.language_detection;
    delete swOnly.language_detection_options;
    delete swOnly.language_codes;
    res = await assemblyFetch(`${BASE}/v2/transcript`, {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify(swOnly),
    });
  }

  if (!res.ok) {
    throw new Error(
      `AssemblyAI submit failed (${res.status}): ${await res.text()}`,
    );
  }

  return (await res.json()) as { id: string; status: string };
}

export type AssemblyTranscript = {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  error?: string;
  text?: string;
  audio_duration?: number;
  language_code?: string;
  language_confidence?: number;
  code_switching_languages?: { language: string; confidence: number }[];
  utterances?: AssemblyUtterance[];
};

export async function getTranscript(id: string) {
  const res = await assemblyFetch(`${BASE}/v2/transcript/${id}`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`AssemblyAI poll failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as AssemblyTranscript;
}

export async function waitForTranscript(id: string, maxPolls = 70) {
  for (let i = 0; i < maxPolls; i++) {
    const transcript = await getTranscript(id);
    if (transcript.status === "completed") return transcript;
    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcription failed");
    }
    await sleep(3000);
  }
  throw new Error("AssemblyAI transcription timed out");
}
