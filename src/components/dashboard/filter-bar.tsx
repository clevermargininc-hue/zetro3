"use client";

import { useState } from "react";
import { Calendar, Filter, RotateCcw, ShieldAlert, AlertCircle, X } from "lucide-react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/cn";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import type {
  DashboardFiltersState,
  FilterChannel,
  FilterDatePreset,
} from "@/features/filters/use-dashboard-filters";
import type { QueueOption, TeamOption } from "@/features/teams/api/schemas";

type FilterBarProps = {
  filters: DashboardFiltersState;
  onUpdate: (patch: Partial<DashboardFiltersState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  teams: TeamOption[];
  queues: QueueOption[];
  agents: Array<{ id: string; name: string }>;
  copy: DashboardCopy["filters"];
};

const CONTROL_CLS =
  "z-focus h-9 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-3 text-[12.5px] font-medium text-[var(--z-ink)] hover:border-[var(--z-border-strong)] transition-colors";

export function FilterBar({
  filters,
  onUpdate,
  onReset,
  hasActiveFilters,
  teams,
  queues,
  agents,
  copy,
}: FilterBarProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(filters.from);
  const [customTo, setCustomTo] = useState(filters.to);

  const presets: Array<{ value: FilterDatePreset; label: string }> = [
    { value: "7d", label: copy.preset7d },
    { value: "30d", label: copy.preset30d },
    { value: "90d", label: copy.preset90d },
  ];

  const channels: Array<{ value: FilterChannel; label: string }> = [
    { value: "all", label: copy.allChannels },
    { value: "voice", label: "Voice" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "email", label: "Email" },
    { value: "chat", label: "Chat" },
  ];

  const visibleQueues = filters.teamId
    ? queues.filter((q) => !q.teamId || q.teamId === filters.teamId)
    : queues;

  const activeChips: Array<{ id: string; label: string; clear: () => void }> = [];
  if (filters.teamId) {
    const team = teams.find((t) => t.id === filters.teamId);
    activeChips.push({
      id: "team",
      label: `Team: ${team?.name ?? filters.teamId}`,
      clear: () => onUpdate({ teamId: "", queueId: "" }),
    });
  }
  if (filters.queueId) {
    const queue = queues.find((q) => q.id === filters.queueId);
    activeChips.push({
      id: "queue",
      label: `Queue: ${queue?.name ?? filters.queueId}`,
      clear: () => onUpdate({ queueId: "" }),
    });
  }
  if (filters.agentId) {
    const agent = agents.find((a) => a.id === filters.agentId);
    activeChips.push({
      id: "agent",
      label: `Agent: ${agent?.name ?? filters.agentId}`,
      clear: () => onUpdate({ agentId: "" }),
    });
  }
  if (filters.channel !== "all") {
    activeChips.push({
      id: "channel",
      label: `Channel: ${filters.channel}`,
      clear: () => onUpdate({ channel: "all" }),
    });
  }
  if (filters.sentiment !== "all") {
    activeChips.push({
      id: "sentiment",
      label: `Sentiment: ${filters.sentiment}`,
      clear: () => onUpdate({ sentiment: "all" }),
    });
  }
  if (filters.needsReview) {
    activeChips.push({
      id: "needsReview",
      label: copy.needsReviewOnly,
      clear: () => onUpdate({ needsReview: false }),
    });
  }
  if (filters.flagged) {
    activeChips.push({
      id: "flagged",
      label: copy.flaggedOnly,
      clear: () => onUpdate({ flagged: false }),
    });
  }
  if (filters.preset === "custom" && filters.from && filters.to) {
    activeChips.push({
      id: "customRange",
      label: `${filters.from} → ${filters.to}`,
      clear: () => onUpdate({ preset: "30d", from: "", to: "" }),
    });
  }

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="Dashboard filters">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Preset segmented date group */}
        <div
          role="group"
          aria-label="Date range presets"
          className="inline-flex h-9 items-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] p-0.5"
        >
          {presets.map((p) => {
            const active = filters.preset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdate({ preset: p.value, from: "", to: "" })}
                className={cn(
                  "z-focus h-8 rounded-[6px] px-3 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-[var(--z-accent)] text-white"
                    : "text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)]",
                )}
              >
                {p.label}
              </button>
            );
          })}

          <Popover.Root open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-pressed={filters.preset === "custom"}
                aria-label="Custom date range"
                className={cn(
                  "z-focus inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[12px] font-semibold transition-colors",
                  filters.preset === "custom"
                    ? "bg-[var(--z-accent-tint)] text-[var(--z-accent)]"
                    : "text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)]",
                )}
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Custom</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={8}
                className="z-50 z-panel p-4 w-72 space-y-3"
              >
                <div className="text-[12.5px] font-semibold text-[var(--z-ink)]">
                  Custom Date Window
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <label className="text-[11.5px] font-medium text-[var(--z-ink-secondary)] flex flex-col gap-1">
                    From
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className={CONTROL_CLS}
                    />
                  </label>
                  <label className="text-[11.5px] font-medium text-[var(--z-ink-secondary)] flex flex-col gap-1">
                    To
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className={CONTROL_CLS}
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDatePopoverOpen(false)}
                    className="z-focus h-8 rounded-[var(--z-radius-control)] px-2.5 text-[12px] font-medium text-[var(--z-ink-secondary)] hover:bg-[var(--z-surface-muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!customFrom || !customTo || customTo < customFrom}
                    onClick={() => {
                      onUpdate({ preset: "custom", from: customFrom, to: customTo });
                      setDatePopoverOpen(false);
                    }}
                    className="z-focus h-8 rounded-[var(--z-radius-control)] bg-[var(--z-accent)] px-3 text-[12px] font-semibold text-white disabled:opacity-45"
                  >
                    Apply
                  </button>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* Team select */}
        <select
          aria-label="Filter by team"
          value={filters.teamId}
          onChange={(e) => onUpdate({ teamId: e.target.value, queueId: "" })}
          className={CONTROL_CLS}
        >
          <option value="">{teams.length ? "All teams" : "No teams configured"}</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Queue select */}
        <select
          aria-label="Filter by queue"
          value={filters.queueId}
          onChange={(e) => onUpdate({ queueId: e.target.value })}
          className={CONTROL_CLS}
        >
          <option value="">
            {visibleQueues.length ? "All queues" : "No queues configured"}
          </option>
          {visibleQueues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>

        {/* Agent select */}
        <select
          aria-label="Filter by agent"
          value={filters.agentId}
          onChange={(e) => onUpdate({ agentId: e.target.value })}
          className={CONTROL_CLS}
        >
          <option value="">{agents.length ? copy.allAgents : "No agents yet"}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Channel select */}
        <select
          aria-label="Filter by channel"
          value={filters.channel}
          onChange={(e) => onUpdate({ channel: e.target.value as FilterChannel })}
          className={CONTROL_CLS}
        >
          {channels.map((ch) => (
            <option key={ch.value} value={ch.value}>
              {ch.label}
            </option>
          ))}
        </select>

        {/* Quick toggle chips */}
        <button
          type="button"
          aria-pressed={filters.needsReview}
          onClick={() => onUpdate({ needsReview: !filters.needsReview })}
          className={cn(
            "z-focus inline-flex h-9 items-center gap-1.5 rounded-[var(--z-radius-control)] border px-3 text-[12.5px] font-semibold transition-colors",
            filters.needsReview
              ? "border-[var(--z-warn)] bg-[var(--z-warn-tint)] text-[var(--z-warn)]"
              : "border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)]",
          )}
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{copy.needsReviewOnly}</span>
        </button>

        <button
          type="button"
          aria-pressed={filters.flagged}
          onClick={() => onUpdate({ flagged: !filters.flagged })}
          className={cn(
            "z-focus inline-flex h-9 items-center gap-1.5 rounded-[var(--z-radius-control)] border px-3 text-[12.5px] font-semibold transition-colors",
            filters.flagged
              ? "border-[var(--z-fail)] bg-[var(--z-fail-tint)] text-[var(--z-fail)]"
              : "border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink-secondary)] hover:text-[var(--z-ink)]",
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{copy.flaggedOnly}</span>
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="z-focus inline-flex h-9 items-center gap-1.5 rounded-[var(--z-radius-control)] px-2.5 text-[12.5px] font-semibold text-[var(--z-accent)] hover:bg-[var(--z-accent-tint)] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.clearFilters}</span>
          </button>
        ) : null}
      </div>

      {/* Active filter summary pills */}
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--z-ink-muted)]">
            <Filter className="h-3 w-3" aria-hidden="true" />
            Active:
          </span>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.clear}
              className="z-focus inline-flex items-center gap-1 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--z-ink)] hover:border-[var(--z-border-strong)]"
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3 text-[var(--z-ink-muted)]" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

