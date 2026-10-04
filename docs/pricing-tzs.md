# Zetro price list — Tanzania (TZS)

Live on the pricing page (`src/lib/billing.ts`). The "Over 100,000" level is shown as "priced in your contract" until the cost cut is live. Sold in Tanzania only for now (the site blocks other countries).

Unit of sale: **one scored call**, priced by that call's recorded length, with a small discount for monthly volume.

**All prices exclude VAT. VAT (18%) is added on the invoice.**

---

## 1. Price per scored call (excluding VAT)

| Scored calls per month | Short (up to 5 min) | Medium (5–10 min) | Long (10–15 min) |
|---|---|---|---|
| Up to 10,000 | **175 TZS** | **280 TZS** | **420 TZS** |
| 10,001 – 30,000 | 165 TZS | 265 TZS | 395 TZS |
| 30,001 – 100,000 | 160 TZS | 250 TZS | 370 TZS |
| Over 100,000 | 155 TZS | 240 TZS | 350 TZS |

Volume discounts are small on purpose. Our cost per call does not fall with volume: AI and transcription providers charge the same per call, so big discounts would give away margin.

---

## 2. One-time and monthly charges

| Charge | Amount (excluding VAT) | What it covers |
|---|---|---|
| Setup and calibration | **100,000 TZS, once** | Loading the customer's scorecard, compliance files and scripts; scoring 20 calls with their QA lead and adjusting until marks agree. **Waived on a 12-month contract.** |
| Monthly minimum | **500,000 TZS** | Support, hosting share, and small accounts. If the calls cost less than this, the invoice is the minimum. |
| Re-scoring a call | Half the call price | For example, after the customer changes their scorecard. |
| Audio storage beyond 90 days | Quoted | 90 days of recordings are included. |

### Monthly or annual billing

| | Billed monthly | Billed annually |
|---|---|---|
| Contract | Month to month | 12 months |
| Invoice | Each month, for the calls scored | Once a year, for 12 months of the committed volume. Calls above the commitment are invoiced monthly at the same rate. |
| Price per call | Table above | **10% off** the table, rounded to the nearest shilling (for example 175 → 158 TZS) |
| Setup and calibration | 100,000 TZS once | **Waived** |
| Monthly minimum | 500,000 TZS | 500,000 TZS (not discounted) |

