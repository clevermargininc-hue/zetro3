/** Tanzania commercial tariff. All values are integer TZS and exclude VAT. */
export const TZS_PER_USD = 2_600;
export const VAT_RATE = 0.18;
export const MONTHLY_MINIMUM_TZS = 500_000;
export const SETUP_FEE_TZS = 750_000;
export const ANNUAL_DISCOUNT = 0.1;
export const TRIAL_CALLS = 50;
export const AUDIO_DAYS_INCLUDED = 90;
export const MAX_TALK_MINUTES = 15;
export const LARGE_VOLUME_CALLS = 100_000;
export const MAX_CALLS_PER_MONTH = 1_000_000;
export const DEFAULT_CALLS_PER_MONTH = 20_000;
export const DEFAULT_TALK_MINUTES = 4;
export const HIGH_VOLUME_PRICING_ENABLED = process.env.NEXT_PUBLIC_HIGH_VOLUME_PRICING_ENABLED === "true";
export const BILLING_HONESTY = "There is no online checkout. Clevermargininc@gmail.com handles contracts and invoices in TZS — the app never charges your card.";

export type BillingCycle = "monthly" | "annual";
export type BillingPlan = "trial" | "monthly" | "annual" | "paused";
export const BILLING_PLANS: BillingPlan[] = ["trial", "monthly", "annual", "paused"];
export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = { trial: "Free trial", monthly: "Billed monthly", annual: "Billed annually", paused: "Paused" };
export function isBillingPlan(value: unknown): value is BillingPlan { return typeof value === "string" && (BILLING_PLANS as string[]).includes(value); }
export function isBillingCycle(value: string | null | undefined): value is BillingCycle { return value === "monthly" || value === "annual"; }

export type LengthBand = "upTo3" | "upTo6" | "upTo9" | "upTo12" | "upTo15";
export const LENGTH_BANDS: { id: LengthBand; label: string; range: string; maxSeconds: number; maxMinutes: number }[] = [
  { id: "upTo3", label: "0–3 min", range: ">0–180 sec", maxSeconds: 180, maxMinutes: 3 },
  { id: "upTo6", label: ">3–6 min", range: "181–360 sec", maxSeconds: 360, maxMinutes: 6 },
  { id: "upTo9", label: ">6–9 min", range: "361–540 sec", maxSeconds: 540, maxMinutes: 9 },
  { id: "upTo12", label: ">9–12 min", range: "541–720 sec", maxSeconds: 720, maxMinutes: 12 },
  { id: "upTo15", label: ">12–15 min", range: "721–900 sec", maxSeconds: 900, maxMinutes: 15 },
];
export type VolumeTier = { id: string; label: string; minCalls: number; maxCalls: number; conditional?: boolean; prices: Record<LengthBand, number> };
export const VOLUME_TIERS: VolumeTier[] = [
  { id: "0-1000", label: "0–1,000", minCalls: 0, maxCalls: 1_000, prices: { upTo3: 150, upTo6: 210, upTo9: 270, upTo12: 355, upTo15: 440 } },
  { id: "1001-5000", label: "1,001–5,000", minCalls: 1_001, maxCalls: 5_000, prices: { upTo3: 145, upTo6: 205, upTo9: 260, upTo12: 345, upTo15: 430 } },
  { id: "5001-10000", label: "5,001–10,000", minCalls: 5_001, maxCalls: 10_000, prices: { upTo3: 140, upTo6: 195, upTo9: 250, upTo12: 335, upTo15: 420 } },
  { id: "10001-30000", label: "10,001–30,000", minCalls: 10_001, maxCalls: 30_000, prices: { upTo3: 135, upTo6: 185, upTo9: 240, upTo12: 315, upTo15: 395 } },
  { id: "30001-100000", label: "30,001–100,000", minCalls: 30_001, maxCalls: 100_000, prices: { upTo3: 130, upTo6: 180, upTo9: 225, upTo12: 295, upTo15: 370 } },
  { id: "over-100000", label: "Over 100,000", minCalls: 100_001, maxCalls: Number.POSITIVE_INFINITY, conditional: true, prices: { upTo3: 125, upTo6: 175, upTo9: 215, upTo12: 280, upTo15: 350 } },
];

