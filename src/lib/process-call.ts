import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToAssemblyAI, submitTranscript, waitForTranscript } from "@/lib/assemblyai";
import { analyzeCall, repairBrokenSwahiliUtterances } from "@/lib/openai";
import { collapseTurnList } from "@/lib/collapse-asr";
import {
  extractKeytermsFromDocuments,
  formatCallScripts,
  lexiconFromDocuments,
} from "@/lib/call-scripts";
import {
  loadQaDocuments,
  requireReadableStandards,
} from "@/lib/qa-documents";
import { retrieveQaContext } from "@/lib/qa-retrieve";
import type { AuditMode, LanguageMode, SpeakerRole } from "@/lib/types";
import { describeAiError } from "@/lib/ai-client";
import { getAutoAudit } from "@/lib/workspace-settings";
import { getMembership } from "@/lib/workspaces";
import { HOLD_ASR_KEYTERMS } from "@/lib/detect-holds";
import { resolvedLanguageMode, workspaceLanguages } from "@/lib/locale";

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

export async function transcribeCall(
  callId: string,
  options?: { autoScore?: AuditMode | false },
) {
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

    const membership = await getMembership(call.user_id).catch(() => null);
    const langs = workspaceLanguages(membership?.country);
    const languageMode = resolvedLanguageMode(
      membership?.country,
      (call.language_mode || "auto") as LanguageMode,
    );
    if (languageMode !== call.language_mode) {
      await supabase.from("calls").update({ language_mode: languageMode }).eq("id", callId);
    }

    const bytes = await file.arrayBuffer();

    const orgDocs = await loadQaDocuments(call.user_id).catch(() => []);
    const keyterms = [...HOLD_ASR_KEYTERMS, ...extractKeytermsFromDocuments(orgDocs)];
    const extraLexicon = lexiconFromDocuments(orgDocs);

    const audioUrl = await uploadToAssemblyAI(bytes);
    const queued = await submitTranscript(audioUrl, languageMode, keyterms);
    const transcript = await waitForTranscript(queued.id);
    
    const utterances = transcript.utterances || [];
    if (!utterances.length) {
      throw new Error("No speakers were detected in this recording");
    }

    let collapsed = collapseTurnList(utterances, {
      bilingual: langs.bilingual,
      extraLexicon,
    });
    if (langs.bilingual) {
      collapsed = await repairBrokenSwahiliUtterances(
        collapsed,
        extractKeytermsFromDocuments(orgDocs, 40),
      );
    }

    const rows = collapsed.map((u, index) => ({
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
        detected_languages: null,
        error_message: null,
        completed_at: null,
      })
      .eq("id", callId);

    let autoScore: AuditMode | null = null;
    if (options?.autoScore === false) {
      autoScore = null;
    } else if (options?.autoScore) {
      autoScore = options.autoScore;
    } else if (await getAutoAudit(call.user_id)) {
      autoScore = "automatic";
    }
    if (autoScore) {
      try {
        await scoreCall(callId, autoScore);
      } catch (err) {
        console.error("Automatic scoring failed", err);
      }
    }
  } catch (err) {
    const message = err instanceof Error
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
    const db = createAdminClient();
    supabase = db;
    const { data: call, error } = await db
      .from("calls")
      .select("*, agents(name)")
      .eq("id", callId)
      .single();

    if (error || !call) {
      throw new Error(error?.message || "Call not found");
    }

    const { data: stored, error: uttError } = await db
      .from("utterances")
      .select("*")
      .eq("call_id", callId)
      .order("sequence");

    if (uttError) throw new Error(uttError.message);
    if (!stored?.length) {
      throw new Error("Prepare this call for audit first.");
    }

    let standardsText = "";
    let standards: Awaited<ReturnType<typeof loadQaDocuments>> = [];
    const orgDocs = await loadQaDocuments(call.user_id).catch(() => []);
    const scriptsText = formatCallScripts(orgDocs);

    if (mode === "documents") {
      standards = requireReadableStandards(orgDocs);
    }

    await db
      .from("calls")
      .update({ status: "analyzing", error_message: null })
      .eq("id", callId);

    const agentName =
      call.agents && !Array.isArray(call.agents)
        ? (call.agents as { name?: string }).name
        : undefined;

    const membership = await getMembership(call.user_id).catch(() => null);
    const bilingual = workspaceLanguages(membership?.country).bilingual;

    let asAssembly = stored.map((u) => ({
      speaker: u.speaker_label,
      text: u.text,
      start: u.start_ms ?? 0,
      end: u.end_ms ?? 0,
      confidence: Number(u.confidence ?? 0),
    }));
    if (bilingual) {
      asAssembly = await repairBrokenSwahiliUtterances(
        asAssembly,
        extractKeytermsFromDocuments(orgDocs, 40),
      );
    }
    if (mode === "documents") {
      standardsText = await retrieveQaContext(call.user_id, standards);
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
      bilingual,
      scriptsText,
      orgDocs,
    );

    const roleUpdates = stored
      .map((row) => ({
        id: row.id,
        role: roleForSpeaker(row.speaker_label, analysis.speaker_map),
        current: row.role,
      }))
      .filter((row) => row.role !== row.current);
    if (roleUpdates.length) {
      await Promise.all(
        roleUpdates.map((row) =>
          db.from("utterances").update({ role: row.role }).eq("id", row.id),
        ),
      );
    }

    await db.from("call_scores").delete().eq("call_id", callId);
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
      metric_evidence: analysis.metric_evidence,
      audit_mode: mode,
    };
    let { error: scoreError } = await db.from("call_scores").insert(scoreRow);
    if (scoreError && /metric_evidence/.test(scoreError.message)) {
      const withoutEvidence = { ...scoreRow };
      delete (withoutEvidence as { metric_evidence?: unknown }).metric_evidence;
      ({ error: scoreError } = await db.from("call_scores").insert(withoutEvidence));
    }
    if (scoreError && /compliance_findings|standards_used|audit_mode/.test(scoreError.message)) {
      const legacy = {
        call_id: scoreRow.call_id,
        overall_score: scoreRow.overall_score,
        greeting: scoreRow.greeting,
        empathy: scoreRow.empathy,
        professionalism: scoreRow.professionalism,
        resolution: scoreRow.resolution,
        communication: scoreRow.communication,
        language_handling: scoreRow.language_handling,
        verdict: scoreRow.verdict,
        customer_sentiment: scoreRow.customer_sentiment,
        summary: scoreRow.summary,
        strengths: scoreRow.strengths,
        improvements: scoreRow.improvements,
      };
      ({ error: scoreError } = await db.from("call_scores").insert(legacy));
    }
    if (scoreError) throw new Error(scoreError.message);

    await db
      .from("calls")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", callId);
  } catch (err) {
    const message = describeAiError(err);
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
