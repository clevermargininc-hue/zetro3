import { Agent, fetch as undiciFetch } from "undici";
import type { AssemblyUtterance, LanguageMode } from "@/lib/types";
import { getServerEnv } from "@/lib/env";

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

function transcriptBody(audioUrl: string, languageMode: LanguageMode) {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    speaker_labels: true,
    speakers_expected: 2,
    punctuate: true,
    format_text: false,
    speech_models: ["universal-2"],
    speech_understanding: {
      request: {
        speaker_identification: {
          speaker_type: "role",
          speakers: [{ role: "Agent" }, { role: "Customer" }],
        },
      },
    },
  };

  if (languageMode === "en") {
    body.speech_models = ["universal-3-5-pro", "universal-2"];
    body.language_code = "en";
    body.keyterms_prompt = [
      "TANESCO",
      "LUKU",
      "token",
      "M-Pesa",
    ];
  } else if (languageMode === "sw" || languageMode === "mixed") {
    body.language_code = "sw";
    body.keyterms_prompt = [
      "TANESCO",
      "LUKU",
      "tokeni",
      "umeme",
      "M-Pesa",
      "mafundi",
    ];
  } else {
    body.language_detection = true;
    body.language_detection_options = {
      code_switching: true,
      code_switching_confidence_threshold: 0,
    };
  }

  return body;
}

export async function submitTranscript(
  audioUrl: string,
  languageMode: LanguageMode,
) {
  const payload = transcriptBody(audioUrl, languageMode);
  let res = await assemblyFetch(`${BASE}/v2/transcript`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const {
      speech_understanding: _su,
      language_codes: _lc,
      keyterms_prompt: _kt,
      ...fallback
    } = payload;
    if (languageMode === "mixed" || languageMode === "auto") {
      fallback.speech_models = ["universal-2"];
      fallback.language_code = "sw";
      delete fallback.language_detection;
      delete fallback.language_detection_options;
    }
    res = await assemblyFetch(`${BASE}/v2/transcript`, {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify(fallback),
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

export async function waitForTranscript(id: string) {
  for (let i = 0; i < 180; i++) {
    const transcript = await getTranscript(id);
    if (transcript.status === "completed") return transcript;
    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcription failed");
    }
    await sleep(3000);
  }
  throw new Error("AssemblyAI transcription timed out");
}
