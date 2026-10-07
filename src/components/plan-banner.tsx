import Link from "next/link";
import { SALES_EMAIL, salesMailto } from "@/lib/contact";
import { planBlockMessage, type PlanStatus } from "@/lib/plans";

export function PlanBanner({ status }: { status: PlanStatus | null }) {
  if (!status || status.setupMissing) return null;
  if (status.plan === "monthly" || status.plan === "annual") return null;

  const mailto = salesMailto("Zetro — choose a plan");

  if (!status.canScore) {
    return (
      <div className="no-print mb-6 flex flex-col gap-3 border border-rose/30 bg-rose/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-ink">{planBlockMessage(status)}</p>
        <a href={mailto} className="btn btn-blue shrink-0 text-[13px]">
          Email {SALES_EMAIL}
        </a>
      </div>
    );
  }

  return (
    <div className="no-print mb-6 flex flex-col gap-2 border border-blue/20 bg-blue-soft px-5 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-ink">
        <span className="font-semibold">Free trial:</span> {status.scoredCalls} of {status.trialCalls} calls scored ·{" "}
        {status.trialRemaining} left. Deleting a call does not restore a free trial slot. Re-scoring a call does not use the trial.
      </p>
      <p className="shrink-0 text-muted">
        <Link href="/pricing" className="font-semibold text-blue hover:underline">
          See plans
        </Link>{" "}
        ·{" "}
        <a href={mailto} className="font-semibold text-blue hover:underline">
          Email sales
        </a>
      </p>
    </div>
  );
}
