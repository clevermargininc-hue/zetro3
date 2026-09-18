/**
 * Commercial catalog. Separate from workspace solo/team (that is login access, not the bill).
 *
 * Unit of sale: an audited minute = prepare (speech-to-text + speakers) + documents score.
 * Prepare-only skips the GPT audit and is cheaper.
 *
 * List prices assume about $0.03 fully loaded COGS per audited minute at a typical call
 * length (AssemblyAI + scorecard pass) and keep blended rates near 65%+ gross margin.
 * Do not cut overage below those rates without changing the model that runs the audit.
 */

export const WORKING_DAYS_PER_MONTH = 22;
export const DEFAULT_TALK_HOURS_PER_DAY = 5;
export const DEFAULT_AUDIT_PERCENT = 5;
export const DEFAULT_AGENT_COUNT = 8;
export const FLOOR_MONTHLY_MINIMUM_USD = 1_200;

export const BILLING_HONESTY =
  "Signup is open so you can try a workspace. Invoices and overage metering are activated with sales — not auto-charged in the app yet.";

export type CommercialPlanId = "trial" | "sampling" | "coverage" | "floor";

export type CommercialPlan = {
  id: CommercialPlanId;
  name: string;
  blurb: string;
  monthlyUsd: number | null;
  priceLabel: string;
  periodLabel: string;
  includedAuditedMinutes: number;
  auditedOveragePerMinuteUsd: number | null;
  prepareOnlyPerMinuteUsd: number | null;
  agentCap: number | null;
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
  features: string[];
};

export const COMMERCIAL_PLANS: Record<CommercialPlanId, CommercialPlan> = {
  trial: {
    id: "trial",
    name: "Trial",
    blurb: "Prove the audit on your scorecard before you buy minutes.",
    monthlyUsd: 0,
    priceLabel: "$0",
    periodLabel: "/ first month",
    includedAuditedMinutes: 120,
    auditedOveragePerMinuteUsd: null,
    prepareOnlyPerMinuteUsd: null,
    agentCap: 3,
    ctaLabel: "Start a workspace",
    ctaHref: "/signup",
    features: [
      "120 audited minutes (prepare + documents score)",
      "Up to 3 named agents",
      "Your company scorecard, not a generic rubric",
      "English + Kiswahili on East Africa workspaces",
      "Then move to Sampling, Coverage, or Floor",
    ],
  },
  sampling: {
    id: "sampling",
    name: "Sampling",
    blurb: "Replace the 2–5% human sample with a consistent AI sample.",
    monthlyUsd: 149,
    priceLabel: "$149",
    periodLabel: "/ month",
    includedAuditedMinutes: 1_200,
    auditedOveragePerMinuteUsd: 0.12,
    prepareOnlyPerMinuteUsd: 0.04,
    agentCap: null,
    ctaLabel: "Talk to sales",
    ctaHref: "/talk-sales?plan=sampling",
    features: [
      "1,200 audited minutes included",
      "Extra audited minutes at $0.12 / min",
      "Prepare-only (no score) at $0.04 / min",
      "Company SOP, scorecard, and compliance files",
      "QA briefing, print pack, and spreadsheet export",
    ],
  },
  coverage: {
    id: "coverage",
    name: "Coverage",
    blurb: "Audit most of a queue — not a whole 20-agent floor.",
    monthlyUsd: 449,
    priceLabel: "$449",
    periodLabel: "/ month",
    includedAuditedMinutes: 5_000,
    auditedOveragePerMinuteUsd: 0.1,
    prepareOnlyPerMinuteUsd: 0.035,
    agentCap: null,
    ctaLabel: "Talk to sales",
    ctaHref: "/talk-sales?plan=coverage",
    featured: true,
    features: [
      "5,000 audited minutes included",
      "Extra audited minutes at $0.10 / min",
      "Prepare-only (no score) at $0.035 / min",
      "Team analytics and compliance pack",
      "Invoice in USD, TZS, or KES",
    ],
  },
  floor: {
    id: "floor",
    name: "Floor",
    blurb: "Committed minutes for 100% audit on a site. Quote from volume, not a sticker.",
    monthlyUsd: null,
    priceLabel: "Custom",
    periodLabel: "from $1,200 / mo",
    includedAuditedMinutes: 20_000,
    auditedOveragePerMinuteUsd: 0.06,
    prepareOnlyPerMinuteUsd: 0.025,
    agentCap: null,
    ctaLabel: "Request a floor quote",
    ctaHref: "/talk-sales?plan=floor",
    features: [
      "From 20,000 audited minutes / month",
      "Indicative $0.06 / audited minute on the commit",
      "Prepare-only at $0.025 / min",
      "PBX / CCaaS ingest when we wire your stack",
      "SSO, retention, and SLA on the contract",
    ],
  },
};

