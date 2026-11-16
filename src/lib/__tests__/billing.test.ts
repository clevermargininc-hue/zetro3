import test from "node:test";
import assert from "node:assert/strict";
import { bandForDurationSeconds, emptyBandCounts, estimateInvoice, pricePerCall, quoteMixedUsage, tierForCalls } from "@/lib/billing";

test("uses exact duration boundaries and rejects unchargeable durations", () => {
  assert.equal(bandForDurationSeconds(0), null);
  assert.equal(bandForDurationSeconds(180), "upTo3");
  assert.equal(bandForDurationSeconds(181), "upTo6");
  assert.equal(bandForDurationSeconds(360), "upTo6");
  assert.equal(bandForDurationSeconds(361), "upTo9");
  assert.equal(bandForDurationSeconds(540), "upTo9");
  assert.equal(bandForDurationSeconds(541), "upTo12");
  assert.equal(bandForDurationSeconds(720), "upTo12");
  assert.equal(bandForDurationSeconds(721), "upTo15");
  assert.equal(bandForDurationSeconds(900), "upTo15");
  assert.equal(bandForDurationSeconds(901), "over");
});

test("selects tiers from contracted volume boundaries", () => {
  assert.equal(tierForCalls(0).id, "0-1000"); assert.equal(tierForCalls(1_000).id, "0-1000");
  assert.equal(tierForCalls(1_001).id, "1001-5000"); assert.equal(tierForCalls(5_001).id, "5001-10000");
  assert.equal(tierForCalls(10_001).id, "10001-30000"); assert.equal(tierForCalls(30_001).id, "30001-100000");
  assert.equal(tierForCalls(100_001).id, "over-100000");
});

test("matches standard monthly reference cases", () => {
  const cases: Array<[number, keyof ReturnType<typeof emptyBandCounts>, number, number]> = [[20_000,"upTo6",20_000,3_700_000],[5_000,"upTo3",5_000,725_000],[15_000,"upTo9",15_000,3_600_000],[55_000,"upTo3",55_000,7_150_000]];
  for (const [contracted,band,calls,expected] of cases) { const counts=emptyBandCounts(); counts[band]=calls; assert.equal(quoteMixedUsage({contractedCalls:contracted,bandCounts:counts,cycle:"monthly"}).usageTzs,expected); }
});

test("sums mixed bands, applies the floor, and keeps contracted overage tier", () => {
  const counts={...emptyBandCounts(),upTo3:2_000,upTo6:4_000};
  const quote=quoteMixedUsage({contractedCalls:5_000,bandCounts:counts,cycle:"monthly"});
  assert.equal(quote.usageTzs,2_000*145+4_000*205);
  assert.equal(quote.tier.id,"1001-5000");
  assert.equal(quote.minimumAdjustmentTzs,0);
  const zero=quoteMixedUsage({contractedCalls:1_000,bandCounts:emptyBandCounts(),cycle:"monthly"});
  assert.equal(zero.recurringMonthlyTzs,500_000); assert.equal(zero.minimumAdjustmentTzs,500_000);
});

test("annual rates use half-up integer rounding and minimum remains undiscounted", () => {
  const tier=tierForCalls(1_000);
  assert.equal(pricePerCall(tier,"upTo3","annual"),135);
  assert.equal(pricePerCall(tier,"upTo12","annual"),320);
  const quote=quoteMixedUsage({contractedCalls:1_000,bandCounts:emptyBandCounts(),cycle:"annual"});
  assert.equal(quote.recurringMonthlyTzs,500_000); assert.equal(quote.setupTzs,0); assert.equal(quote.annualUpfrontExVatTzs,6_000_000);
});

test("high volume requires sales while disabled and re-scores retain contracted tier", () => {
  const counts={...emptyBandCounts(),upTo3:100_001};
  assert.equal(quoteMixedUsage({contractedCalls:100_001,bandCounts:counts,cycle:"monthly"}).requiresContactSales,true);
  const invoice=estimateInvoice({plan:"monthly",committedCalls:20_000,first:{...emptyBandCounts(),upTo6:1},rescore:{...emptyBandCounts(),upTo6:1}});
  assert.equal(invoice?.firstTzs,185); assert.equal(invoice?.rescoreTzs,93);
});
