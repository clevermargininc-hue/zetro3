"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderSearch,
  Lock,
  Minus,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Upload,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import { ApiClientError } from "@/lib/api/client";

export type SemanticTone = "pass" | "warn" | "fail" | "neutral" | "accent";

const TONE_CLASSES: Record<SemanticTone, string> = {
  pass: "text-[var(--z-pass)] bg-[var(--z-pass-tint)] border-[color-mix(in_srgb,var(--z-pass)_24%,transparent)]",
  warn: "text-[var(--z-warn)] bg-[var(--z-warn-tint)] border-[color-mix(in_srgb,var(--z-warn)_28%,transparent)]",
  fail: "text-[var(--z-fail)] bg-[var(--z-fail-tint)] border-[color-mix(in_srgb,var(--z-fail)_24%,transparent)]",
  neutral: "text-[var(--z-ink-secondary)] bg-[var(--z-surface-muted)] border-[var(--z-border)]",
  accent: "text-[var(--z-accent)] bg-[var(--z-accent-tint)] border-[color-mix(in_srgb,var(--z-accent)_26%,transparent)]",
};

export function toneForScore(score: number | null | undefined): SemanticTone {
  if (score == null) return "neutral";
  if (score >= 80) return "pass";
  if (score >= 60) return "warn";
  return "fail";
}

export function ScoreBadge({
  score,
  label,
  className,
}: {
  score: number | null | undefined;
  label?: string;
  className?: string;
}) {
  const tone = toneForScore(score);
  const Icon =
    tone === "pass"
      ? CheckCircle2
      : tone === "warn"
        ? AlertTriangle
        : tone === "fail"
          ? XCircle
          : Clock;

  const statusText =
    label ??
    (score == null ? "Pending" : tone === "pass" ? "Pass" : tone === "warn" ? "Review" : "Fail");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--z-radius-control)] border px-2 py-0.5 text-[12px] font-semibold z-tabular whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{score != null ? `${Math.round(score)}%` : "—"}</span>
      <span className="font-medium opacity-85">{statusText}</span>
    </span>
  );
}

export function StatusBadge({
  tone,
  label,
  icon = "dot",
  className,
}: {
  tone: SemanticTone;
  label: string;
  icon?: "pass" | "warn" | "fail" | "clock" | "shield" | "dot";
  className?: string;
}) {
  const Icon =
    icon === "pass"
      ? CheckCircle2
      : icon === "warn"
        ? AlertTriangle
        : icon === "fail"
          ? XCircle
          : icon === "shield"
            ? ShieldAlert
            : icon === "clock"
              ? Clock
              : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--z-radius-control)] border px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current shrink-0"
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
}

