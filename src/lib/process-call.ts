import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToAssemblyAI, submitTranscript, waitForTranscript } from "@/lib/assemblyai";
import { analyzeCall, restoreSwahiliMeaning } from "@/lib/openai";
import { collapseTurnList } from "@/lib/collapse-asr";
import { repairSwahiliTranscript } from "@/lib/swahili-repair";
import {
  extractKeytermsFromDocuments,
  formatCallScripts,
} from "@/lib/call-scripts";
import {
  loadQaDocuments,
  requireReadableStandards,
} from "@/lib/qa-documents";
import { retrieveQaContext } from "@/lib/qa-retrieve";
import type { AuditMode, LanguageMode, SpeakerRole } from "@/lib/types";
import { describeAiError } from "@/lib/ai-client";
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

type AdminClient = ReturnType<typeof createAdminClient>;
type JobOptions = { force?: boolean };

const PREPARED_STATUSES = new Set(["transcribed", "analyzing", "completed"]);

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

async function utteranceCount(supabase: AdminClient, callId: string) {
  const { count, error } = await supabase
    .from("utterances")
    .select("id", { count: "exact", head: true })
    .eq("call_id", callId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function settlePreparedCall(supabase: AdminClient, callId: string, status: string) {
  if (status === "analyzing" || status === "completed" || status === "transcribed") {
    return status;
  }
  const { data: score } = await supabase
    .from("call_scores")
    .select("id")
    .eq("call_id", callId)
    .maybeSingle();
  const next = score ? "completed" : "transcribed";
  await supabase
    .from("calls")
    .update({
      status: next,
      error_message: null,
      ...(score ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", callId);
  return next;
}

export async function transcribeCall(callId: string, options: JobOptions = {}) {
  const force = Boolean(options.force);
  if (transcribing.has(callId)) return;
  transcribing.add(callId);
  let supabase: AdminClient | null = null;

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

    const existingTurns = await utteranceCount(supabase, callId);
    if (!force && existingTurns > 0) {
      await settlePreparedCall(supabase, callId, call.status);
      return;
    }

    if (!force && PREPARED_STATUSES.has(call.status)) {
      return;
    }

    await supabase
      .from("calls")
      .update({ status: "transcribing", error_message: null })
      .eq("id", callId);

    const membership = await getMembership(call.user_id).catch(() => null);
    const languageMode = resolvedLanguageMode(
      membership?.country,
      (call.language_mode || "auto") as LanguageMode,
    );
    if (languageMode !== call.language_mode) {
      await supabase.from("calls").update({ language_mode: languageMode }).eq("id", callId);
    }

    let transcript: Awaited<ReturnType<typeof waitForTranscript>> | null = null;
    if (!force && call.assembly_id) {
      try {
        transcript = await waitForTranscript(call.assembly_id);
      } catch {
        transcript = null;
      }
    }

    const orgDocs = await loadQaDocuments(call.user_id).catch(() => []);
    const keyTerms = extractKeytermsFromDocuments(orgDocs, 60);

    if (!transcript) {
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

      const asrTerms = [...HOLD_ASR_KEYTERMS, ...extractKeytermsFromDocuments(orgDocs)];
      const audioUrl = await uploadToAssemblyAI(await file.arrayBuffer());
      const queued = await submitTranscript(audioUrl, languageMode, asrTerms);
      await supabase.from("calls").update({ assembly_id: queued.id }).eq("id", callId);
      transcript = await waitForTranscript(queued.id);
    }

    if ((await utteranceCount(supabase, callId)) > 0 && !force) {
      await settlePreparedCall(supabase, callId, "transcribing");
      return;
    }

    const utterances = transcript.utterances || [];
    if (!utterances.length) {
      throw new Error("No speakers were detected in this recording");
    }

    const collapsed = collapseTurnList(utterances).map((turn) => ({
      ...turn,
      text: repairSwahiliTranscript(turn.text, keyTerms),
    }));

    if ((await utteranceCount(supabase, callId)) > 0 && !force) {
      await settlePreparedCall(supabase, callId, "transcribing");
      return;
    }

    await supabase.from("utterances").delete().eq("call_id", callId);
    if (force) {
      await supabase.from("call_scores").delete().eq("call_id", callId);
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
        ...(force ? { completed_at: null } : {}),
      })
      .eq("id", callId);
  } catch (err) {
    const message = err instanceof Error
        ? err.message
        : "Unknown transcription error";
    if (supabase) {
      const saved = await utteranceCount(supabase, callId).catch(() => 0);
      if (saved > 0) {
        await settlePreparedCall(supabase, callId, "transcribing");
        return;
      }
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

export async function scoreCall(
  callId: string,
  mode: AuditMode = "documents",
  options: JobOptions = {},
) {
  const force = Boolean(options.force);
  if (scoring.has(callId)) return;
  scoring.add(callId);
  let supabase: AdminClient | null = null;

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

    if (!force) {
      const { data: existingScore } = await db
        .from("call_scores")
        .select("id")
        .eq("call_id", callId)
        .maybeSingle();
      if (existingScore) {
        if (call.status !== "completed") {
          await db
            .from("calls")
            .update({
              status: "completed",
              completed_at: call.completed_at || new Date().toISOString(),
              error_message: null,
            })
            .eq("id", callId);
        }
        return;
      }
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
    const keyTerms = extractKeytermsFromDocuments(orgDocs, 60);

    let scoredRows = stored.map((row) => ({
      ...row,
      text: repairSwahiliTranscript(row.text, keyTerms),
    }));
    // Always meaning-repair before scoring so AI understands the call clearly
    // (Kiswahili + English ASR), then audit with human-like judgment.
    const restored = await restoreSwahiliMeaning(
      scoredRows.map((row) => ({
        speaker: row.speaker_label,
        text: row.text,
        start: row.start_ms ?? 0,
        end: row.end_ms ?? 0,
        confidence: Number(row.confidence ?? 0),
      })),
      {
        keyTerms,
        scriptHints: scriptsText,
      },
    );
    scoredRows = scoredRows.map((row, index) => ({
      ...row,
      text: restored[index]?.text || row.text,
    }));
    const textUpdates = scoredRows.filter((row, index) => row.text !== stored[index].text);
    if (textUpdates.length) {
      await Promise.all(
        textUpdates.map((row) =>
          db.from("utterances").update({ text: row.text }).eq("id", row.id),
        ),
      );
    }

    const asAssembly = scoredRows.map((u) => ({
      speaker: u.speaker_label,
      text: u.text,
      start: u.start_ms ?? 0,
      end: u.end_ms ?? 0,
      confidence: Number(u.confidence ?? 0),
    }));
    if (mode === "documents") {
      const callText = scoredRows.map((row) => row.text).join("\n");
      standardsText = await retrieveQaContext(call.user_id, orgDocs, callText);
      if (standardsText.trim().length < 80) {
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

    const roleUpdates = scoredRows
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