export type BandCounts = Record<LengthBand, number>;
export function emptyBandCounts(): BandCounts { return { upTo3: 0, upTo6: 0, upTo9: 0, upTo12: 0, upTo15: 0 }; }
export function totalBandCalls(counts: BandCounts) { return LENGTH_BANDS.reduce((sum, band) => sum + Math.max(0, Math.trunc(counts[band.id] || 0)), 0); }
export function bandForDurationSeconds(seconds: number | null | undefined): LengthBand | "over" | null {
  if (!Number.isFinite(seconds) || Number(seconds) <= 0) return null;
  return LENGTH_BANDS.find((row) => Number(seconds) <= row.maxSeconds)?.id ?? "over";
}
export function bandForMinutes(minutes: number): LengthBand { const band = bandForDurationSeconds(minutes * 60); return band && band !== "over" ? band : "upTo15"; }
export function tierForCalls(contractedCalls: number): VolumeTier { const calls = Math.max(0, Math.trunc(contractedCalls || 0)); return VOLUME_TIERS.find((tier) => calls <= tier.maxCalls) ?? VOLUME_TIERS[VOLUME_TIERS.length - 1]; }
export function roundHalfUp(numerator: number, denominator: number) { return Math.floor((numerator + denominator / 2) / denominator); }
export function pricePerCall(tier: VolumeTier, band: LengthBand, cycle: BillingCycle): number | null { if (tier.conditional && !HIGH_VOLUME_PRICING_ENABLED) return null; const list = tier.prices[band]; return cycle === "annual" ? roundHalfUp(list * 9, 10) : list; }
export function rescorePrice(originalPrice: number) { return roundHalfUp(originalPrice, 2); }

export type MixedPriceQuote = { cycle: BillingCycle; contractedCalls: number; tier: VolumeTier; bandCounts: BandCounts; rates: Record<LengthBand, number | null>; usageTzs: number | null; recurringMonthlyTzs: number | null; minimumAdjustmentTzs: number | null; minimumApplied: boolean; setupTzs: number; monthlySubtotalExVatTzs: number | null; monthlyVatTzs: number | null; monthlyTotalTzs: number | null; annualUpfrontExVatTzs: number | null; annualUpfrontVatTzs: number | null; annualUpfrontTotalTzs: number | null; requiresContactSales: boolean };
export function quoteMixedUsage(input: { contractedCalls: number; bandCounts: BandCounts; cycle: BillingCycle; vatRate?: number }): MixedPriceQuote {
  const contractedCalls = Math.min(MAX_CALLS_PER_MONTH, Math.max(0, Math.trunc(Number.isFinite(input.contractedCalls) ? input.contractedCalls : 0)));
  const tier = tierForCalls(contractedCalls);
  const rates = Object.fromEntries(LENGTH_BANDS.map((band) => [band.id, pricePerCall(tier, band.id, input.cycle)])) as Record<LengthBand, number | null>;
  const requiresContactSales = Object.values(rates).some((rate) => rate === null);
  const setupTzs = input.cycle === "annual" ? 0 : SETUP_FEE_TZS;
  const empty = { cycle: input.cycle, contractedCalls, tier, bandCounts: input.bandCounts, rates, setupTzs, requiresContactSales };
  if (requiresContactSales) return { ...empty, usageTzs: null, recurringMonthlyTzs: null, minimumAdjustmentTzs: null, minimumApplied: false, monthlySubtotalExVatTzs: null, monthlyVatTzs: null, monthlyTotalTzs: null, annualUpfrontExVatTzs: null, annualUpfrontVatTzs: null, annualUpfrontTotalTzs: null };
  const usageTzs = LENGTH_BANDS.reduce((sum, band) => sum + Math.max(0, Math.trunc(input.bandCounts[band.id] || 0)) * (rates[band.id] || 0), 0);
  const recurringMonthlyTzs = Math.max(MONTHLY_MINIMUM_TZS, usageTzs);
  const minimumAdjustmentTzs = recurringMonthlyTzs - usageTzs;
  const vatRate = input.vatRate ?? VAT_RATE;
  const monthlySubtotalExVatTzs = recurringMonthlyTzs + setupTzs;
  const monthlyVatTzs = roundHalfUp(monthlySubtotalExVatTzs * Math.round(vatRate * 100), 100);
  const annualUpfrontExVatTzs = recurringMonthlyTzs * 12;
  const annualUpfrontVatTzs = roundHalfUp(annualUpfrontExVatTzs * Math.round(vatRate * 100), 100);
  return { ...empty, usageTzs, recurringMonthlyTzs, minimumAdjustmentTzs, minimumApplied: minimumAdjustmentTzs > 0, monthlySubtotalExVatTzs, monthlyVatTzs, monthlyTotalTzs: monthlySubtotalExVatTzs + monthlyVatTzs, annualUpfrontExVatTzs, annualUpfrontVatTzs, annualUpfrontTotalTzs: annualUpfrontExVatTzs + annualUpfrontVatTzs };
}

