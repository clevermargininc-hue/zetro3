import {
  apiErrorResponse,
  apiSuccessResponse,
  resolveWorkspaceAuth,
} from "@/lib/server/workspace-auth";
import { complianceFollowRateFromScore } from "@/lib/compliance-engine";
import { scorecardRows } from "@/lib/scorecard-rows";
import { sanitizeDisplayText, sanitizeInlineSnippet } from "@/lib/security/sanitize";
import type { CallScore, ComplianceCheck, MetricEvidence, Utterance } from "@/lib/types";
import { normalizeChannel, normalizeSentiment } from "@/lib/server/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await resolveWorkspaceAuth(request, {
    requiredCapability: "calls:view",
  });
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await context.params;

  try {
    const { data: call, error: callErr } = await ctx.admin
      .from("calls")
      .select("*, agents(name)")
      .eq("id", id)
      .in("user_id", ctx.teamScope)
      .maybeSingle();

    if (callErr) {
      return apiErrorResponse(500, callErr.message, ctx.requestId, "DB_ERROR");
    }
    if (!call) {
      return apiErrorResponse(404, "Call not found.", ctx.requestId, "NOT_FOUND");
    }

    const [{ data: scoreRow }, { data: utteranceRows }, coachingAttempt] = await Promise.all([
      ctx.admin.from("call_scores").select("*").eq("call_id", id).maybeSingle(),
      ctx.admin
        .from("utterances")
        .select("id, sequence, speaker_label, role, text, start_ms, end_ms, confidence")
        .eq("call_id", id)
        .order("sequence", { ascending: true }),
      ctx.admin
        .from("coaching_tasks")
        .select("id, title, notes, criterion, priority, status, due_at, created_at")
        .eq("call_id", id)
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false }),
    ]);

    const score = (scoreRow as CallScore | null) ?? null;
    const utterances = ((utteranceRows || []) as Utterance[]).map((u) => ({
      id: u.id,
      sequence: u.sequence,
      speakerLabel: sanitizeDisplayText(u.speaker_label, u.role === "agent" ? "Agent" : "Customer"),
      role: u.role,
      text: sanitizeDisplayText(u.text),
      startMs: u.start_ms,
      endMs: u.end_ms,
      confidence: u.confidence,
    }));

    const scorecard = score
      ? scorecardRows(score).map((row) => ({
          name: sanitizeDisplayText(row.name),
          score: row.score,
          weightPct: row.weight_pct ?? null,
          note: row.note ? sanitizeDisplayText(row.note) : null,
          gapNote: row.gap_note ? sanitizeDisplayText(row.gap_note) : null,
          quote: row.quote ? sanitizeDisplayText(row.quote) : null,
          startS: row.start_s ?? null,
        }))
      : [];

    const evidence = (score?.metric_evidence as MetricEvidence | null | undefined) ?? null;
    const rawChecks: ComplianceCheck[] = Array.isArray(evidence?.compliance_checks)
      ? evidence.compliance_checks
      : [];

    const complianceChecks = rawChecks.map((c) => ({
      rule: sanitizeDisplayText(c.rule),
      fileName: sanitizeDisplayText(c.file_name),
      result: c.result,
      severity: c.severity,
      note: c.note ? sanitizeDisplayText(c.note) : null,
      quote: c.quote ? sanitizeDisplayText(c.quote) : null,
      startS: c.start_s ?? null,
    }));

    const complianceRate = score
      ? complianceFollowRateFromScore({
          compliance_findings: score.compliance_findings,
          metric_evidence: evidence,
        })
      : null;

    // Extract AI-highlighted moments directly from real scorecard evidence and failed compliance checks
    const highlights: Array<{
      id: string;
      kind: "gap" | "compliance" | "strength";
      label: string;
      quote: string;
      startS: number | null;
      note: string | null;
    }> = [];

    for (const item of scorecard) {
      if (item.quote && (item.gapNote || item.score < 75)) {
        highlights.push({
          id: `param-gap-${item.name}`,
          kind: "gap",
          label: `${item.name} (${item.score}%)`,
          quote: item.quote,
          startS: item.startS,
          note: item.gapNote || item.note,
        });
      }
    }

    for (const check of complianceChecks) {
      if (check.result === "fail" && (check.quote || check.note)) {
        highlights.push({
          id: `compliance-${check.rule}`,
          kind: "compliance",
          label: `Compliance · ${check.severity.toUpperCase()}`,
          quote: check.quote || check.rule,
          startS: check.startS,
          note: check.note,
        });
      }
    }

    // Fallback coaching lookup if coaching_tasks table isn't created yet
    let coachingTasks: Array<{
      id: string;
      title: string;
      notes: string;
      criterion: string | null;
      priority: string;
      status: string;
      dueAt: string | null;
      createdAt: string;
    }> = [];

    if (!coachingAttempt.error && coachingAttempt.data) {
      coachingTasks = coachingAttempt.data.map((t) => ({
        id: String(t.id),
        title: sanitizeDisplayText(String(t.title || "")),
        notes: sanitizeDisplayText(String(t.notes || "")),
        criterion: typeof t.criterion === "string" ? sanitizeDisplayText(t.criterion) : null,
        priority: String(t.priority || "medium"),
        status: String(t.status || "open"),
        dueAt: typeof t.due_at === "string" ? t.due_at : null,
        createdAt: String(t.created_at),
      }));
    } else {
      const recAttempt = await ctx.admin
        .from("operational_recommendations")
        .select("id, recommended_action, priority, status, due_at, created_at")
        .eq("workspace_id", ctx.workspace.id)
        .eq("recommendation_type", "agent_coaching")
        .ilike("recommended_action", `%[call:${id}]%`)
        .order("created_at", { ascending: false });

      if (!recAttempt.error && recAttempt.data) {
        coachingTasks = recAttempt.data.map((r) => ({
          id: String(r.id),
          title: sanitizeInlineSnippet(
            String(r.recommended_action || "").replace(`[call:${id}]`, "").trim(),
            120,
          ),
          notes: sanitizeDisplayText(
            String(r.recommended_action || "").replace(`[call:${id}]`, "").trim(),
          ),
          criterion: null,
          priority: String(r.priority || "medium"),
          status: String(r.status || "suggested"),
          dueAt: typeof r.due_at === "string" ? r.due_at : null,
          createdAt: String(r.created_at),
        }));
      }
    }

    const rawAgents = (call as { agents?: { name: string } | { name: string }[] | null }).agents;
    const agentObj = Array.isArray(rawAgents) ? rawAgents[0] : rawAgents;
    const agentName = sanitizeDisplayText(agentObj?.name, "Unassigned agent");

    return apiSuccessResponse(
      {
        call: {
          id: String(call.id),
          title: sanitizeDisplayText(
            (call.title as string | null) || (call.file_name as string | null),
            "Recorded call",
          ),
          fileName: call.file_name ? sanitizeDisplayText(String(call.file_name)) : null,
          hasAudio: Boolean(call.audio_path),
          durationSeconds: (call.duration_seconds as number | null) ?? null,
          language: String(call.detected_language || call.language_mode || "mixed"),
          channel: normalizeChannel((call as { channel?: string | null }).channel),
          agentId: (call.agent_id as string | null) ?? null,
          agentName,
          status: String(call.status),
          reviewStatus: String(
            (call as { review_status?: string | null }).review_status || "pending",
          ),
          createdAt: String(call.created_at),
          completedAt: (call.completed_at as string | null) ?? null,
        },
        summary: score?.summary ? sanitizeDisplayText(score.summary) : null,
        overallScore: score ? Math.round(score.overall_score) : null,
        verdict: score?.verdict ?? null,
        sentiment: normalizeSentiment(score?.customer_sentiment),
        complianceFollowedPct: complianceRate?.followed_pct ?? null,
        strengths: Array.isArray(score?.strengths)
          ? score.strengths.map((s) => sanitizeDisplayText(s)).filter(Boolean)
          : [],
        improvements: Array.isArray(score?.improvements)
          ? score.improvements.map((s) => sanitizeDisplayText(s)).filter(Boolean)
          : [],
        scorecard,
        complianceChecks,
        highlights,
        utterances,
        coachingTasks,
      },
      ctx.requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load call inspection.";
    return apiErrorResponse(500, message, ctx.requestId, "CALL_DETAIL_ERROR");
  }
}
