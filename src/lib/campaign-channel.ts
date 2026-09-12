/**
 * Channel routing helpers for Email / Text / Both campaigns.
 * Pure functions — used by launch path tests and UI copy.
 */

export type CampaignChannel = "EMAIL" | "SMS" | "BOTH";

export type ContactChannelIds = {
  email: string | null;
  phoneE164: string | null;
  emailSubscribed: boolean;
  smsSubscribed: boolean;
};

/** Who should receive which leg of a campaign. */
export function contactEligibleForChannel(
  contact: ContactChannelIds,
  channel: CampaignChannel
): { email: boolean; sms: boolean } {
  const emailOk = !!contact.email && contact.emailSubscribed;
  const smsOk = !!contact.phoneE164 && contact.smsSubscribed;
  switch (channel) {
    case "EMAIL":
      return { email: emailOk, sms: false };
    case "SMS":
      return { email: false, sms: smsOk };
    case "BOTH":
      return { email: emailOk, sms: smsOk };
    default:
      return { email: false, sms: false };
  }
}

export function needsEmailLeg(channel: CampaignChannel): boolean {
  return channel === "EMAIL" || channel === "BOTH";
}

export function needsSmsLeg(channel: CampaignChannel): boolean {
  return channel === "SMS" || channel === "BOTH";
}
