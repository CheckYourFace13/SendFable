/**
 * Phone normalization for the SMS product — E.164 via libphonenumber-js.
 *
 * Phase 1 policy: US destinations only. Ambiguous or invalid input is
 * rejected, never guessed.
 *
 * Uses the core build + bundled min metadata so ESM/tsx/Next all see the
 * same metadata (the package's default ESM entry can load without it under
 * some Node/tsx interop paths).
 */

import parsePhoneNumberFromString from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";

export interface NormalizedPhone {
  e164: string; // "+13125550123"
  national: string; // "(312) 555-0123"
}

/**
 * Normalize raw input to a valid US E.164 number, or null when invalid or
 * ambiguous. Accepts "+1…" international format and 10-digit US national
 * formats ("312-555-0123", "(312) 555-0123", "3125550123").
 */
export function normalizeUsPhone(raw: string | null | undefined): NormalizedPhone | null {
  const input = (raw ?? "").trim();
  if (!input) return null;

  const parsed = parsePhoneNumberFromString(input, "US", metadata);
  if (!parsed) return null;
  if (!parsed.isValid()) return null;
  // Phase 1: US only. Reject valid non-US numbers rather than guessing.
  if (parsed.country !== "US") return null;

  return { e164: parsed.number, national: parsed.formatNational() };
}

export function isValidUsE164(value: string | null | undefined): boolean {
  return normalizeUsPhone(value) !== null;
}

/**
 * Redact a phone number for logs: keep country code and last 2 digits.
 * "+13125550123" -> "+1********23"
 */
export function redactPhone(e164: string | null | undefined): string {
  if (!e164) return "(none)";
  const s = String(e164);
  if (s.length <= 4) return "****";
  const head = s.startsWith("+") ? s.slice(0, 2) : s.slice(0, 1);
  const tail = s.slice(-2);
  return `${head}${"*".repeat(Math.max(1, s.length - head.length - 2))}${tail}`;
}

/** Common CSV headers auto-detected as phone columns (case-insensitive). */
export const PHONE_HEADER_PATTERNS = [
  /^phone$/i,
  /^phone[\s_-]?number$/i,
  /^mobile$/i,
  /^mobile[\s_-]?(phone|number)$/i,
  /^cell$/i,
  /^cell[\s_-]?(phone|number)$/i,
  /^sms$/i,
  /^sms[\s_-]?number$/i,
  /^tel(ephone)?$/i,
];

export function isPhoneHeader(header: string): boolean {
  const h = header.trim();
  return PHONE_HEADER_PATTERNS.some((re) => re.test(h));
}