With the 10% discount, margin is still about 37–50% at typical call lengths (today's cost), and about 29% in the worst case (calls at the top of their band, 30,001 – 100,000 level, before the cost cut).

**Payment:** there is no online checkout. Contracts, invoices and deals go through Clevermargininc@gmail.com. The website only shows estimates.

---

## 3. Rules

1. **Each call is billed by its own recorded length.** Zetro measures the audio, so the customer never pays for wrap-up time that is not in the recording.
2. **The volume level is set by the monthly commitment in the contract.** Calls above the commitment are billed at the same rate. (This stops 10,001 calls from costing less than 10,000.)
3. **Only scored calls are billed.** Failed or unscored uploads are free.
4. **Calls over 15 minutes are quoted separately** until long-call scoring is fixed.
5. **Free trial: 50 calls** on the customer's own scorecard, one trial per company.
6. **Invoices are monthly, in TZS, payable within 30 days.** Late invoices pause new scoring after 15 days' notice.
7. **Prices are reviewed every 6 months**, or sooner if the shilling moves more than 10% against the US dollar, or if an AI provider changes its prices.
8. **The "Over 100,000" level is offered only after the cost cut is live** (see section 7).

---

## 4. How the customer estimates the bill

```
Monthly bill = scored calls per month × price for their length band   (+ 18% VAT)
```

Use **average talk time**, not AHT. AHT includes after-call work, which is not in the recording.

---

## 5. Worked examples (excluding VAT)

### Example 1 — Replacing part of a human QA team
- 20,000 calls per month, about 4 minutes each
- 20,000 × 165 TZS = **3,300,000 TZS per month**
- Human QA team today: 5,000,000 TZS in salaries → **saves about 1,700,000 TZS (34%)**
- The real saving is larger: the employer also pays about 14% on top of salaries (NSSF, SDL, WCF), plus desks, headsets, leave cover and supervision. That makes the true team cost about 5,700,000 TZS or more, so the real saving is about 2,400,000 TZS (42%).

### Example 2 — Small floor
- 5,000 calls per month, about 3 minutes each
- 5,000 × 175 TZS = **875,000 TZS per month**

### Example 3 — Bank with longer calls
- 15,000 calls per month, about 7 minutes each
- 15,000 × 265 TZS = **3,975,000 TZS per month**

### Example 4 — Large floor (about 500 agents)
- 5 scored calls per agent per day → 55,000 calls per month, about 3 minutes each
- 55,000 × 160 TZS = **8,800,000 TZS per month**

---

## 6. Our full cost (internal — do not show customers)

Exchange rate used: about 2,600 TZS = 1 USD.

### 6.1 Every cost, including the easy-to-forget ones

**Per call (grows with every call we score)**

| Cost | How we count it |
|---|---|
| Speech-to-text (AssemblyAI) plus transcript repair | about 10.4 TZS per minute of audio |
| Scoring (OpenAI `gpt-4o-mini`) | about 31 TZS per call today, about 18 TZS after the cost cut |
| Failed calls and AI retries | +5% on AI cost (we pay even when the customer does not) |
| Currency conversion | +3% on AI cost (we earn TZS but pay providers in USD) |
| Hosting per call (servers, database, audio storage, bandwidth) | about 8 TZS per call |

**Taken off each invoice**

| Cost | How we count it |
|---|---|
| Bank and transfer fees | about 1% of the invoice |
| Late payment and unpaid invoices | about 2% of the invoice |

**Fixed each month (paid whether we have 1 customer or 50)**

| Cost | Rough amount |
|---|---|
| Hosting base plans (Vercel, Supabase), domain, email sending, monitoring | about 300,000 – 500,000 TZS per month in total |
| Support time (answering customers, fixing scorecard issues) | Staff time — covered by the monthly minimum |

**Per new customer**

| Cost | How it is recovered |
|---|---|
| Setup and calibration (1–3 days of work) | 100,000 TZS setup fee, or earned back over a 12-month contract |
| Free trial (50 calls) | about 4,300 TZS — sales cost |

**Cash flow, not cost**

| Item | Note |
|---|---|
| VAT (18%) | Collected from the customer and paid to TRA. Not our money. Prices must always be quoted excluding VAT. |
| Withholding tax | Some customers may keep back a percentage of each invoice as withholding tax. It can usually be claimed back against our income tax, but it delays cash. Confirm the rate with our accountant. |

### 6.2 Full cost per call

Formula: (AI cost × 1.08) + 8 TZS hosting.

| Band | Typical length | Full cost today | Full cost after cut | Worst case in band (after cut) |
|---|---|---|---|---|
| Short | 4 min | ~86 TZS | ~72 TZS | 5 min: ~84 TZS |
| Medium | 7 min | ~120 TZS | ~106 TZS | 10 min: ~140 TZS |
| Long | 12 min | ~176 TZS | ~162 TZS | 15 min: ~196 TZS |

### 6.3 Margin per call at typical length (after bank fees and unpaid invoices)

Shown as **today → after the cost cut**.

| Scored calls per month | Short (4 min) | Medium (7 min) | Long (12 min) |
|---|---|---|---|
| Up to 10,000 | 48% → 56% | 54% → 59% | 55% → 58% |
| 10,001 – 30,000 | 45% → 53% | 52% → 57% | 52% → 56% |
| 30,001 – 100,000 | 43% → 52% | 49% → 55% | 49% → 53% |
| Over 100,000 | 42% → 51% | 47% → 53% | 47% → 51% |

Worst case (calls at the top of their band, "Over 100,000" level, after the cut): short about 43%, medium about 39%, long about 41%.

### 6.4 Margin in the worked examples

| Example | Monthly bill | Full cost today | Profit today | Margin today | Margin after cut |
|---|---|---|---|---|---|
| 1 — 20,000 calls, 4 min | 3,300,000 TZS | ~1,820,000 TZS | ~1,480,000 TZS | ~45% | ~53% |
| 2 — 5,000 calls, 3 min | 875,000 TZS | ~400,000 TZS | ~475,000 TZS | ~54% | ~62% |
| 3 — 15,000 calls, 7 min | 3,975,000 TZS | ~1,920,000 TZS | ~2,055,000 TZS | ~52% | ~57% |
| 4 — 55,000 calls, 3 min | 8,800,000 TZS | ~4,390,000 TZS | ~4,410,000 TZS | ~50% | ~59% |

"Full cost" here includes bank fees and unpaid invoices. It does not include the fixed monthly costs in 6.1, which are shared across all customers.

### 6.5 Price against a human QA team

Based on a 5,000,000 TZS team scoring 20,000 calls of about 4 minutes (250 TZS per call, salaries only). Human cost grows with call length because a person listens to the whole call.

| Band | Human cost per call | Our price | How much cheaper |
|---|---|---|---|
| Short (4 min) | ~250 TZS | 155 – 175 TZS | 30% – 38% |
| Medium (7 min) | ~440 TZS | 240 – 280 TZS | 36% – 45% |
| Long (12 min) | ~750 TZS | 350 – 420 TZS | 44% – 53% |

---

## 7. What this price list depends on

1. **Scoring stays on `gpt-4o-mini`.** A more expensive model would raise our cost above these prices.
2. **The cost cut:** stop re-reading the scorecard and compliance files on every call. Required before we sell the "Over 100,000" level.
3. **Monthly cost check:** (OpenAI bill + AssemblyAI bill + hosting bill) ÷ calls scored. If a short call costs more than about 95 TZS fully loaded, review prices.
4. **Cost figures are estimates** from public provider prices, not from our invoices. Confirm them against real bills before signing a large contract.
5. **The fixed monthly costs need enough customers.** About 300,000 – 500,000 TZS a month of fixed costs is covered once we have 2–3 paying customers above the minimum.

---

## 8. Other markets (USD)

For Kenya, BPOs serving foreign clients, and customers outside East Africa. Same rules, volume levels and charges. Prices exclude VAT or sales tax.

| Short (up to 5 min) | Medium (5–10 min) | Long (10–15 min) | Setup and calibration |
|---|---|---|---|
| $0.12 | $0.20 | $0.30 | $300 once (waived on 12 months) |