export const LIST_PLANS: CommercialPlan[] = [
  COMMERCIAL_PLANS.trial,
  COMMERCIAL_PLANS.sampling,
  COMMERCIAL_PLANS.coverage,
];

export function isCommercialPlanId(value: string | null | undefined): value is CommercialPlanId {
  return value === "trial" || value === "sampling" || value === "coverage" || value === "floor";
}

export function monthlyTalkMinutes(agents: number, talkHoursPerDay: number) {
  const seats = Math.max(0, agents);
  const hours = Math.max(0, talkHoursPerDay);
  return Math.round(seats * hours * WORKING_DAYS_PER_MONTH * 60);
}

export function minutesToAudit(talkMinutes: number, auditPercent: number) {
  const percent = Math.min(100, Math.max(0, auditPercent)) / 100;
  return Math.round(Math.max(0, talkMinutes) * percent);
}

export function formatUsd(amount: number) {
  const rounded = Math.abs(amount) >= 100 ? Math.round(amount) : Math.round(amount * 100) / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
  }).format(rounded);
  return formatted;
}

export function formatMinutes(minutes: number) {
  return `${Math.round(minutes).toLocaleString("en-US")} min`;
}

export type PlanQuote = {
  plan: CommercialPlan;
  platformUsd: number;
  auditedOverageMinutes: number;
  auditedOverageUsd: number;
  prepareOnlyUsd: number;
  totalUsd: number;
  blendedPerAuditedMinuteUsd: number | null;
  overAgentCap: boolean;
};

function floorQuote(auditedMinutes: number, prepareOnlyMinutes: number): PlanQuote {
  const plan = COMMERCIAL_PLANS.floor;
  const overageRate = plan.auditedOveragePerMinuteUsd ?? 0.06;
  const prepareRate = plan.prepareOnlyPerMinuteUsd ?? 0.025;
  const included = plan.includedAuditedMinutes;
  const auditedOverageMinutes = Math.max(0, auditedMinutes - included);
  const platformUsd = FLOOR_MONTHLY_MINIMUM_USD;
  const auditedOverageUsd = auditedOverageMinutes * overageRate;
  const prepareOnlyUsd = Math.max(0, prepareOnlyMinutes) * prepareRate;
  const totalUsd = platformUsd + auditedOverageUsd + prepareOnlyUsd;
  return {
    plan,
    platformUsd,
    auditedOverageMinutes,
    auditedOverageUsd,
    prepareOnlyUsd,
    totalUsd,
    blendedPerAuditedMinuteUsd: auditedMinutes > 0 ? totalUsd / auditedMinutes : null,
    overAgentCap: false,
  };
}

