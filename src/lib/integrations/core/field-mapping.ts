/**
 * Zetro Universal Integration Hub — Declarative Field Mapping Engine
 * Transforms external records into canonical fields according to tenant rules.
 * Follows CTO Specification Section 7.2 (integration_field_mappings) & Section 8.
 */

import { normalizePhoneNumber } from "@/lib/customer-identity";

export type TransformationRule =
  | "direct_copy"
  | "phone_normalize"
  | "date_iso"
  | "lowercase"
  | "enum_map"
  | "json_path";

export interface FieldMappingRule {
  externalField: string;
  canonicalField: string;
  transformationRule: TransformationRule;
  isRequired?: boolean;
  enumMap?: Record<string, string>;
  fallbackValue?: unknown;
}

/**
 * Safely extracts a value from a nested object using dot-notation ("customer.profile.phone")
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Applies a single transformation rule to a raw value.
 */
export function applyTransformation(
  rawValue: unknown,
  rule: TransformationRule,
  enumMap?: Record<string, string>,
  countryHint: string = "TZ",
): unknown {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  switch (rule) {
    case "direct_copy":
      return rawValue;

    case "phone_normalize": {
      const str = String(rawValue).trim();
      const norm = normalizePhoneNumber(str, countryHint);
      return norm.valid && norm.e164 ? norm.e164 : str;
    }

    case "date_iso": {
      try {
        const d = new Date(rawValue as string | number);
        if (isNaN(d.getTime())) return new Date().toISOString();
        return d.toISOString();
      } catch {
        return new Date().toISOString();
      }
    }

    case "lowercase":
      return String(rawValue).trim().toLowerCase();

    case "enum_map": {
      const key = String(rawValue).trim().toLowerCase();
      if (enumMap && key in enumMap) {
        return enumMap[key];
      }
      return key;
    }

    case "json_path":
      return rawValue;

    default:
      return rawValue;
  }
}

/**
 * Transforms an arbitrary external JSON record into canonical key-value pairs
 * based on an array of mapping rules.
 */
export function transformExternalRecord(
  rawRecord: Record<string, unknown>,
  rules: FieldMappingRule[],
  countryHint: string = "TZ",
): {
  canonical: Record<string, unknown>;
  errors: string[];
} {
  const canonical: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const rule of rules) {
    const rawVal = getNestedValue(rawRecord, rule.externalField);

    if (rawVal === undefined || rawVal === null || rawVal === "") {
      if (rule.isRequired) {
        errors.push(`Required external field '${rule.externalField}' is missing or empty.`);
      }
      if (rule.fallbackValue !== undefined) {
        canonical[rule.canonicalField] = rule.fallbackValue;
      }
      continue;
    }

    try {
      const transformed = applyTransformation(
        rawVal,
        rule.transformationRule,
        rule.enumMap,
        countryHint,
      );
      canonical[rule.canonicalField] = transformed;
    } catch (err) {
      errors.push(
        `Failed to transform field '${rule.externalField}': ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { canonical, errors };
}

