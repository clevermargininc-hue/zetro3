import { BILLING_PLAN_LABELS, type BillingPlan } from "@/lib/billing";

const PLAN_CHIP: Record<BillingPlan, string> = {
  trial: "chip chip-wait",
  monthly: "chip chip-ok",
  annual: "chip chip-ok",
  paused: "chip chip-bad",
};

export function PlanChip({ plan }: { plan: BillingPlan }) {
  return <span className={PLAN_CHIP[plan]}>{BILLING_PLAN_LABELS[plan]}</span>;
}
