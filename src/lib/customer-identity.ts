/**
 * Phase 2: Customer Identity Matching & Country-Aware Phone Normalization
 *
 * Priority order for matching calls to customers:
 *  1. customer_id (Explicit Customer ID)
 *  2. msisdn (Normalized E.164 Phone Number / MSISDN)
 *  3. crm_id / account_number (Approved CRM or billing identifier)
 *  4. High-confidence extracted identifier from filename/transcript
 *
 * Never automatically merges two distinct customer profiles on a weak or uncertain match.
 */

export type IdentifierType =
  | "customer_id"
  | "msisdn"
  | "crm_id"
  | "account_number"
  | "extracted_phone"
  | "extracted_id";

export type IdentifierSource = "metadata" | "filename" | "transcript" | "manual";

export interface NormalizedPhoneResult {
  valid: boolean;
  e164: string | null;
  countryCode: string | null;
  nationalNumber: string | null;
  raw: string;
  confidence: number;
  reason?: string;
}

export interface CandidateIdentifier {
  idType: IdentifierType;
  rawValue: string;
  normalizedValue: string;
  countryCode: string | null;
  source: IdentifierSource;
  confidence: number;
  priority: number; // 1 = highest (customer_id), 2 = msisdn, 3 = crm_id/account_number, 4 = extracted
}

export interface ExistingCustomerProfile {
  id: string;
  workspace_id: string | null;
  user_id: string;
  primary_identifier: string;
  display_label: string;
  normalized_phone: string | null;
  external_customer_id: string | null;
  crm_id?: string | null;
  country_code?: string | null;
  identifiers?: Array<{
    id_type: IdentifierType;
    normalized_value: string;
    raw_value: string;
    confidence: number;
    verified_by_human?: boolean;
  }>;
}

export interface IdentityMatchDecision {
  matchedCustomer: ExistingCustomerProfile | null;
  matchedBy: CandidateIdentifier | null;
  confidence: number;
  needsIdentityReview: boolean;
  conflictDetected: boolean;
  explanation: string;
  candidateIdentifiers: CandidateIdentifier[];
}

interface CountryDialingRule {
  iso2: string;
  callingCode: string;
  /** Valid subscriber number lengths (excluding trunk '0' and country code) */
  nsnLengths: number[];
  /** Valid leading digits of the national significant number */
  validPrefixes?: RegExp;
}

/**
 * Country-aware dialing rules covering East/Sub-Saharan Africa (Airtel markets)
 * and major international countries.
 */
const COUNTRY_RULES: CountryDialingRule[] = [
  { iso2: "TZ", callingCode: "255", nsnLengths: [9], validPrefixes: /^[6782]/ },
  { iso2: "KE", callingCode: "254", nsnLengths: [9], validPrefixes: /^[172]/ },
  { iso2: "UG", callingCode: "256", nsnLengths: [9], validPrefixes: /^[732]/ },
  { iso2: "RW", callingCode: "250", nsnLengths: [9], validPrefixes: /^[72]/ },
  { iso2: "BI", callingCode: "257", nsnLengths: [8], validPrefixes: /^[672]/ },
  { iso2: "CD", callingCode: "243", nsnLengths: [9], validPrefixes: /^[89]/ },
  { iso2: "ZM", callingCode: "260", nsnLengths: [9], validPrefixes: /^[792]/ },
  { iso2: "MW", callingCode: "265", nsnLengths: [9], validPrefixes: /^[891]/ },
  { iso2: "MG", callingCode: "261", nsnLengths: [9], validPrefixes: /^[32]/ },
  { iso2: "NG", callingCode: "234", nsnLengths: [10], validPrefixes: /^[789]/ },
  { iso2: "ZA", callingCode: "27", nsnLengths: [9], validPrefixes: /^[67812345]/ },
  { iso2: "GH", callingCode: "233", nsnLengths: [9], validPrefixes: /^[253]/ },
  { iso2: "TD", callingCode: "235", nsnLengths: [8], validPrefixes: /^[692]/ },
  { iso2: "NE", callingCode: "227", nsnLengths: [8], validPrefixes: /^[892]/ },
  { iso2: "CG", callingCode: "242", nsnLengths: [9], validPrefixes: /^[0456]/ },
  { iso2: "GA", callingCode: "241", nsnLengths: [7, 8] },
  { iso2: "SC", callingCode: "248", nsnLengths: [7] },
  { iso2: "IN", callingCode: "91", nsnLengths: [10], validPrefixes: /^[6789]/ },
  { iso2: "GB", callingCode: "44", nsnLengths: [10], validPrefixes: /^[7123]/ },
  { iso2: "US", callingCode: "1", nsnLengths: [10], validPrefixes: /^[2-9]/ },
];

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  tanzania: "TZ",
  tz: "TZ",
  kenya: "KE",
  ke: "KE",
  uganda: "UG",
  ug: "UG",
  rwanda: "RW",
  rw: "RW",
  burundi: "BI",
  bi: "BI",
  drc: "CD",
  "democratic republic of the congo": "CD",
  cd: "CD",
  zambia: "ZM",
  zm: "ZM",
  malawi: "MW",
  mw: "MW",
  madagascar: "MG",
  mg: "MG",
  nigeria: "NG",
  ng: "NG",
  "south africa": "ZA",
  za: "ZA",
  ghana: "GH",
  gh: "GH",
  india: "IN",
  in: "IN",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  "united states": "US",
  usa: "US",
  us: "US",
};

