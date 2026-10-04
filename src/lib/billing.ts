/**
 * Price list — Tanzania. Source of truth: docs/pricing-tzs.md. Every amount excludes VAT.
 * Separate from workspace solo/team (that is login access, not the bill).
 *
 * Unit of sale: one scored call, priced by its recorded length band and the monthly volume
 * in the contract. Volume discounts stay small because provider cost per call does not fall
 * with volume. Do not publish the "Over 100,000" rate until the playbook caching cut is live.
 */

export const TZS_PER_USD = 2_600;
export const VAT_RATE = 0.18;
export const MONTHLY_MINIMUM_TZS = 500_000;
export const SETUP_FEE_TZS = 100_000;
export const ANNUAL_DISCOUNT = 0.1;
export const TRIAL_CALLS = 50;
export const AUDIO_DAYS_INCLUDED = 90;
export const MAX_TALK_MINUTES = 15;
export const LARGE_VOLUME_CALLS = 100_000;
export const MAX_CALLS_PER_MONTH = 1_000_000;
export const DEFAULT_CALLS_PER_MONTH = 20_000;
export const DEFAULT_TALK_MINUTES = 4;

export const BILLING_HONESTY =
  "There is no online checkout. Our sales team sends invoices in TZS — the app never charges your card.";

export type BillingCycle = "monthly" | "annual";
export type LengthBand = "short" | "medium" | "long";

/** Commercial plan a Zetro admin assigns to a workspace. New workspaces start on trial. */
export type BillingPlan = "trial" | "monthly" | "annual" | "paused";
export const BILLING_PLANS: BillingPlan[] = ["trial", "monthly", "annual", "paused"];
export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = {
  trial: "Free trial",
  monthly: "Billed monthly",
  annual: "Billed annually",
  paused: "Paused",
};

export function isBillingPlan(value: unknown): value is BillingPlan {
  return typeof value === "string" && (BILLING_PLANS as string[]).includes(value);
}

export const LENGTH_BANDS: { id: LengthBand; label: string; range: string; maxMinutes: number }[] = [
  { id: "short", label: "Short", range: "Up to 5 min", maxMinutes: 5 },
  { id: "medium", label: "Medium", range: "5–10 min", maxMinutes: 10 },
  { id: "long", label: "Long", range: "10–15 min", maxMinutes: 15 },
];

export type VolumeTier = {
  id: string;
  label: string;
  maxCalls: number;
  prices: Record<LengthBand, number>;
};

export const VOLUME_TIERS: VolumeTier[] = [
  { id: "up-to-10k", label: "Up to 10,000", maxCalls: 10_000, prices: { short: 175, medium: 280, long: 420 } },
  { id: "10k-30k", label: "10,001 – 30,000", maxCalls: 30_000, prices: { short: 165, medium: 265, long: 395 } },
  { id: "30k-100k", label: "30,001 – 100,000", maxCalls: LARGE_VOLUME_CALLS, prices: { short: 160, medium: 250, long: 370 } },
];

export function isBillingCycle(value: string | null | undefined): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

export function bandForMinutes(minutes: number): LengthBand {
  const band = LENGTH_BANDS.find((row) => minutes <= row.maxMinutes);
  return band ? band.id : "long";
}

export function tierForCalls(calls: number): VolumeTier {
  return VOLUME_TIERS.find((tier) => calls <= tier.maxCalls) ?? VOLUME_TIERS[VOLUME_TIERS.length - 1];
}

export function pricePerCall(tier: VolumeTier, band: LengthBand, cycle: BillingCycle) {
  const list = tier.prices[band];
  return cycle === "annual" ? Math.round(list * (1 - ANNUAL_DISCOUNT)) : list;
}

export type PriceQuote = {
  cycle: BillingCycle;
  callsPerMonth: number;
  talkMinutes: number;
  band: LengthBand;
  tier: VolumeTier;
  pricePerCallTzs: number;
  usageTzs: number;
  monthlyTzs: number;
  minimumApplied: boolean;
  setupTzs: number;
  /** What one invoice says: one month on monthly billing, twelve months on annual. */
  invoiceTzs: number;
  firstYearTzs: number;
  vatPerMonthTzs: number;
  overLength: boolean;
  largeVolume: boolean;
};

