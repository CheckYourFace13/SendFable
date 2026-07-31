/**
 * SMS compliance profile validation + review transitions (SF-019).
 * Pure helpers — no provider network calls.
 */

import type { SmsComplianceReviewStatus } from "@prisma/client";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  type SmsPlanKey,
} from "@/lib/sms/pricing";
import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";

export const SMS_COMPLIANCE_REVIEW_STATUSES = [
  "DRAFT",
  "CUSTOMER_SUBMITTED",
  "INTERNAL_REVIEW",
  "NEEDS_CUSTOMER_CHANGES",
  "READY_FOR_PROVIDER",
  "PROVIDER_SUBMITTED",
  "PROVIDER_PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "CANCELLED",
] as const satisfies readonly SmsComplianceReviewStatus[];

export const ENTITY_TYPES = [
  "PRIVATE_PROFIT",
  "PUBLIC_PROFIT",
  "NON_PROFIT",
  "GOVERNMENT",
  "SOLE_PROPRIETOR",
] as const;

export const SMS_USE_CASES = [
  "MARKETING",
  "MIXED",
  "CUSTOMER_CARE",
  "ACCOUNT_NOTIFICATION",
  "DELIVERY_NOTIFICATION",
  "LOW_VOLUME_MIXED",
] as const;

export interface ComplianceProfileInput {
  selectedPlan?: string | null;
  legalEntityName?: string | null;
  dbaBrandName?: string | null;
  einBrn?: string | null;
  registrationType?: string | null;
  registrationCountry?: string | null;
  entityType?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  websiteUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  industryVertical?: string | null;
  smsUseCase?: string | null;
  estimatedMonthlyVolume?: number | null;
  optInDescription?: string | null;
  optInFormUrl?: string | null;
  optInEvidenceUrl?: string | null;
  privacyPolicyUrl?: string | null;
  smsTermsUrl?: string | null;
  sampleMessage1?: string | null;
  sampleMessage2?: string | null;
  helpResponse?: string | null;
  stopResponse?: string | null;
  disclosureAccepted?: boolean | null;
  brandNameForDisclosure?: string | null;
}

export type FieldErrors = Record<string, string>;

function requireHttpsUrl(value: string | null | undefined, label: string, errors: FieldErrors, key: string) {
  if (!value?.trim()) {
    errors[key] = `${label} is required`;
    return;
  }
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:") errors[key] = `${label} must use HTTPS`;
  } catch {
    errors[key] = `${label} must be a valid URL`;
  }
}

function requireText(value: string | null | undefined, label: string, errors: FieldErrors, key: string, min = 3) {
  if (!value?.trim() || value.trim().length < min) {
    errors[key] = `${label} is required`;
  }
}

/** US EIN XX-XXXXXXX or 9 digits; sole prop may omit. */
export function validateEinBrn(
  ein: string | null | undefined,
  entityType: string | null | undefined
): string | null {
  if (entityType === "SOLE_PROPRIETOR") {
    if (!ein?.trim()) return null;
  }
  if (!ein?.trim()) return "EIN / business registration number is required";
  const cleaned = ein.replace(/[-\s]/g, "");
  if (!/^\d{9}$/.test(cleaned)) return "EIN must be 9 digits (XX-XXXXXXX)";
  return null;
}

/**
 * Validate a profile for customer submit (full readiness).
 * Returns field-level errors; empty object = valid.
 */
export function validateComplianceProfileForSubmit(input: ComplianceProfileInput): FieldErrors {
  const errors: FieldErrors = {};
  const plan = input.selectedPlan;
  if (!plan || !(plan in SMS_PLANS)) {
    errors.selectedPlan = "Select a Text Messaging plan";
  }
  requireText(input.legalEntityName, "Legal business name", errors, "legalEntityName");
  if (!input.entityType || !(ENTITY_TYPES as readonly string[]).includes(input.entityType)) {
    errors.entityType = "Select a business entity type";
  }
  const einErr = validateEinBrn(input.einBrn, input.entityType);
  if (einErr) errors.einBrn = einErr;

  requireText(input.street, "Street address", errors, "street");
  requireText(input.city, "City", errors, "city");
  requireText(input.state, "State", errors, "state", 2);
  requireText(input.postalCode, "Postal code", errors, "postalCode", 5);
  requireHttpsUrl(input.websiteUrl, "Website", errors, "websiteUrl");
  requireText(input.supportEmail, "Support email", errors, "supportEmail");
  if (input.supportEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.supportEmail.trim())) {
    errors.supportEmail = "Support email must be valid";
  }
  requireText(input.supportPhone, "Support phone", errors, "supportPhone");
  requireText(input.industryVertical, "Industry", errors, "industryVertical");
  if (!input.smsUseCase || !(SMS_USE_CASES as readonly string[]).includes(input.smsUseCase)) {
    errors.smsUseCase = "Select an SMS use case";
  }
  if (
    input.estimatedMonthlyVolume === null ||
    input.estimatedMonthlyVolume === undefined ||
    !Number.isInteger(input.estimatedMonthlyVolume) ||
    input.estimatedMonthlyVolume < 1
  ) {
    errors.estimatedMonthlyVolume = "Estimated monthly volume is required";
  }
  requireText(input.optInDescription, "Opt-in process description", errors, "optInDescription", 20);
  requireHttpsUrl(input.optInFormUrl, "Opt-in form URL", errors, "optInFormUrl");
  requireHttpsUrl(input.optInEvidenceUrl, "Opt-in evidence URL", errors, "optInEvidenceUrl");
  requireHttpsUrl(input.privacyPolicyUrl, "Privacy Policy URL", errors, "privacyPolicyUrl");
  requireHttpsUrl(input.smsTermsUrl, "SMS Terms URL", errors, "smsTermsUrl");
  requireText(input.sampleMessage1, "Sample message 1", errors, "sampleMessage1", 10);
  requireText(input.sampleMessage2, "Sample message 2", errors, "sampleMessage2", 10);
  requireText(input.helpResponse, "HELP response", errors, "helpResponse", 10);
  requireText(input.stopResponse, "STOP response", errors, "stopResponse", 10);

  if (!input.disclosureAccepted) {
    errors.disclosureAccepted =
      "Confirm dedicated number, registration, message frequency, message/data rates, and that consent is not a condition of purchase";
  }

  if (input.stopResponse && !/STOP|UNSUBSCRIBE|OPT/i.test(input.stopResponse)) {
    errors.stopResponse = "STOP response should confirm unsubscribe";
  }

  // Sample messages should carry frequency / rate / STOP cues where marketing
  const sampleBlob = `${input.sampleMessage1 || ""} ${input.sampleMessage2 || ""}`.toUpperCase();
  if (sampleBlob && !/STOP|UNSUBSCRIBE/.test(sampleBlob)) {
    errors.sampleMessage1 = "At least one sample message must include STOP / unsubscribe language";
  }
  if (sampleBlob && !/MSG|MESSAGE|FREQ|RATE|DATA/.test(sampleBlob)) {
    errors.sampleMessage2 =
      "Sample messages should disclose message frequency and/or Msg&Data rates";
  }

  return errors;
}