export function quotePrice(input: { callsPerMonth: number; talkMinutes: number; cycle: BillingCycle }) { const bandResult = bandForDurationSeconds(input.talkMinutes * 60); const counts = emptyBandCounts(); if (bandResult && bandResult !== "over") counts[bandResult] = Math.max(0, Math.trunc(input.callsPerMonth)); const mixed = quoteMixedUsage({ contractedCalls: input.callsPerMonth, bandCounts: counts, cycle: input.cycle }); const band = bandResult && bandResult !== "over" ? bandResult : "upTo15"; const rate = mixed.rates[band]; return { ...mixed, callsPerMonth: mixed.contractedCalls, talkMinutes: input.talkMinutes, band, pricePerCallTzs: rate ?? 0, usageTzs: mixed.usageTzs ?? 0, monthlyTzs: mixed.recurringMonthlyTzs ?? 0, minimumApplied: mixed.minimumApplied, setupTzs: mixed.setupTzs, invoiceTzs: input.cycle === "annual" ? mixed.annualUpfrontExVatTzs ?? 0 : mixed.monthlySubtotalExVatTzs ?? 0, firstYearTzs: (mixed.recurringMonthlyTzs ?? 0) * 12 + mixed.setupTzs, vatPerMonthTzs: mixed.monthlyVatTzs ?? 0, overLength: bandResult === "over", largeVolume: mixed.requiresContactSales }; }

export type InvoiceEstimate = { cycle: BillingCycle; tier: VolumeTier; firstCalls: number; rescoreCalls: number; firstTzs: number; rescoreTzs: number; usageTzs: number; totalTzs: number; minimumApplied: boolean; requiresContactSales: boolean };
export function estimateInvoice(input: { plan: BillingPlan; committedCalls: number | null; first: BandCounts; rescore: BandCounts }): InvoiceEstimate | null { if (input.plan !== "monthly" && input.plan !== "annual") return null; const cycle = input.plan; const firstCalls = totalBandCalls(input.first); const rescoreCalls = totalBandCalls(input.rescore); const tier = tierForCalls(input.committedCalls ?? firstCalls); let firstTzs = 0; let rescoreTzs = 0; for (const band of LENGTH_BANDS) { const price = pricePerCall(tier, band.id, cycle); if (price === null) return { cycle, tier, firstCalls, rescoreCalls, firstTzs: 0, rescoreTzs: 0, usageTzs: 0, totalTzs: 0, minimumApplied: false, requiresContactSales: true }; firstTzs += input.first[band.id] * price; rescoreTzs += input.rescore[band.id] * rescorePrice(price); } const usageTzs = firstTzs + rescoreTzs; return { cycle, tier, firstCalls, rescoreCalls, firstTzs, rescoreTzs, usageTzs, totalTzs: Math.max(MONTHLY_MINIMUM_TZS, usageTzs), minimumApplied: usageTzs < MONTHLY_MINIMUM_TZS, requiresContactSales: false }; }

export function bandLabel(band: LengthBand) { const row = LENGTH_BANDS.find((item) => item.id === band); return row ? `${row.label} (${row.range})` : band; }
export function tzsToUsd(tzs: number) { return tzs / TZS_PER_USD; }
export function formatTzs(amount: number) { return `TZS ${Math.round(amount).toLocaleString("en-US")}`; }
export function formatUsd(amount: number) { const abs = Math.abs(amount); const digits = abs >= 100 ? 0 : abs >= 1 ? 2 : 3; return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount); }
export function formatUsdFromTzs(tzs: number) { return `≈ ${formatUsd(tzsToUsd(tzs))}`; }