function listedQuote(
  plan: CommercialPlan,
  auditedMinutes: number,
  prepareOnlyMinutes: number,
  agents: number,
): PlanQuote {
  if (plan.id === "floor") return floorQuote(auditedMinutes, prepareOnlyMinutes);
  const platformUsd = plan.monthlyUsd ?? 0;
  const included = plan.includedAuditedMinutes;
  const overageRate = plan.auditedOveragePerMinuteUsd ?? 0;
  const prepareRate = plan.prepareOnlyPerMinuteUsd ?? 0;
  const auditedOverageMinutes =
    plan.auditedOveragePerMinuteUsd == null ? 0 : Math.max(0, auditedMinutes - included);
  const auditedOverageUsd = auditedOverageMinutes * overageRate;
  const prepareOnlyUsd = Math.max(0, prepareOnlyMinutes) * prepareRate;
  const totalUsd =
    plan.auditedOveragePerMinuteUsd == null && auditedMinutes > included
      ? Number.POSITIVE_INFINITY
      : platformUsd + auditedOverageUsd + prepareOnlyUsd;
  return {
    plan,
    platformUsd,
    auditedOverageMinutes,
    auditedOverageUsd,
    prepareOnlyUsd,
    totalUsd,
    blendedPerAuditedMinuteUsd:
      auditedMinutes > 0 && Number.isFinite(totalUsd) ? totalUsd / auditedMinutes : null,
    overAgentCap: plan.agentCap != null && agents > plan.agentCap,
  };
}

export type VolumeQuote = {
  agents: number;
  talkHoursPerDay: number;
  auditPercent: number;
  talkMinutes: number;
  auditedMinutes: number;
  quotes: PlanQuote[];
  recommended: PlanQuote;
};

export function quoteVolume(input: {
  agents: number;
  talkHoursPerDay: number;
  auditPercent: number;
  prepareOnlyMinutes?: number;
}): VolumeQuote {
  const agents = Math.max(0, Math.round(input.agents) || 0);
  const talkHoursPerDay = Math.max(0, input.talkHoursPerDay);
  const auditPercent = Math.min(100, Math.max(0, input.auditPercent));
  const talkMinutes = monthlyTalkMinutes(agents, talkHoursPerDay);
  const auditedMinutes = minutesToAudit(talkMinutes, auditPercent);
  const prepareOnlyMinutes = Math.max(0, input.prepareOnlyMinutes ?? 0);

  const trial = listedQuote(COMMERCIAL_PLANS.trial, auditedMinutes, prepareOnlyMinutes, agents);
  const sampling = listedQuote(COMMERCIAL_PLANS.sampling, auditedMinutes, prepareOnlyMinutes, agents);
  const coverage = listedQuote(COMMERCIAL_PLANS.coverage, auditedMinutes, prepareOnlyMinutes, agents);
  const floor = floorQuote(auditedMinutes, prepareOnlyMinutes);

  const paid = [sampling, coverage, floor].filter(
    (row) => Number.isFinite(row.totalUsd) && !row.overAgentCap,
  );
  const trialFits =
    auditedMinutes <= COMMERCIAL_PLANS.trial.includedAuditedMinutes &&
    agents <= (COMMERCIAL_PLANS.trial.agentCap ?? 0) &&
    prepareOnlyMinutes === 0;

  const recommended = trialFits
    ? trial
    : paid.reduce((best, row) => (row.totalUsd < best.totalUsd ? row : best), paid[0] ?? floor);

  return {
    agents,
    talkHoursPerDay,
    auditPercent,
    talkMinutes,
    auditedMinutes,
    quotes: [trial, sampling, coverage, floor],
    recommended,
  };
}

export const WORKED_EXAMPLES = [
  {
    id: "sample-floor",
    title: "Keep sampling a 20-agent floor",
    detail: "5% of talk time — what most QA teams already review by hand.",
    agents: 20,
    talkHoursPerDay: 5,
    auditPercent: 5,
  },
  {
    id: "one-queue",
    title: "One queue, mostly audited",
    detail: "8 agents, 70% of talk. Coverage until the bill prefers a Floor commit.",
    agents: 8,
    talkHoursPerDay: 5,
    auditPercent: 70,
  },
  {
    id: "full-floor",
    title: "Whole floor, every call",
    detail: "20 agents at 100%. This is a volume contract, not a $149 seat.",
    agents: 20,
    talkHoursPerDay: 5,
    auditPercent: 100,
  },
] as const;