export function resolveCountryIso(countryHint?: string | null): string {
  if (!countryHint) return "TZ";
  const cleaned = countryHint.trim().toLowerCase();
  if (COUNTRY_NAME_TO_ISO[cleaned]) return COUNTRY_NAME_TO_ISO[cleaned];
  const upper = cleaned.toUpperCase();
  if (COUNTRY_RULES.some((r) => r.iso2 === upper)) return upper;
  return "TZ";
}

/**
 * Normalizes a phone number / MSISDN into canonical E.164 format (`+<country><nsn>`)
 * using country-aware rules.
 *
 * Examples (defaultCountry = "TZ"):
 *  - "0712345678"       -> "+255712345678"
 *  - "+255712345678"    -> "+255712345678"
 *  - "255712345678"     -> "+255712345678"
 *  - "00255 712 345678" -> "+255712345678"
 *  - "+254722111222"    -> "+254722111222" (KE auto-detected)
 */
export function normalizePhoneNumber(
  rawInput: string | null | undefined,
  defaultCountryHint: string | null | undefined = "TZ",
): NormalizedPhoneResult {
  const raw = String(rawInput ?? "").trim();
  if (!raw) {
    return {
      valid: false,
      e164: null,
      countryCode: null,
      nationalNumber: null,
      raw,
      confidence: 0,
      reason: "Empty phone input",
    };
  }

  // Strip common formatting noise like "(0)" in "+255 (0) 712 345 678"
  const withoutZeroParen = raw.replace(/\(\s*0\s*\)/g, "");
  const hasExplicitPlus = /^\s*\+/.test(withoutZeroParen);
  const digitsOnly = withoutZeroParen.replace(/[^\d]/g, "");

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      valid: false,
      e164: null,
      countryCode: null,
      nationalNumber: null,
      raw,
      confidence: 0,
      reason: "Digit length outside valid E.164 bounds (7-15 digits)",
    };
  }

  // Reject obvious dummy/test sequences like 0000000000 or 1111111111
  if (/^(\d)\1{7,}$/.test(digitsOnly)) {
    return {
      valid: false,
      e164: null,
      countryCode: null,
      nationalNumber: null,
      raw,
      confidence: 0,
      reason: "Repeated single-digit placeholder number",
    };
  }

  // Handle "00" international prefix (e.g. 00255712345678)
  let workingDigits = digitsOnly;
  let explicitIntl = hasExplicitPlus;
  if (!hasExplicitPlus && workingDigits.startsWith("00") && workingDigits.length >= 11) {
    workingDigits = workingDigits.slice(2);
    explicitIntl = true;
  }

  const defaultIso = resolveCountryIso(defaultCountryHint);
  const defaultRule =
    COUNTRY_RULES.find((r) => r.iso2 === defaultIso) || COUNTRY_RULES[0];

  // 1. Check if digits match a known country calling code at the start
  // Sort by longest calling code first (e.g. 255 before 27 or 1)
  const rulesByCodeLen = [...COUNTRY_RULES].sort(
    (a, b) => b.callingCode.length - a.callingCode.length,
  );

  for (const rule of rulesByCodeLen) {
    if (workingDigits.startsWith(rule.callingCode)) {
      let nsn = workingDigits.slice(rule.callingCode.length);
      // Handle accidental trunk 0 after country code (e.g. +2550712345678)
      if (
        nsn.startsWith("0") &&
        rule.nsnLengths.includes(nsn.length - 1)
      ) {
        nsn = nsn.slice(1);
      }
      if (rule.nsnLengths.includes(nsn.length)) {
        if (!rule.validPrefixes || rule.validPrefixes.test(nsn)) {
          return {
            valid: true,
            e164: `+${rule.callingCode}${nsn}`,
            countryCode: rule.iso2,
            nationalNumber: nsn,
            raw,
            confidence: explicitIntl || rule.iso2 === defaultIso ? 0.99 : 0.94,
          };
        }
      }
    }
  }

  // 2. Check national format starting with trunk '0' (e.g. 0712345678 in TZ/KE/UG/RW/ZM/NG/ZA/GB)
  if (!explicitIntl && workingDigits.startsWith("0")) {
    const nsn = workingDigits.slice(1);
    if (
      defaultRule.nsnLengths.includes(nsn.length) &&
      (!defaultRule.validPrefixes || defaultRule.validPrefixes.test(nsn))
    ) {
      return {
        valid: true,
        e164: `+${defaultRule.callingCode}${nsn}`,
        countryCode: defaultRule.iso2,
        nationalNumber: nsn,
        raw,
        confidence: 0.96,
      };
    }

    // Fallback: if the national length matches another East African / Airtel rule clearly
    for (const rule of COUNTRY_RULES) {
      if (
        rule.nsnLengths.includes(nsn.length) &&
        rule.validPrefixes &&
        rule.validPrefixes.test(nsn)
      ) {
        return {
          valid: true,
          e164: `+${rule.callingCode}${nsn}`,
          countryCode: rule.iso2,
          nationalNumber: nsn,
          raw,
          confidence: 0.82,
        };
      }
    }
  }

  // 3. Bare national significant number without leading 0 (e.g. 712345678 in TZ)
  if (
    !explicitIntl &&
    defaultRule.nsnLengths.includes(workingDigits.length) &&
    (!defaultRule.validPrefixes || defaultRule.validPrefixes.test(workingDigits))
  ) {
    return {
      valid: true,
      e164: `+${defaultRule.callingCode}${workingDigits}`,
      countryCode: defaultRule.iso2,
      nationalNumber: workingDigits,
      raw,
      confidence: 0.88,
    };
  }

  // 4. Generic E.164 fallback for explicit international numbers (+<10..15 digits>)
  if (explicitIntl && workingDigits.length >= 10 && workingDigits.length <= 15) {
    return {
      valid: true,
      e164: `+${workingDigits}`,
      countryCode: "INTL",
      nationalNumber: workingDigits,
      raw,
      confidence: 0.9,
    };
  }

  return {
    valid: false,
    e164: null,
    countryCode: null,
    nationalNumber: null,
    raw,
    confidence: 0,
    reason: "Does not match national or international MSISDN rules",
  };
}