/** Allowed admin transitions for the compliance queue. */
export const COMPLIANCE_TRANSITIONS: Record<
  SmsComplianceReviewStatus,
  SmsComplianceReviewStatus[]
> = {
  DRAFT: ["CUSTOMER_SUBMITTED", "CANCELLED"],
  CUSTOMER_SUBMITTED: ["INTERNAL_REVIEW", "NEEDS_CUSTOMER_CHANGES", "CANCELLED"],
  INTERNAL_REVIEW: [
    "NEEDS_CUSTOMER_CHANGES",
    "READY_FOR_PROVIDER",
    "REJECTED",
    "CANCELLED",
  ],
  NEEDS_CUSTOMER_CHANGES: ["CUSTOMER_SUBMITTED", "CANCELLED"],
  READY_FOR_PROVIDER: ["PROVIDER_SUBMITTED", "NEEDS_CUSTOMER_CHANGES", "CANCELLED"],
  PROVIDER_SUBMITTED: ["PROVIDER_PENDING", "REJECTED", "CANCELLED"],
  PROVIDER_PENDING: ["APPROVED", "REJECTED", "NEEDS_CUSTOMER_CHANGES"],
  APPROVED: ["SUSPENDED", "CANCELLED"],
  REJECTED: ["NEEDS_CUSTOMER_CHANGES", "CANCELLED"],
  SUSPENDED: ["APPROVED", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionCompliance(
  from: SmsComplianceReviewStatus,
  to: SmsComplianceReviewStatus
): boolean {
  return COMPLIANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function estimateRegistrationFeesCents(): {
  oneTimeCents: number;
  monthlyCents: number;
  activationFeeCents: number;
  coversActivation: boolean;
} {
  const oneTime = Number(MOCK_PROVIDER_COSTS.registrationOneTimeMicros / 10_000n);
  const monthly = Number(
    (MOCK_PROVIDER_COSTS.campaignMonthlyMicros + MOCK_PROVIDER_COSTS.numberMonthlyMicros) / 10_000n
  );
  return {
    oneTimeCents: oneTime,
    monthlyCents: monthly,
    activationFeeCents: SMS_ACTIVATION_FEE_CENTS,
    coversActivation: oneTime <= SMS_ACTIVATION_FEE_CENTS,
  };
}

export function estimatePlanMarginBasisPoints(
  plan: SmsPlanKey,
  bundled: boolean
): number {
  const def = SMS_PLANS[plan];
  const revenue =
    bundled && def.bundledMonthlyPriceCents !== null
      ? def.bundledMonthlyPriceCents
      : def.monthlyPriceCents;
  const overhead = Number(
    (MOCK_PROVIDER_COSTS.campaignMonthlyMicros + MOCK_PROVIDER_COSTS.numberMonthlyMicros) / 10_000n
  );
  const profit = revenue - overhead;
  if (revenue <= 0) return 0;
  return Math.round((profit * 10_000) / revenue);
}

/** Safe list projection — never includes EIN ciphertext or decrypted EIN. */
export function toComplianceListItem(row: {
  id: string;
  workspaceId: string;
  legalEntityName: string | null;
  dbaBrandName: string | null;
  reviewStatus: SmsComplianceReviewStatus;
  selectedPlan: string | null;
  submittedAt: Date | null;
  hasEin: boolean;
}) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    legalEntityName: row.legalEntityName,
    dbaBrandName: row.dbaBrandName,
    reviewStatus: row.reviewStatus,
    selectedPlan: row.selectedPlan,
    submittedAt: row.submittedAt,
    einOnFile: row.hasEin,
  };
}
