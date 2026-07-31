/**
 * SMS consent state machine + STOP/HELP keyword recognition.
 *
 * SMS permission is ALWAYS independent from email permission:
 *  - a phone number on file never implies SMS consent,
 *  - email consent never grants SMS consent,
 *  - STOP suppression survives contact deletion and reimport (SmsSuppression
 *    is keyed by workspace + number, not contact id),
 *  - only a documented new opt-in may restore permission after an opt-out.
 */

import type { SmsConsentStatus } from "@prisma/client";

// ─── Keywords ─────────────────────────────────────────────────────────────────

/** Standard opt-out keywords (case-insensitive, matched on trimmed body). */
export const SMS_STOP_KEYWORDS = [
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
] as const;

export const SMS_HELP_KEYWORDS = ["HELP", "INFO"] as const;

function normalizeKeywordBody(body: string): string {
  // Trim whitespace and trailing punctuation; carriers commonly deliver
  // "Stop", "STOP.", " stop " etc.
  return body.trim().replace(/[.!?,;:]+$/u, "").trim().toUpperCase();
}

export function isStopMessage(body: string): boolean {
  return (SMS_STOP_KEYWORDS as readonly string[]).includes(normalizeKeywordBody(body));
}

export function isHelpMessage(body: string): boolean {
  return (SMS_HELP_KEYWORDS as readonly string[]).includes(normalizeKeywordBody(body));
}

// ─── Consent transitions ──────────────────────────────────────────────────────

export interface ConsentDecision {
  allowed: boolean;
  reason?: string;
}

/** May we send MARKETING SMS to a contact in this state? */
export function canSendMarketingSms(status: SmsConsentStatus, suppressed: boolean): ConsentDecision {
  if (suppressed) return { allowed: false, reason: "number is suppressed (STOP)" };
  if (status === "SUBSCRIBED") return { allowed: true };
  return { allowed: false, reason: `sms status is ${status}` };
}

/**
 * Compliance responses (STOP confirmation, HELP info) are never blocked by
 * consent state or allowance overage — but they are still counted for
 * provider cost and inbound allowance accounting.
 */
export function canSendComplianceSms(): ConsentDecision {
  return { allowed: true };
}

export interface OptInInput {
  currentStatus: SmsConsentStatus;
  /** Documented consent evidence is REQUIRED to (re)subscribe */
  source: string; // "form:<slug>" | "import:<batchId>" | "manual"
  disclosureVersion: string | null;
  /** The number currently sits in SmsSuppression for this workspace */
  suppressed: boolean;
  /** For suppressed numbers: is this a documented NEW opt-in (not an import replay)? */
  documentedNewOptIn: boolean;
}

export interface OptInResult {
  nextStatus: SmsConsentStatus;
  clearSuppression: boolean;
  accepted: boolean;
  reason?: string;
}

/**
 * Apply an opt-in attempt. A reimported opted-out number stays opted out:
 * only a documented new opt-in clears suppression.
 */
export function applyOptIn(input: OptInInput): OptInResult {
  if (!input.source?.trim()) {
    return { nextStatus: input.currentStatus, clearSuppression: false, accepted: false, reason: "consent source required" };
  }
  if (input.suppressed || input.currentStatus === "OPTED_OUT") {
    if (!input.documentedNewOptIn) {
      return {
        nextStatus: "OPTED_OUT",
        clearSuppression: false,
        accepted: false,
        reason: "number previously opted out; a documented new opt-in is required",
      };
    }
    return { nextStatus: "SUBSCRIBED", clearSuppression: true, accepted: true };
  }
  if (input.currentStatus === "BLOCKED" || input.currentStatus === "INVALID") {
    return {
      nextStatus: input.currentStatus,
      clearSuppression: false,
      accepted: false,
      reason: `cannot opt in a ${input.currentStatus} number`,
    };
  }
  return { nextStatus: "SUBSCRIBED", clearSuppression: false, accepted: true };
}

/** STOP always wins, from any state. */
export function applyOptOut(): { nextStatus: SmsConsentStatus; addSuppression: true } {
  return { nextStatus: "OPTED_OUT", addSuppression: true };
}

/** Current version of the SMS consent disclosure shown on forms. */
export const SMS_CONSENT_DISCLOSURE_VERSION = "sms-consent-2026-07-31";

/**
 * Build the customer-facing SMS opt-in disclosure for a specific end business.
 * Brand/DBA must be the end customer's identity — never a platform-only label
 * that would hide who is texting.
 */
export function buildSmsConsentDisclosure(input: {
  brandName: string;
  privacyPolicyUrl?: string | null;
  smsTermsUrl?: string | null;
}): string {
  const brand = input.brandName.trim() || "this business";
  const privacy = input.privacyPolicyUrl?.trim() || "https://sendfable.com/privacy";
  const terms = input.smsTermsUrl?.trim() || "https://sendfable.com/terms";
  return (
    `I agree to receive recurring marketing and conversational text messages from ${brand} ` +
    `at the mobile number provided. Message frequency varies. Message and data rates may apply. ` +
    `Consent is optional and is not a condition of purchase. Reply STOP to unsubscribe or HELP for help. ` +
    `View Privacy Policy (${privacy}) and SMS Terms (${terms}). ` +
    `Mobile information will not be sold or shared with third parties for their marketing.`
  );
}

/** @deprecated Prefer buildSmsConsentDisclosure({ brandName }) for TCR accuracy. */
export const SMS_CONSENT_DISCLOSURE_TEXT = buildSmsConsentDisclosure({
  brandName: "this business",
});

/** Standard HELP reply template — brand must be the end business. */
export function buildSmsHelpReply(input: {
  brandName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
}): string {
  const brand = input.brandName.trim() || "this business";
  const contact =
    [input.supportEmail?.trim(), input.supportPhone?.trim()].filter(Boolean).join(" or ") ||
    "the business that texted you";
  return (
    `${brand}: For help, contact ${contact}. Msg&data rates may apply. ` +
    `Reply STOP to unsubscribe.`
  );
}

/** Standard STOP confirmation — brand must be the end business. */
export function buildSmsStopReply(brandName: string): string {
  const brand = brandName.trim() || "this business";
  return `You are unsubscribed from ${brand} texts. No more messages will be sent. Reply HELP for help.`;
}
