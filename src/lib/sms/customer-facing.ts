/**
 * Customer-facing Text Messaging copy + generators.
 * Never expose Telnyx/TCR/provider jargon in these helpers.
 */

import {
  buildSmsConsentDisclosure,
  buildSmsHelpReply,
  buildSmsStopReply,
} from "@/lib/sms/consent";
import type { SmsLifecyclePhase } from "@/lib/sms/registration-lifecycle";

export const CUSTOMER_SMS_USE_CASES = [
  {
    id: "MARKETING",
    label: "Promotions & offers",
    description: "Sales, coupons, and special offers",
  },
  {
    id: "CUSTOMER_CARE",
    label: "Appointment & reminder messages",
    description: "Reminders, confirmations, and follow-ups",
  },
  {
    id: "ACCOUNT_NOTIFICATION",
    label: "Events & updates",
    description: "Event notices and important updates",
  },
  {
    id: "MIXED",
    label: "Customer notifications",
    description: "A mix of helpful notices and occasional offers",
  },
] as const;

export type CustomerSmsUseCaseId = (typeof CUSTOMER_SMS_USE_CASES)[number]["id"];

/** Plain-English status for the customer wizard (not provider codes). */
export type CustomerSmsStatus =
  | "not_started"
  | "ready_to_submit"
  | "submitted"
  | "approval_in_progress"
  | "approved"
  | "needs_attention"
  | "choose_number"
  | "active";

export function customerStatusLabel(status: CustomerSmsStatus): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "ready_to_submit":
      return "Ready to submit";
    case "submitted":
      return "Registration submitted";
    case "approval_in_progress":
      return "Approval in progress";
    case "approved":
      return "Approved";
    case "needs_attention":
      return "Needs attention";
    case "choose_number":
      return "Choose your texting number";
    case "active":
      return "Text messaging ready";
    default:
      return "In progress";
  }
}

export function customerStatusMessage(status: CustomerSmsStatus): string {
  switch (status) {
    case "not_started":
      return "Answer a few questions so we can turn on text messaging for your business.";
    case "ready_to_submit":
      return "Your details look complete. Submit for text messaging approval when you’re ready.";
    case "submitted":
      return "We’ve submitted your text messaging registration. You don’t need to do anything else right now.";
    case "approval_in_progress":
      return "Approval in progress. This usually takes a little time — we’ll update this page automatically.";
    case "approved":
      return "Approved. Next, choose your texting number.";
    case "needs_attention":
      return "We need one piece of information to finish your text messaging approval.";
    case "choose_number":
      return "Choose your texting number to start sending.";
    case "active":
      return "Text messaging is ready for your account.";
    default:
      return "Text messaging setup is in progress.";
  }
}

export function mapLifecycleToCustomerStatus(input: {
  phase?: string | null;
  reviewStatus?: string | null;
  hasNumber?: boolean;
  liveReady?: boolean;
  rejectionReason?: string | null;
}): CustomerSmsStatus {
  if (input.liveReady || (input.hasNumber && input.phase === "PILOT_READY")) return "active";
  if (input.hasNumber) return "active";
  const phase = (input.phase || "") as SmsLifecyclePhase | "";
  if (phase === "NUMBER_READY" || phase === "CAMPAIGN_APPROVED") return "choose_number";
  if (
    phase === "BRAND_FAILED" ||
    phase === "CAMPAIGN_REJECTED" ||
    input.reviewStatus === "REJECTED" ||
    input.reviewStatus === "NEEDS_CUSTOMER_CHANGES"
  ) {
    return "needs_attention";
  }
  if (
    phase === "BRAND_PENDING" ||
    phase === "BRAND_SUBMITTED" ||
    phase === "BRAND_VERIFIED" ||
    phase === "CAMPAIGN_SUBMITTED" ||
    phase === "CAMPAIGN_PENDING" ||
    input.reviewStatus === "PROVIDER_PENDING" ||
    input.reviewStatus === "PROVIDER_SUBMITTED" ||
    input.reviewStatus === "CUSTOMER_SUBMITTED" ||
    input.reviewStatus === "INTERNAL_REVIEW" ||
    input.reviewStatus === "READY_FOR_PROVIDER"
  ) {
    return "approval_in_progress";
  }
  if (input.reviewStatus === "DRAFT" || !input.reviewStatus) {
    return input.phase ? "ready_to_submit" : "not_started";
  }
  return "approval_in_progress";
}

