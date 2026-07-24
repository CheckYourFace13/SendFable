/**
 * Explicit production gate for campaign delivery (independent of SES sandbox / UI).
 * Default: disabled when unset.
 */
export const CAMPAIGN_SEND_DISABLED_MESSAGE =
  "Campaign delivery is not activated yet.";

function envFlagTrue(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Campaign / scheduled / resume / worker recipient sends. Default false when missing. */
export function isCampaignSendEnabled(): boolean {
  const raw = process.env.CAMPAIGN_SEND_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return false;
  }
  return envFlagTrue("CAMPAIGN_SEND_ENABLED");
}

/**
 * Admin-only SES infrastructure test script (scripts/ses-controlled-test.ts).
 * Default false when missing. Does not unlock campaign sending.
 */
export function isSesControlledTestEnabled(): boolean {
  const raw = process.env.SES_CONTROLLED_TEST_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return false;
  }
  return envFlagTrue("SES_CONTROLLED_TEST_ENABLED");
}

export class CampaignSendDisabledError extends Error {
  readonly status = 403 as const;
  constructor(message = CAMPAIGN_SEND_DISABLED_MESSAGE) {
    super(message);
    this.name = "CampaignSendDisabledError";
  }
}

export function assertCampaignSendEnabled(): void {
  if (!isCampaignSendEnabled()) {
    throw new CampaignSendDisabledError();
  }
}

export function assertSesControlledTestEnabled(): void {
  if (!isSesControlledTestEnabled()) {
    throw new Error(
      "SES controlled test is not enabled (set SES_CONTROLLED_TEST_ENABLED=true)."
    );
  }
}
