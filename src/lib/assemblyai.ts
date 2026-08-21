import type { AssemblyUtterance, LanguageMode } from "@/lib/types";
import { getServerEnv } from "@/lib/env";

const BASE = "https://api.assemblyai.com";

function headers() {
  return {
    authorization: getServerEnv().assemblyAiKey,
  };
}

export async function uploadToAssemblyAI(bytes: ArrayBuffer) {
  const res = await fetch(`${BASE}/v2/upload`, {
    method: "POST",
    headers: headers(),
    body: bytes,
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
    format_text: true,
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
    // keyterms_prompt is English-only on universal-2; Kiswahili terms are repaired after ASR.
    body.language_code = "sw";
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
  let res = await fetch(`${BASE}/v2/transcript`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Retry without speech_understanding / language_codes if the combo is rejected.
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
    res = await fetch(`${BASE}/v2/transcript`, {
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
  const res = await fetch(`${BASE}/v2/transcript/${id}`, { headers: headers() });
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
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("AssemblyAI transcription timed out");
}