/** Translate provider/platform errors into plain English for customers (and calm admin copy). */
export function translateSmsProviderError(raw: string | null | undefined): {
  customerMessage: string;
  ownerMessage: string;
  code: "insufficient_funds" | "brand_pending" | "rejected" | "unknown";
} {
  const msg = (raw || "").toLowerCase();
  if (
    msg.includes("20100") ||
    msg.includes("insufficient funds") ||
    msg.includes("at least $30")
  ) {
    return {
      code: "insufficient_funds",
      customerMessage:
        "Text messaging approval is almost ready. We’re finishing a platform step and will continue automatically — you don’t need to do anything.",
      ownerMessage:
        "Text messaging registration is ready, but the provider account needs additional balance before the campaign can be submitted.",
    };
  }
  if (
    msg.includes("brand_not_verified") ||
    (msg.includes("pending") && msg.includes("brand"))
  ) {
    return {
      code: "brand_pending",
      customerMessage:
        "Approval in progress. We’ll continue automatically once verification finishes.",
      ownerMessage:
        "Brand submitted. Verification is pending. Campaign will be created automatically once verified.",
    };
  }
  if (msg.includes("reject") || msg.includes("fail")) {
    return {
      code: "rejected",
      customerMessage:
        "We need one piece of information to finish your text messaging approval.",
      ownerMessage: raw?.slice(0, 400) || "Provider rejected the registration.",
    };
  }
  return {
    code: "unknown",
    customerMessage:
      "We couldn’t finish that step right now. Please try again in a few minutes.",
    ownerMessage: raw?.slice(0, 400) || "Unknown provider error",
  };
}

export function generateSmsSampleMessages(input: {
  brandName: string;
  useCase: string;
}): { sampleMessage1: string; sampleMessage2: string } {
  const brand = input.brandName.trim() || "this business";
  const use = input.useCase;
  if (use === "CUSTOMER_CARE") {
    return {
      sampleMessage1: `${brand}: Reminder about your upcoming appointment. Reply YES to confirm. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`,
      sampleMessage2: `${brand}: Thanks for confirming. We’ll see you soon. Msg & data rates may apply. Reply STOP to unsubscribe.`,
    };
  }
  if (use === "ACCOUNT_NOTIFICATION") {
    return {
      sampleMessage1: `${brand}: You’re signed up for event and update texts. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`,
      sampleMessage2: `${brand}: Reminder — an update is available. Msg & data rates may apply. Reply STOP to unsubscribe.`,
    };
  }
  // MARKETING / MIXED default
  return {
    sampleMessage1: `${brand}: Thanks for joining our text updates. Get offers and news from us. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`,
    sampleMessage2: `${brand}: This week's offer is now available. Msg & data rates may apply. Reply STOP to unsubscribe.`,
  };
}

export function generateSmsHelpStop(input: {
  brandName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
}): { helpResponse: string; stopResponse: string } {
  return {
    helpResponse: buildSmsHelpReply(input),
    stopResponse: buildSmsStopReply(input.brandName),
  };
}

export function generateSmsOptInDescription(input: {
  brandName: string;
  useCaseLabel: string;
  optInFormUrl: string;
}): string {
  const brand = input.brandName.trim() || "this business";
  return (
    `Customers join the ${brand} text list by submitting their mobile number on the SendFable signup form at ${input.optInFormUrl} ` +
    `and checking an explicit SMS consent box (unchecked by default). Consent language identifies ${brand}, describes ${input.useCaseLabel.toLowerCase()}, ` +
    `discloses that message frequency varies, Msg & data rates may apply, Reply STOP to opt out, Reply HELP for help, ` +
    `and that consent is not a condition of purchase. Only numbers with documented consent receive texts.`
  );
}

export function generateSmsDisclosure(input: {
  brandName: string;
  privacyPolicyUrl?: string | null;
  smsTermsUrl?: string | null;
}): string {
  return buildSmsConsentDisclosure(input);
}

/** Parse mailing address "street, city, ST ZIP" best-effort. */
export function parseMailingAddress(mailingAddress: string | null | undefined): {
  street: string;
  city: string;
  state: string;
  postalCode: string;
} {
  const raw = (mailingAddress || "").trim();
  if (!raw) return { street: "", city: "", state: "", postalCode: "" };
  // "1364 Patriot Boulevard, Glenview, IL 60026"
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const street = parts[0]!;
    const city = parts[1]!;
    const stateZip = parts.slice(2).join(" ");
    const m = stateZip.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (m) return { street, city, state: m[1]!.toUpperCase(), postalCode: m[2]! };
    return { street, city, state: stateZip.slice(0, 2).toUpperCase(), postalCode: "" };
  }
  return { street: raw, city: "", state: "", postalCode: "" };
}

export function labelForSmsUseCase(id: string): string {
  return CUSTOMER_SMS_USE_CASES.find((u) => u.id === id)?.label || "updates";
}
