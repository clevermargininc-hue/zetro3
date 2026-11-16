"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  CheckCircle2,
  ExternalLink,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { formatDateTimeInTz, type DashboardCopy, type DashboardLocale } from "@/lib/i18n/dashboard";
import { useCallDetailQuery } from "@/features/calls/api/queries";
import { useAssignCoachingMutation } from "@/features/coaching/api/queries";
import {
  ErrorState,
  ScoreBadge,
  SkeletonBlock,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { CallAudioPlayer } from "@/components/dashboard/call-audio-player";

type DrawerTab = "overview" | "transcript" | "scorecard" | "coaching";

export function CallInspectionDrawer({
  callId,
  onClose,
  canAssignCoaching,
  timezone,
  locale,
  copy,
}: {
  callId: string | null;
  onClose: () => void;
  canAssignCoaching: boolean;
  timezone: string;
  locale: DashboardLocale;
  copy: DashboardCopy;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [seekSeconds, setSeekSeconds] = useState<number | null>(null);
  const [coachingTitle, setCoachingTitle] = useState("");
  const [coachingCriterion, setCoachingCriterion] = useState("");
  const [coachingPriority, setCoachingPriority] = useState<
    "low" | "medium" | "high" | "critical"
  >("medium");
  const [coachingNotes, setCoachingNotes] = useState("");
  const [coachingSavedBanner, setCoachingSavedBanner] = useState(false);

  const detailQuery = useCallDetailQuery(callId);
  const assignCoaching = useAssignCoachingMutation();

  const detail = detailQuery.data;

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || coachingTitle.trim().length < 3) return;
    setCoachingSavedBanner(false);
    await assignCoaching.mutateAsync({
      callId: detail.call.id,
      agentId: detail.call.agentId,
      title: coachingTitle.trim(),
      criterion: coachingCriterion || null,
      priority: coachingPriority,
      notes: coachingNotes.trim(),
    });
    setCoachingTitle("");
    setCoachingNotes("");
    setCoachingSavedBanner(true);
  }

  return (
    <Dialog.Root
      open={Boolean(callId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(10,26,63,0.42)] backdrop-blur-[1px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-[var(--z-surface)] border-l border-[var(--z-border)] shadow-[var(--z-shadow-panel)] flex flex-col outline-none"
        >
          {/* Drawer Header */}
          <header className="px-6 py-4 border-b border-[var(--z-border)] flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--z-ink-muted)]">
                {copy.drawer.titlePrefix}
              </div>
              <Dialog.Title className="z-display mt-0.5 text-[16px] font-bold text-[var(--z-ink)] truncate">
                {detail ? detail.call.title : "Loading call details…"}
              </Dialog.Title>
              {detail ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--z-ink-secondary)] z-tabular">
                  <span className="font-semibold text-[var(--z-ink)]">
                    {detail.call.agentName}
                  </span>
                  <span>·</span>
                  <span>{formatDateTimeInTz(detail.call.createdAt, timezone, locale)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {detail ? (
                <Link
                  href={`/upload/score/${detail.call.id}`}
                  aria-label={copy.drawer.openFullAudit}
                  title={copy.drawer.openFullAudit}
                  className="z-focus inline-flex h-8 w-8 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)]"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close inspection drawer"
                  className="z-focus inline-flex h-8 w-8 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
          </header>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {detailQuery.isPending ? (
              <div className="space-y-4" aria-busy="true">
                <SkeletonBlock className="h-20 w-full" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-8 w-20" />
                  <SkeletonBlock className="h-8 w-20" />
                  <SkeletonBlock className="h-8 w-20" />
                </div>
                <SkeletonBlock className="h-32 w-full" />
                <SkeletonBlock className="h-48 w-full" />
              </div>
            ) : detailQuery.isError ? (
              <ErrorState
                error={detailQuery.error}
                copy={copy.states}
                onRetry={() => void detailQuery.refetch()}
              />
            ) : detail ? (
              <>
                {/* Real Audio Player */}
                <CallAudioPlayer
                  key={detail.call.id}
                  callId={detail.call.id}
                  hasAudio={detail.call.hasAudio}
                  durationSeconds={detail.call.durationSeconds}
                  seekToSeconds={seekSeconds}
                  copy={copy.drawer}
                />

                {/* Key Metrics Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreBadge score={detail.overallScore} />
                  {detail.complianceFollowedPct != null ? (
                    <StatusBadge
                      tone={
                        detail.complianceFollowedPct >= 90
                          ? "pass"
                          : detail.complianceFollowedPct >= 70
                            ? "warn"
                            : "fail"
                      }
                      icon="shield"
                      label={`Compliance ${detail.complianceFollowedPct}%`}
                    />
                  ) : null}
                  <StatusBadge
                    tone={
                      detail.sentiment === "positive"
                        ? "pass"
                        : detail.sentiment === "negative"
                          ? "fail"
                          : "neutral"
                    }
                    label={`Sentiment: ${detail.sentiment}`}
                  />
                </div>

                {/* Drawer Tabs */}
                <div
                  role="tablist"
                  aria-label="Call inspection sections"
                  className="grid grid-cols-4 gap-1 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-1"
                >
                  {(
                    [
                      ["overview", copy.drawer.summaryTab],
                      ["transcript", copy.drawer.transcriptTab],
                      ["scorecard", copy.drawer.scorecardTab],
                      ["coaching", copy.drawer.coachingTab],
                    ] as Array<[DrawerTab, string]>
                  ).map(([tabKey, tabLabel]) => (
                    <button
                      key={tabKey}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tabKey}
                      onClick={() => setActiveTab(tabKey)}
                      className={cn(
                        "z-focus rounded-[6px] py-1.5 text-[12px] font-semibold transition-colors",
                        activeTab === tabKey
                          ? "bg-[var(--z-surface)] text-[var(--z-ink)] shadow-xs"
                          : "text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)]",
                      )}
                    >
                      {tabLabel}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview & AI-Highlighted Moments */}
                {activeTab === "overview" ? (
                  <div className="space-y-4">
                    <div className="rounded-[var(--z-radius-card)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-4">
                      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--z-ink-muted)]">
                        AI Audit Summary
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--z-ink)]">
                        {detail.summary || "No AI summary stored for this call yet."}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--z-ink)]">
                        <Sparkles className="h-3.5 w-3.5 text-[var(--z-accent)]" />
                        <span>{copy.drawer.aiHighlightedMoments}</span>
                      </h3>
                      {detail.highlights.length === 0 ? (
                        <p className="text-[12.5px] text-[var(--z-ink-muted)]">
                          No critical rubric gaps or compliance quotes highlighted on this call.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.highlights.map((h) => (
                            <div
                              key={h.id}
                              className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={cn(
                                    "text-[11.5px] font-semibold",
                                    h.kind === "compliance"
                                      ? "text-[var(--z-fail)]"
                                      : "text-[var(--z-warn)]",
                                  )}
                                >
                                  {h.label}
                                </span>
                                {h.startS != null ? (
                                  <button
                                    type="button"
                                    onClick={() => setSeekSeconds(h.startS)}
                                    className="z-focus text-[11.5px] font-semibold text-[var(--z-accent)] hover:underline z-tabular"
                                  >
                                    Jump to {formatClock(h.startS * 1000)}
                                  </button>
                                ) : null}
                              </div>
                              <blockquote className="text-[12.5px] italic text-[var(--z-ink)] border-l-2 border-[var(--z-accent)] pl-2.5">
                                “{h.quote}”
                              </blockquote>
                              {h.note ? (
                                <p className="text-[12px] text-[var(--z-ink-secondary)]">
                                  {h.note}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Tab 2: Sanitized Transcript with Timestamps */}
                {activeTab === "transcript" ? (
                  <div className="space-y-2.5">
                    {detail.utterances.length === 0 ? (
                      <div className="rounded-[var(--z-radius-card)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-4 text-[12.5px] text-[var(--z-ink-muted)] flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 shrink-0" />
                        <span>{copy.drawer.noTranscript}</span>
                      </div>
                    ) : (
                      detail.utterances.map((u) => {
                        const isAgent = u.role === "agent";
                        return (
                          <div
                            key={u.id}
                            className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "text-[11.5px] font-semibold",
                                  isAgent ? "text-[var(--z-accent)]" : "text-[var(--z-ink)]",
                                )}
                              >
                                {u.speakerLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSeekSeconds(u.startMs / 1000)}
                                className="z-focus text-[11px] font-medium text-[var(--z-ink-muted)] hover:text-[var(--z-accent)] z-tabular"
                              >
                                {formatClock(u.startMs)}
                              </button>
                            </div>
                            <p className="text-[13px] leading-relaxed text-[var(--z-ink)]">
                              {u.text}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}

                {/* Tab 3: Scorecard & Compliance Breakdown */}
                {activeTab === "scorecard" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {detail.scorecard.map((row) => (
                        <div
                          key={row.name}
                          className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12.5px] font-semibold text-[var(--z-ink)]">
                              {row.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {row.score < 80 && canAssignCoaching ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCoachingCriterion(row.name);
                                    setCoachingTitle(`Improve ${row.name}`);
                                    setActiveTab("coaching");
                                  }}
                                  className="z-focus text-[11px] font-semibold text-[var(--z-accent)] hover:underline"
                                >
                                  Coach
                                </button>
                              ) : null}
                              <ScoreBadge score={row.score} />
                            </div>
                          </div>
                          {row.gapNote || row.note ? (
                            <p className="text-[12px] text-[var(--z-ink-secondary)]">
                              {row.gapNote || row.note}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--z-border)]">
                      <h3 className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--z-ink)]">
                        <ShieldAlert className="h-3.5 w-3.5 text-[var(--z-ink-muted)]" />
                        <span>{copy.drawer.complianceChecks}</span>
                      </h3>
                      {detail.complianceChecks.length === 0 ? (
                        <p className="text-[12.5px] text-[var(--z-ink-muted)]">
                          No specific compliance rule checks stored for this call.
                        </p>
                      ) : (
                        detail.complianceChecks.map((c, idx) => (
                          <div
                            key={`${c.rule}-${idx}`}
                            className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] p-3 space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[12.5px] font-medium text-[var(--z-ink)]">
                                {c.rule}
                              </span>
                              <StatusBadge
                                tone={
                                  c.result === "pass" || c.result === "passed"
                                    ? "pass"
                                    : c.result === "fail" || c.result === "failed"
                                      ? "fail"
                                      : "neutral"
                                }
                                icon={
                                  c.result === "pass" || c.result === "passed"
                                    ? "pass"
                                    : c.result === "fail" || c.result === "failed"
                                      ? "fail"
                                      : "clock"
                                }
                                label={c.result.toUpperCase()}
                              />
                            </div>
                            {c.note ? (
                              <p className="text-[12px] text-[var(--z-ink-secondary)]">
                                {c.note}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Tab 4: Assign Coaching (Real API Mutation + Optimistic Update) */}
                {activeTab === "coaching" ? (
                  <div className="space-y-4">
                    {canAssignCoaching ? (
                      <form
                        onSubmit={handleAssignSubmit}
                        className="rounded-[var(--z-radius-card)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-4 space-y-3"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--z-ink)]">
                          <UserCheck className="h-4 w-4 text-[var(--z-accent)]" />
                          <span>{copy.drawer.assignCoachingTitle}</span>
                        </div>

                        {coachingSavedBanner ? (
                          <div className="flex items-center gap-2 rounded-[var(--z-radius-control)] bg-[var(--z-pass-tint)] px-3 py-2 text-[12px] font-semibold text-[var(--z-pass)]">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{copy.drawer.coachingSuccess}</span>
                          </div>
                        ) : null}

                        {assignCoaching.isError ? (
                          <ErrorState error={assignCoaching.error} copy={copy.states} compact />
                        ) : null}

                        <label className="block space-y-1">
                          <span className="text-[12px] font-medium text-[var(--z-ink-secondary)]">
                            {copy.drawer.coachingTitleLabel}
                          </span>
                          <input
                            type="text"
                            required
                            minLength={3}
                            value={coachingTitle}
                            onChange={(e) => setCoachingTitle(e.target.value)}
                            placeholder="e.g. Confirm customer identity before balance disclosure"
                            className="z-focus h-9 w-full rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-3 text-[12.5px] text-[var(--z-ink)]"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-2.5">
                          <label className="block space-y-1">
                            <span className="text-[12px] font-medium text-[var(--z-ink-secondary)]">
                              {copy.drawer.coachingCriterionLabel}
                            </span>
                            <select
                              value={coachingCriterion}
                              onChange={(e) => setCoachingCriterion(e.target.value)}
                              className="z-focus h-9 w-full rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[12px] text-[var(--z-ink)]"
                            >
                              <option value="">General QA</option>
                              {detail.scorecard.map((s) => (
                                <option key={s.name} value={s.name}>
                                  {s.name} ({s.score}%)
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block space-y-1">
                            <span className="text-[12px] font-medium text-[var(--z-ink-secondary)]">
                              {copy.drawer.coachingPriorityLabel}
                            </span>
                            <select
                              value={coachingPriority}
                              onChange={(e) =>
                                setCoachingPriority(
                                  e.target.value as "low" | "medium" | "high" | "critical",
                                )
                              }
                              className="z-focus h-9 w-full rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 text-[12px] text-[var(--z-ink)]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </label>
                        </div>

                        <label className="block space-y-1">
                          <span className="text-[12px] font-medium text-[var(--z-ink-secondary)]">
                            {copy.drawer.coachingNotesLabel}
                          </span>
                          <textarea
                            rows={3}
                            value={coachingNotes}
                            onChange={(e) => setCoachingNotes(e.target.value)}
                            placeholder="Reference the exact timestamp and expected Swahili/English phrasing."
                            className="z-focus w-full rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] p-2.5 text-[12.5px] text-[var(--z-ink)]"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={assignCoaching.isPending || coachingTitle.trim().length < 3}
                          className="z-focus w-full h-9 rounded-[var(--z-radius-control)] bg-[var(--z-accent)] text-[12.5px] font-semibold text-white hover:bg-[var(--z-accent-hover)] disabled:opacity-45 transition-colors"
                        >
                          {assignCoaching.isPending
                            ? copy.drawer.coachingSubmitting
                            : copy.drawer.coachingSubmit}
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] p-3.5 text-[12.5px] text-[var(--z-ink-secondary)]">
                        Read-only role: you do not have permission to assign coaching tasks.
                      </div>
                    )}

                    {/* Existing coaching tasks on this call */}
                    <div className="space-y-2">
                      <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--z-ink-muted)]">
                        Assigned Coaching History ({detail.coachingTasks.length})
                      </h4>
                      {detail.coachingTasks.length === 0 ? (
                        <p className="text-[12.5px] text-[var(--z-ink-muted)]">
                          No coaching tasks assigned on this call yet.
                        </p>
                      ) : (
                        detail.coachingTasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12.5px] font-semibold text-[var(--z-ink)]">
                                {task.title}
                              </span>
                              <StatusBadge
                                tone={
                                  task.priority === "critical" || task.priority === "high"
                                    ? "fail"
                                    : "accent"
                                }
                                label={task.status.replace("_", " ")}
                              />
                            </div>
                            {task.notes ? (
                              <p className="text-[12px] text-[var(--z-ink-secondary)]">
                                {task.notes}
                              </p>
                            ) : null}
                            <div className="text-[11px] text-[var(--z-ink-muted)] z-tabular">
                              {formatDateTimeInTz(task.createdAt, timezone, locale)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