export function quotePrice(input: {
  callsPerMonth: number;
  talkMinutes: number;
  cycle: BillingCycle;
}): PriceQuote {
  const callsPerMonth = Math.min(
    MAX_CALLS_PER_MONTH,
    Math.max(0, Math.round(Number.isFinite(input.callsPerMonth) ? input.callsPerMonth : 0)),
  );
  const talkMinutes = Math.max(0, Number.isFinite(input.talkMinutes) ? input.talkMinutes : DEFAULT_TALK_MINUTES);
  const band = bandForMinutes(talkMinutes);
  const tier = tierForCalls(callsPerMonth);
  const pricePerCallTzs = pricePerCall(tier, band, input.cycle);
  const usageTzs = callsPerMonth * pricePerCallTzs;
  const monthlyTzs = Math.max(MONTHLY_MINIMUM_TZS, usageTzs);
  const setupTzs = input.cycle === "annual" ? 0 : SETUP_FEE_TZS;
  return {
    cycle: input.cycle,
    callsPerMonth,
    talkMinutes,
    band,
    tier,
    pricePerCallTzs,
    usageTzs,
    monthlyTzs,
    minimumApplied: usageTzs < MONTHLY_MINIMUM_TZS,
    setupTzs,
    invoiceTzs: input.cycle === "annual" ? monthlyTzs * 12 : monthlyTzs,
    firstYearTzs: monthlyTzs * 12 + setupTzs,
    vatPerMonthTzs: Math.round(monthlyTzs * VAT_RATE),
    overLength: talkMinutes > MAX_TALK_MINUTES,
    largeVolume: callsPerMonth > LARGE_VOLUME_CALLS,
  };
}

export type BandCounts = Record<LengthBand, number>;

export function emptyBandCounts(): BandCounts {
  return { short: 0, medium: 0, long: 0 };
}

export type InvoiceEstimate = {
  cycle: BillingCycle;
  tier: VolumeTier;
  firstCalls: number;
  rescoreCalls: number;
  firstTzs: number;
  rescoreTzs: number;
  usageTzs: number;
  totalTzs: number;
  minimumApplied: boolean;
};

/**
 * This month's invoice from actual scores. The volume level comes from the contract commitment
 * when set (calls above it keep the same rate); re-scores are half the call price.
 */
export function estimateInvoice(input: {
  plan: BillingPlan;
  committedCalls: number | null;
  first: BandCounts;
  rescore: BandCounts;
}): InvoiceEstimate | null {
  if (input.plan !== "monthly" && input.plan !== "annual") return null;
  const cycle: BillingCycle = input.plan;
  const firstCalls = input.first.short + input.first.medium + input.first.long;
  const rescoreCalls = input.rescore.short + input.rescore.medium + input.rescore.long;
  const tier = tierForCalls(input.committedCalls ?? firstCalls);
  let firstTzs = 0;
  let rescoreTzs = 0;
  for (const band of LENGTH_BANDS) {
    const price = pricePerCall(tier, band.id, cycle);
    firstTzs += input.first[band.id] * price;
    rescoreTzs += input.rescore[band.id] * Math.round(price / 2);
  }
  const usageTzs = firstTzs + rescoreTzs;
  return {
    cycle,
    tier,
    firstCalls,
    rescoreCalls,
    firstTzs,
    rescoreTzs,
    usageTzs,
    totalTzs: Math.max(MONTHLY_MINIMUM_TZS, usageTzs),
    minimumApplied: usageTzs < MONTHLY_MINIMUM_TZS,
  };
}

export function bandLabel(band: LengthBand) {
  const row = LENGTH_BANDS.find((item) => item.id === band);
  return row ? `${row.label} (${row.range.toLowerCase()})` : band;
}

export function tzsToUsd(tzs: number) {
  return tzs / TZS_PER_USD;
}

export function formatTzs(amount: number) {
  return `${Math.round(amount).toLocaleString("en-US")} TZS`;
}

export function formatUsd(amount: number) {
  const abs = Math.abs(amount);
  const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : 3;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** Reference conversion only. Invoices are in TZS. */
export function formatUsdFromTzs(tzs: number) {
  return `≈ ${formatUsd(tzsToUsd(tzs))}`;
}
