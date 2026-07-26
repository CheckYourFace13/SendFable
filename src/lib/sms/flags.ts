/**
 * Server-side feature flags for the Text Messaging (SMS) product.
 *
 * Every SMS surface — pages, API routes, worker jobs, webhooks, provider
 * calls, Stripe writes — must call these gates server-side. Hiding a button
 * is never a sufficient safety control.
 *
 * Safe defaults (when the env var is missing):
 *   SENDFABLE_SMS_CODE_ENABLED=true            code paths compiled/available
 *   SENDFABLE_SMS_PUBLIC_ENABLED=false         public pricing/marketing hidden
 *   SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED=false customers cannot pick a text plan
 *   SENDFABLE_SMS_BILLING_ENABLED=false        no Stripe SMS subscription writes
 *   SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED=false  no $99 activation charge
 *   SENDFABLE_SMS_REGISTRATION_ENABLED=false   no carrier registration submission
 *   SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED=false no phone-number purchase
 *   SENDFABLE_SMS_LIVE_SENDING_ENABLED=false   no live provider send calls
 *   SENDFABLE_SMS_INBOUND_ENABLED=false        real inbound webhooks are ignored
 *   SENDFABLE_SMS_REPLY_ENABLED=false          inbox replies cannot send
 *   SENDFABLE_SMS_ADMIN_ENABLED=true           admin/owner SMS area available
 *   SENDFABLE_SMS_MOCK_PROVIDER_ENABLED=true   mock provider is the default
 */

function flag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return defaultValue;
  }
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export const SMS_FLAG_DEFAULTS = {
  SENDFABLE_SMS_CODE_ENABLED: true,
  SENDFABLE_SMS_PUBLIC_ENABLED: false,
  SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED: false,
  SENDFABLE_SMS_BILLING_ENABLED: false,
  SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED: false,
  SENDFABLE_SMS_REGISTRATION_ENABLED: false,
  SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED: false,
  SENDFABLE_SMS_LIVE_SENDING_ENABLED: false,
  SENDFABLE_SMS_INBOUND_ENABLED: false,
  SENDFABLE_SMS_REPLY_ENABLED: false,
  SENDFABLE_SMS_ADMIN_ENABLED: true,
  SENDFABLE_SMS_MOCK_PROVIDER_ENABLED: true,
} as const;

export type SmsFlagName = keyof typeof SMS_FLAG_DEFAULTS;

export function smsFlag(name: SmsFlagName): boolean {
  return flag(name, SMS_FLAG_DEFAULTS[name]);
}

/** Snapshot of every SMS flag (admin display / diagnostics). */
export function smsFlagSnapshot(): Record<SmsFlagName, boolean> {
  const out = {} as Record<SmsFlagName, boolean>;
  for (const name of Object.keys(SMS_FLAG_DEFAULTS) as SmsFlagName[]) {
    out[name] = smsFlag(name);
  }
  return out;
}

export const isSmsCodeEnabled = () => smsFlag("SENDFABLE_SMS_CODE_ENABLED");
export const isSmsPublicEnabled = () => smsFlag("SENDFABLE_SMS_PUBLIC_ENABLED");
export const isSmsAccountSignupEnabled = () => smsFlag("SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED");
export const isSmsBillingEnabled = () => smsFlag("SENDFABLE_SMS_BILLING_ENABLED");
export const isSmsActivationPurchaseEnabled = () =>
  smsFlag("SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED");
export const isSmsRegistrationEnabled = () => smsFlag("SENDFABLE_SMS_REGISTRATION_ENABLED");
export const isSmsNumberPurchaseEnabled = () => smsFlag("SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED");
export const isSmsLiveSendingEnabled = () => smsFlag("SENDFABLE_SMS_LIVE_SENDING_ENABLED");
export const isSmsInboundEnabled = () => smsFlag("SENDFABLE_SMS_INBOUND_ENABLED");
export const isSmsReplyEnabled = () => smsFlag("SENDFABLE_SMS_REPLY_ENABLED");
export const isSmsAdminEnabled = () => smsFlag("SENDFABLE_SMS_ADMIN_ENABLED");
export const isSmsMockProviderEnabled = () => smsFlag("SENDFABLE_SMS_MOCK_PROVIDER_ENABLED");

export class SmsFeatureDisabledError extends Error {
  readonly status = 403 as const;
  constructor(flagName: SmsFlagName) {
    super(`SMS feature is not enabled (${flagName}=false).`);
    this.name = "SmsFeatureDisabledError";
  }
}

export function assertSmsFlag(name: SmsFlagName): void {
  if (!smsFlag(name)) throw new SmsFeatureDisabledError(name);
}