/**
 * Normalizes an explicit Customer ID or CRM / Account ID.
 */
export function normalizeCustomerId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
  if (cleaned.length < 3 || cleaned.length > 64) return null;
  // Avoid treating generic words like "UNKNOWN" or "NONE" or "NULL" as IDs
  if (/^(UNKNOWN|NONE|NULL|NA|N-A|TEST|UNDEFINED|CUSTOMER|CALLER)$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Formats an E.164 number for privacy-aware display (e.g., +255712345678 -> +255 712 ••• 678)
 */
export function maskPhoneNumber(e164: string | null | undefined): string {
  if (!e164) return "Unknown caller";
  const clean = e164.trim();
  if (clean.length < 8) return clean;
  const prefix = clean.slice(0, 7);
  const suffix = clean.slice(-3);
  return `${prefix}•••${suffix}`;
}

/**
 * Formats an E.164 number into readable spacing (e.g., +255 712 345 678)
 */
export function formatPhoneReadable(e164: string | null | undefined): string {
  if (!e164) return "—";
  const clean = e164.trim();
  const match = clean.match(/^\+(255|254|256|250|260|265|243|234)(\d{3})(\d{3})(\d{3,4})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return clean;
}

/**
 * Extracts candidate customer identifiers from call metadata, filename/title, and transcript turns.
 */
export function extractCandidateIdentifiers(input: {
  explicitCustomerId?: string | null;
  callerPhone?: string | null;
  crmId?: string | null;
  fileName?: string | null;
  title?: string | null;
  utterances?: Array<{ role?: string; text: string }>;
  defaultCountry?: string | null;
}): CandidateIdentifier[] {
  const candidates: CandidateIdentifier[] = [];
  const seen = new Set<string>();
  const country = resolveCountryIso(input.defaultCountry);

  const pushCandidate = (c: CandidateIdentifier) => {
    const key = `${c.idType}:${c.normalizedValue}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(c);
  };

  // 1. Explicit Customer ID (Priority 1)
  if (input.explicitCustomerId) {
    // Check if the user actually passed a phone number in explicitCustomerId
    const asPhone = normalizePhoneNumber(input.explicitCustomerId, country);
    if (asPhone.valid && asPhone.e164 && !/[a-zA-Z]/.test(input.explicitCustomerId)) {
      pushCandidate({
        idType: "msisdn",
        rawValue: input.explicitCustomerId.trim(),
        normalizedValue: asPhone.e164,
        countryCode: asPhone.countryCode,
        source: "metadata",
        confidence: asPhone.confidence,
        priority: 2,
      });
    } else {
      const normId = normalizeCustomerId(input.explicitCustomerId);
      if (normId) {
        pushCandidate({
          idType: "customer_id",
          rawValue: input.explicitCustomerId.trim(),
          normalizedValue: normId,
          countryCode: country,
          source: "metadata",
          confidence: 1.0,
          priority: 1,
        });
      }
    }
  }

  // 2. Explicit Caller Phone / MSISDN (Priority 2)
  if (input.callerPhone) {
    const normPhone = normalizePhoneNumber(input.callerPhone, country);
    if (normPhone.valid && normPhone.e164) {
      pushCandidate({
        idType: "msisdn",
        rawValue: input.callerPhone.trim(),
        normalizedValue: normPhone.e164,
        countryCode: normPhone.countryCode,
        source: "metadata",
        confidence: normPhone.confidence,
        priority: 2,
      });
    }
  }

  // 3. Explicit CRM / Account ID (Priority 3)
  if (input.crmId) {
    const normCrm = normalizeCustomerId(input.crmId);
    if (normCrm) {
      pushCandidate({
        idType: "crm_id",
        rawValue: input.crmId.trim(),
        normalizedValue: normCrm,
        countryCode: country,
        source: "metadata",
        confidence: 0.98,
        priority: 3,
      });
    }
  }

  // 4. Filename / Title extraction
  const metaText = [input.fileName || "", input.title || ""].join(" ");
  if (metaText.trim()) {
    // Look for explicit CUST-XXXX / ACC-XXXX / CRM-XXXX patterns in title/filename
    const idMatches = metaText.matchAll(/\b(?:CUST|CRM|ACC|ACCT|SUB|MSISDN)[-_]?([A-Z0-9]{4,16})\b/gi);
    for (const match of idMatches) {
      const full = match[0].toUpperCase();
      if (full.startsWith("MSISDN")) {
        const phoneRes = normalizePhoneNumber(match[1], country);
        if (phoneRes.valid && phoneRes.e164) {
          pushCandidate({
            idType: "msisdn",
            rawValue: match[0],
            normalizedValue: phoneRes.e164,
            countryCode: phoneRes.countryCode,
            source: "filename",
            confidence: 0.94,
            priority: 2,
          });
        }
      } else {
        const normId = normalizeCustomerId(full);
        if (normId) {
          pushCandidate({
            idType: full.startsWith("CUST") ? "customer_id" : "crm_id",
            rawValue: match[0],
            normalizedValue: normId,
            countryCode: country,
            source: "filename",
            confidence: 0.92,
            priority: full.startsWith("CUST") ? 1 : 3,
          });
        }
      }
    }

    // Look for phone numbers embedded in filename/title (e.g. "+255712345678", "0712345678", "255712345678")
    const phoneRegex = /(?:(?:\+|00)?(?:255|254|256|250|260|265|243|234|27|44|1)[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}|\b0[67812]\d{1}[\s.-]?\d{3}[\s.-]?\d{3,4}\b)/g;
    const filePhones = metaText.match(phoneRegex) || [];
    for (const rawPhone of filePhones) {
      const parsed = normalizePhoneNumber(rawPhone, country);
      if (parsed.valid && parsed.e164) {
        pushCandidate({
          idType: "msisdn",
          rawValue: rawPhone.trim(),
          normalizedValue: parsed.e164,
          countryCode: parsed.countryCode,
          source: "filename",
          confidence: 0.92,
          priority: 2,
        });
      }
    }
  }

  // 5. Transcript extraction (spoken phone numbers or account/customer IDs)
  if (input.utterances?.length) {
    const fullText = input.utterances.map((u) => u.text).join("\n");
    const transcriptPhoneRegex =
      /(?:(?:\+|00)?(?:255|254|256|250|260|265|243|234)[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}|\b0[678]\d{1}[\s.-]?\d{3}[\s.-]?\d{3}\b)/g;
    const matches = fullText.match(transcriptPhoneRegex) || [];
    for (const rawPhone of matches.slice(0, 3)) {
      const parsed = normalizePhoneNumber(rawPhone, country);
      if (parsed.valid && parsed.e164) {
        pushCandidate({
          idType: candidates.some((c) => c.idType === "msisdn")
            ? "extracted_phone"
            : "msisdn",
          rawValue: rawPhone.trim(),
          normalizedValue: parsed.e164,
          countryCode: parsed.countryCode,
          source: "transcript",
          confidence: 0.86,
          priority: candidates.some((c) => c.idType === "msisdn") ? 4 : 2,
        });
      }
    }

    const spokenIdMatches = fullText.matchAll(
      /\b(?:customer\s*id|account\s*(?:number|id)|crm\s*id|namba\s*ya\s*akaunti)\s*(?:is|ni|:)?\s*([A-Z0-9-]{5,18})\b/gi,
    );
    for (const match of spokenIdMatches) {
      const norm = normalizeCustomerId(match[1]);
      if (norm && /\d/.test(norm)) {
        pushCandidate({
          idType: "extracted_id",
          rawValue: match[1],
          normalizedValue: norm,
          countryCode: country,
          source: "transcript",
          confidence: 0.8,
          priority: 4,
        });
      }
    }
  }

  return candidates.sort((a, b) => a.priority - b.priority || b.confidence - a.confidence);
}

/**
 * Matches candidate identifiers against existing tenant-scoped customer profiles
 * following strict priority rules and anti-false-merge safeguards.
 *
 * Rules:
 *  - Priority 1: customer_id match
 *  - Priority 2: normalized msisdn match
 *  - Priority 3: crm_id / account_number match
 *  - Never automatically merges two different existing customers if identifiers conflict
 *    (flags `conflictDetected = true` and `needsIdentityReview = true` instead).
 *  - Never matches on weak confidence (< 0.80); flags `needsIdentityReview = true`.
 */
export function matchCustomerProfile(
  candidates: CandidateIdentifier[],
  existingProfiles: ExistingCustomerProfile[],
): IdentityMatchDecision {
  if (!candidates.length) {
    return {
      matchedCustomer: null,
      matchedBy: null,
      confidence: 0,
      needsIdentityReview: false,
      conflictDetected: false,
      explanation: "No customer identifiers found in call metadata, filename, or transcript.",
      candidateIdentifiers: [],
    };
  }

  const orderedCandidates = [...candidates].sort(
    (a, b) => a.priority - b.priority || b.confidence - a.confidence,
  );

  const hits: Array<{
    profile: ExistingCustomerProfile;
    candidate: CandidateIdentifier;
    confidence: number;
  }> = [];

  for (const candidate of orderedCandidates) {
    for (const profile of existingProfiles) {
      let matched = false;

      if (
        candidate.idType === "customer_id" &&
        profile.external_customer_id &&
        profile.external_customer_id.toUpperCase() === candidate.normalizedValue.toUpperCase()
      ) {
        matched = true;
      } else if (
        (candidate.idType === "msisdn" || candidate.idType === "extracted_phone") &&
        profile.normalized_phone &&
        profile.normalized_phone === candidate.normalizedValue
      ) {
        matched = true;
      } else if (
        (candidate.idType === "crm_id" || candidate.idType === "account_number") &&
        profile.crm_id &&
        profile.crm_id.toUpperCase() === candidate.normalizedValue.toUpperCase()
      ) {
        matched = true;
      } else if (
        profile.primary_identifier.toUpperCase() === candidate.normalizedValue.toUpperCase()
      ) {
        matched = true;
      } else if (profile.identifiers?.length) {
        const subMatch = profile.identifiers.find(
          (idRow) =>
            idRow.normalized_value.toUpperCase() === candidate.normalizedValue.toUpperCase(),
        );
        if (subMatch) matched = true;
      }

      if (matched) {
        hits.push({
          profile,
          candidate,
          confidence: candidate.confidence,
        });
      }
    }
  }

  if (hits.length === 0) {
    const primary = orderedCandidates[0];
    return {
      matchedCustomer: null,
      matchedBy: primary,
      confidence: primary.confidence,
      needsIdentityReview: primary.confidence < 0.85,
      conflictDetected: false,
      explanation: `New customer profile identified via ${primary.idType} (${primary.normalizedValue}).`,
      candidateIdentifiers: orderedCandidates,
    };
  }

  // Check if multiple distinct existing customer profiles were hit (conflict!)
  const distinctProfileIds = Array.from(new Set(hits.map((h) => h.profile.id)));
  const bestHit = hits[0];

  if (distinctProfileIds.length > 1) {
    // Do NOT automatically merge two customer profiles! Pick the highest-priority match
    // and flag `conflictDetected = true` + `needsIdentityReview = true`.
    return {
      matchedCustomer: bestHit.profile,
      matchedBy: bestHit.candidate,
      confidence: Math.min(bestHit.confidence, 0.75),
      needsIdentityReview: true,
      conflictDetected: true,
      explanation: `Identifier conflict detected across ${distinctProfileIds.length} existing profiles. Linked to highest-priority match (${bestHit.candidate.idType}: ${bestHit.candidate.normalizedValue}) and flagged for human review without auto-merging profiles.`,
      candidateIdentifiers: orderedCandidates,
    };
  }

  if (bestHit.confidence < 0.8) {
    // Weak match — do not auto-link with certainty; require review
    return {
      matchedCustomer: null,
      matchedBy: bestHit.candidate,
      confidence: bestHit.confidence,
      needsIdentityReview: true,
      conflictDetected: false,
      explanation: `Low-confidence identifier match (${Math.round(bestHit.confidence * 100)}%) on ${bestHit.candidate.normalizedValue}; held for human review to avoid false profile merging.`,
      candidateIdentifiers: orderedCandidates,
    };
  }

  return {
    matchedCustomer: bestHit.profile,
    matchedBy: bestHit.candidate,
    confidence: bestHit.confidence,
    needsIdentityReview: bestHit.confidence < 0.85,
    conflictDetected: false,
    explanation: `Matched existing customer profile via ${bestHit.candidate.idType} (${bestHit.candidate.normalizedValue}) with ${Math.round(bestHit.confidence * 100)}% confidence.`,
    candidateIdentifiers: orderedCandidates,
  };
}

