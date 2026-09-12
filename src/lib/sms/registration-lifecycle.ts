/**
 * SMS 10DLC registration lifecycle phases (SF-019 sequencing).
 * Stored on profile.internalNotes.ownerPilot.lifecyclePhase — avoids enum migration.
 */

export const SMS_LIFECYCLE_PHASES = [
  "DRAFT",
  "BRAND_SUBMITTED",
  "BRAND_PENDING",
  "BRAND_VERIFIED",
  "BRAND_FAILED",
  "CAMPAIGN_SUBMITTED",
  "CAMPAIGN_PENDING",
  "CAMPAIGN_APPROVED",
  "CAMPAIGN_REJECTED",
  "NUMBER_READY",
  "NUMBER_ASSIGNED",
  "PILOT_READY",
] as const;

export type SmsLifecyclePhase = (typeof SMS_LIFECYCLE_PHASES)[number];

export type ProviderBrandStatus = "submitted" | "pending" | "approved" | "rejected";
export type ProviderCampaignStatus = "submitted" | "pending" | "approved" | "rejected";

/** Campaign may only be created when brand is verified/approved. */
export function canCreateCampaignForBrandStatus(status: ProviderBrandStatus | string): boolean {
  return status === "approved";
}

export function brandPhaseFromStatus(status: ProviderBrandStatus | string): SmsLifecyclePhase {
  if (status === "approved") return "BRAND_VERIFIED";
  if (status === "rejected") return "BRAND_FAILED";
  if (status === "pending" || status === "submitted") return "BRAND_PENDING";
  return "BRAND_SUBMITTED";
}

export function campaignPhaseFromStatus(status: ProviderCampaignStatus | string): SmsLifecyclePhase {
  if (status === "approved") return "CAMPAIGN_APPROVED";
  if (status === "rejected") return "CAMPAIGN_REJECTED";
  if (status === "pending" || status === "submitted") return "CAMPAIGN_PENDING";
  return "CAMPAIGN_SUBMITTED";
}

export function deriveLifecyclePhase(input: {
  brandId?: string | null;
  campaignId?: string | null;
  numberId?: string | null;
  brandStatus?: ProviderBrandStatus | string | null;
  campaignStatus?: ProviderCampaignStatus | string | null;
  liveSendingUnlocked?: boolean;
}): SmsLifecyclePhase {
  if (input.numberId && input.liveSendingUnlocked) return "PILOT_READY";
  if (input.numberId) return "NUMBER_ASSIGNED";
  if (input.campaignId) {
    const camp = campaignPhaseFromStatus(input.campaignStatus || "pending");
    if (camp === "CAMPAIGN_APPROVED") return "NUMBER_READY";
    return camp;
  }
  if (input.brandId) {
    return brandPhaseFromStatus(input.brandStatus || "pending");
  }
  return "DRAFT";
}

export function humanLifecycleMessage(phase: SmsLifecyclePhase): string {
  switch (phase) {
    case "DRAFT":
      return "Registration draft is ready. Submit the Brand to Telnyx when the legal details are confirmed.";
    case "BRAND_SUBMITTED":
    case "BRAND_PENDING":
      return "Brand submitted. Telnyx/TCR verification is pending. SendFable will continue automatically once the brand is verified.";
    case "BRAND_VERIFIED":
      return "Brand verified. You can create the SMS campaign now (or SendFable will create it automatically).";
    case "BRAND_FAILED":
      return "Brand verification failed. Review the provider reason before retrying.";
    case "CAMPAIGN_SUBMITTED":
    case "CAMPAIGN_PENDING":
      return "Campaign submitted for carrier review. SendFable will poll until approved or rejected.";
    case "CAMPAIGN_APPROVED":
    case "NUMBER_READY":
      return "Campaign approved. You can purchase one US local pilot number.";
    case "CAMPAIGN_REJECTED":
      return "Campaign was rejected. Review the provider reason before retrying.";
    case "NUMBER_ASSIGNED":
      return "Pilot number assigned. Enable live owner-pilot sending when ready.";
    case "PILOT_READY":
      return "Owner SMS pilot is ready for live traffic (public SMS still off).";
    default:
      return "Registration in progress.";
  }
}

export function primaryActionForPhase(phase: SmsLifecyclePhase): {
  action: string;
  label: string;
  disabled?: boolean;
} {
  switch (phase) {
    case "DRAFT":
      return { action: "submit-brand", label: "Submit Brand" };
    case "BRAND_SUBMITTED":
    case "BRAND_PENDING":
      return { action: "sync-brand", label: "Sync Brand Status" };
    case "BRAND_VERIFIED":
      return { action: "create-campaign", label: "Create Campaign" };
    case "BRAND_FAILED":
      return { action: "sync-brand", label: "Sync Brand Status" };
    case "CAMPAIGN_SUBMITTED":
    case "CAMPAIGN_PENDING":
      return { action: "sync-campaign", label: "Sync Campaign Status" };
    case "CAMPAIGN_APPROVED":
    case "NUMBER_READY":
      return { action: "purchase-pilot-number", label: "Purchase Pilot Number" };
    case "CAMPAIGN_REJECTED":
      return { action: "sync-campaign", label: "Sync Campaign Status" };
    case "NUMBER_ASSIGNED":
      return { action: "enable-live", label: "Enable owner-pilot live SMS" };
    case "PILOT_READY":
      return { action: "sync-status", label: "Refresh status", disabled: false };
    default:
      return { action: "sync-status", label: "Sync status" };
  }
}

/** Controlled app error — never treat pending brand as a 502 provider failure. */
export class BrandNotVerifiedError extends Error {
  readonly code = "brand_not_verified" as const;
  constructor(message = "brand_not_verified") {
    super(message);
    this.name = "BrandNotVerifiedError";
  }
}