export function DeltaBadge({
  delta,
  suffix = "%",
  invertPolarity = false,
  noDataLabel = "—",
}: {
  delta: number | null | undefined;
  suffix?: string;
  invertPolarity?: boolean;
  noDataLabel?: string;
}) {
  if (delta == null || !Number.isFinite(delta)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface-muted)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--z-ink-muted)] z-tabular"
        title={noDataLabel}
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
        <span>—</span>
      </span>
    );
  }

  const isZero = Math.abs(delta) < 0.05;
  const isPositiveMove = delta > 0;
  const isGood = isZero ? true : invertPolarity ? !isPositiveMove : isPositiveMove;

  const tone: SemanticTone = isZero ? "neutral" : isGood ? "pass" : "fail";
  const Icon = isZero ? Minus : isPositiveMove ? TrendingUp : TrendingDown;
  const formatted = `${delta > 0 ? "+" : ""}${Number.isInteger(delta) ? delta : delta.toFixed(1)}${suffix}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--z-radius-control)] border px-2 py-0.5 text-[11.5px] font-semibold z-tabular",
        TONE_CLASSES[tone],
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{formatted}</span>
    </span>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("z-skeleton", className)} aria-hidden="true" />;
}

export function KpiCardSkeleton() {
  return (
    <div className="z-card p-6 flex flex-col justify-between gap-4" aria-busy="true">
      <div className="flex items-center justify-between gap-2">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-5 w-14" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <SkeletonBlock className="h-9 w-24" />
        <SkeletonBlock className="h-10 w-24" />
      </div>
      <SkeletonBlock className="h-3.5 w-36" />
    </div>
  );
}

export function PermissionDeniedState({
  title,
  body,
  requestId,
}: {
  title: string;
  body: string;
  requestId?: string | null;
}) {
  return (
    <div
      role="alert"
      className="z-card p-6 flex flex-col items-start gap-3 border-[color-mix(in_srgb,var(--z-warn)_35%,var(--z-border))]"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--z-radius-control)] bg-[var(--z-warn-tint)] text-[var(--z-warn)]">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="z-display text-[15px] font-semibold text-[var(--z-ink)]">{title}</h3>
        <p className="mt-1 text-[13px] text-[var(--z-ink-secondary)] max-w-lg">{body}</p>
        {requestId ? (
          <p className="mt-2 text-[11.5px] text-[var(--z-ink-muted)] z-tabular">
            Request ID: {requestId}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  copy,
  onRetry,
  compact = false,
}: {
  error: unknown;
  copy: DashboardCopy["states"];
  onRetry?: () => void;
  compact?: boolean;
}) {
  if (error instanceof ApiClientError && error.status === 403) {
    return (
      <PermissionDeniedState
        title={copy.forbiddenTitle}
        body={error.message || copy.forbiddenBody}
        requestId={error.requestId}
      />
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error interrupted this request.";
  const requestId = error instanceof ApiClientError ? error.requestId : null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start justify-between gap-4 rounded-[var(--z-radius-card)] border border-[color-mix(in_srgb,var(--z-fail)_28%,var(--z-border))] bg-[var(--z-surface)]",
        compact ? "p-4" : "p-6",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--z-radius-control)] bg-[var(--z-fail-tint)] text-[var(--z-fail)]">
          <AlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="z-display text-[14px] font-semibold text-[var(--z-ink)]">
            {copy.errorTitle}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--z-ink-secondary)]">{message}</p>
          {requestId ? (
            <p className="mt-1.5 text-[11.5px] text-[var(--z-ink-muted)] z-tabular">
              {copy.requestIdLabel}: <code className="font-mono">{requestId}</code>
            </p>
          ) : null}
        </div>
      </div>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="z-focus inline-flex items-center gap-2 rounded-[var(--z-radius-control)] border border-[var(--z-border-strong)] bg-[var(--z-surface)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{copy.retry}</span>
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  variant,
  copy,
  onClearFilters,
  canUpload = true,
  compact = false,
}: {
  variant: "first-run" | "filtered";
  copy: DashboardCopy["states"];
  onClearFilters?: () => void;
  canUpload?: boolean;
  compact?: boolean;
}) {
  if (variant === "filtered") {
    return (
      <div
        className={cn(
          "z-dot-grid flex flex-col items-center justify-center text-center rounded-[var(--z-radius-card)] border border-dashed border-[var(--z-border-strong)] bg-[var(--z-surface)]",
          compact ? "px-6 py-10" : "px-6 py-14",
        )}
      >
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--z-radius-control)] border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-ink-muted)]">
          <FolderSearch className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="z-display mt-3 text-[15px] font-semibold text-[var(--z-ink)]">
          {copy.filteredEmptyTitle}
        </h3>
        <p className="mt-1 max-w-md text-[13px] text-[var(--z-ink-secondary)]">
          {copy.filteredEmptyBody}
        </p>
        {onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="z-focus mt-4 inline-flex items-center gap-1.5 rounded-[var(--z-radius-control)] border border-[var(--z-border-strong)] bg-[var(--z-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] transition-colors"
          >
            <span>Clear filters</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="z-dot-grid flex flex-col items-center justify-center text-center rounded-[var(--z-radius-panel)] border border-[var(--z-border)] bg-[var(--z-surface)] px-8 py-16 shadow-[var(--z-shadow-card)]">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--z-radius-card)] bg-[var(--z-accent-tint)] text-[var(--z-accent)]">
        <Upload className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="z-display mt-4 text-[20px] font-bold tracking-[-0.02em] text-[var(--z-ink)]">
        {copy.firstRunTitle}
      </h2>
      <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-[var(--z-ink-secondary)]">
        {copy.firstRunBody}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {canUpload ? (
          <Link
            href="/upload"
            className="z-focus inline-flex items-center gap-2 rounded-[var(--z-radius-control)] bg-[var(--z-accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--z-accent-hover)] transition-colors"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{copy.firstRunPrimary}</span>
          </Link>
        ) : null}
        <Link
          href="/settings/connections"
          className="z-focus inline-flex items-center gap-2 rounded-[var(--z-radius-control)] border border-[var(--z-border-strong)] bg-[var(--z-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--z-ink)] hover:bg-[var(--z-surface-muted)] transition-colors"
        >
          <span>{copy.firstRunSecondary}</span>
        </Link>
      </div>
    </div>
  );
}

