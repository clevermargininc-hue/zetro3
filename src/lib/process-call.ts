import { createAdminClient } from "@/lib/supabase/admin";
import {
  assemblyNetworkMessage,
  isAssemblyNetworkError,
  submitTranscript,
  uploadToAssemblyAI,
  waitForTranscript,
} from "@/lib/assemblyai";
import { analyzeCall } from "@/lib/openai";
import { collapseTurnList } from "@/lib/collapse-asr";
import {
  loadQaDocuments,
  requireReadableStandards,
} from "@/lib/qa-documents";
import { retrieveQaContext } from "@/lib/qa-retrieve";
import type { AssemblyUtterance, AuditMode, LanguageMode, SpeakerRole } from "@/lib/types";

function inferRoleFromLabel(label: string): SpeakerRole | null {
  const n = label.trim().toLowerCase();
  if (n.includes("agent") || n.includes("support") || n.includes("representative")) {
    return "agent";
  }
  if (n.includes("customer") || n.includes("caller") || n.includes("client")) {
    return "customer";
  }
  return null;
}

const transcribing = new Set<string>();
const scoring = new Set<string>();

function roleForSpeaker(
  label: string,
  speakerMap: Record<string, SpeakerRole> = {},
): SpeakerRole {
  return (
    speakerMap[label] ||
    speakerMap[label.toUpperCase()] ||
    speakerMap[label.toLowerCase()] ||
    inferRoleFromLabel(label) ||
    "unknown"
  );
}

export async function transcribeCall(callId: string) {
  if (transcribing.has(callId)) return;
  transcribing.add(callId);
  let supabase: ReturnType<typeof createAdminClient> | null = null;

  try {
    supabase = createAdminClient();
    const { data: call, error } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();

    if (error || !call) {
      throw new Error(error?.message || "Call not found");
    }

    await supabase
      .from("calls")
      .update({ status: "transcribing", error_message: null })
      .eq("id", callId);

    const { data: file, error: downloadError } = await supabase.storage
      .from("call-audio")
      .download(call.audio_path);

    if (downloadError || !file) {
      const detail = downloadError?.message || "";
      throw new Error(
        /fetch failed|timeout|network/i.test(detail)
          ? "Could not download the recording. Check your internet connection and try again."
          : detail || "Could not download the recording",
      );
    }

    const bytes = await file.arrayBuffer();
    const audioUrl = await uploadToAssemblyAI(bytes);
    const submitted = await submitTranscript(
      audioUrl,
      (call.language_mode || "auto") as LanguageMode,
    );

    await supabase
      .from("calls")
      .update({ assembly_id: submitted.id })
      .eq("id", callId);

    const transcript = await waitForTranscript(submitted.id);
    const utterances = transcript.utterances || [];
    if (!utterances.length) {
      throw new Error("No speakers were detected in this recording");
    }

    const rows = collapseTurnList(utterances).map((u, index) => ({
      call_id: callId,
      sequence: index,
      speaker_label: u.speaker,
      role: roleForSpeaker(u.speaker),
      text: u.text,
      start_ms: u.start,
      end_ms: u.end,
      confidence: u.confidence,
    }));

    await supabase.from("utterances").delete().eq("call_id", callId);
    await supabase.from("call_scores").delete().eq("call_id", callId);

    const { error: uttError } = await supabase.from("utterances").insert(rows);
    if (uttError) throw new Error(uttError.message);

    await supabase
      .from("calls")
      .update({
        status: "transcribed",
        duration_seconds: transcript.audio_duration ?? null,
        detected_language: transcript.language_code ?? null,
        detected_languages: transcript.code_switching_languages ?? null,
        error_message: null,
        completed_at: null,
      })
      .eq("id", callId);
  } catch (err) {
    const message = isAssemblyNetworkError(err)
      ? assemblyNetworkMessage(err)
      : err instanceof Error
        ? err.message
        : "Unknown transcription error";
    if (supabase) {
      await supabase
        .from("calls")
        .update({ status: "failed", error_message: message })
        .eq("id", callId);
    }
    throw err;
  } finally {
    transcribing.delete(callId);
  }
}

export async function scoreCall(callId: string, mode: AuditMode = "documents") {
  if (scoring.has(callId)) return;
  scoring.add(callId);
  let supabase: ReturnType<typeof createAdminClient> | null = null;

  try {
    supabase = createAdminClient();
    const { data: call, error } = await supabase
      .from("calls")
      .select("*, agents(name)")
      .eq("id", callId)
      .single();

    if (error || !call) {
      throw new Error(error?.message || "Call not found");
    }

    const { data: stored, error: uttError } = await supabase
      .from("utterances")
      .select("*")
      .eq("call_id", callId)
      .order("sequence");

    if (uttError) throw new Error(uttError.message);
    if (!stored?.length) {
      throw new Error("Transcribe and separate speakers first.");
    }

    let standardsText = "";
    let standards: Awaited<ReturnType<typeof loadQaDocuments>> = [];
    if (mode === "documents") {
      standards = requireReadableStandards(await loadQaDocuments(call.user_id));
    }

    await supabase
      .from("calls")
      .update({ status: "analyzing", error_message: null })
      .eq("id", callId);

    const agentName =
      call.agents && !Array.isArray(call.agents)
        ? (call.agents as { name?: string }).name
        : undefined;

    const asAssembly: AssemblyUtterance[] = stored.map((u) => ({
      speaker: u.speaker_label,
      text: u.text,
      start: u.start_ms ?? 0,
      end: u.end_ms ?? 0,
      confidence: Number(u.confidence ?? 0),
    }));

    const transcriptText = asAssembly
      .map((u) => `${u.speaker}: ${u.text}`)
      .join("\n");
    if (mode === "documents") {
      standardsText = await retrieveQaContext(call.user_id, transcriptText, standards);
      if (standardsText.trim().length < 40) {
        throw new Error(
          "Documents scoring cannot start until the uploaded Standards files have been read. Open Standards and upload them again.",
        );
      }
    }

    const analysis = await analyzeCall(
      asAssembly,
      agentName,
      standardsText,
      standards,
      mode,
    );

    for (const row of stored) {
      const role = roleForSpeaker(row.speaker_label, analysis.speaker_map);
      await supabase.from("utterances").update({ role }).eq("id", row.id);
    }

    await supabase.from("call_scores").delete().eq("call_id", callId);
    const scoreRow = {
      call_id: callId,
      overall_score: analysis.overall_score,
      greeting: analysis.greeting,
      empathy: analysis.empathy,
      professionalism: analysis.professionalism,
      resolution: analysis.resolution,
      communication: analysis.communication,
      language_handling: analysis.language_handling,
      verdict: analysis.verdict,
      customer_sentiment: analysis.customer_sentiment,
      summary: analysis.summary,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      compliance_findings: analysis.compliance_findings,
      standards_used: analysis.standards_used,
      audit_mode: mode,
    };
    let { error: scoreError } = await supabase.from("call_scores").insert(scoreRow);
    if (scoreError && /compliance_findings|standards_used|audit_mode/.test(scoreError.message)) {
      const { compliance_findings: _c, standards_used: _s, audit_mode: _m, ...legacy } = scoreRow;
      ({ error: scoreError } = await supabase.from("call_scores").insert(legacy));
    }
    if (scoreError) throw new Error(scoreError.message);

    await supabase
      .from("calls")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", callId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scoring error";
    if (supabase) {
      await supabase
        .from("calls")
        .update({ status: "transcribed", error_message: message })
        .eq("id", callId);
    }
    throw err;
  } finally {
    scoring.delete(callId);
  }
}
