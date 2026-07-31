/**
 * Hard guards for customer-facing SMS billing actions (SF-019E).
 * Fail closed: missing flags or missing price IDs refuse the action.
 */

import {
  isSmsAccountSignupEnabled,
  isSmsActivationPurchaseEnabled,
  isSmsBillingEnabled,
  isSmsCodeEnabled,
} from "@/lib/sms/flags";
import {
  SMS_ACTIVATION_PRICE_ENV,
  SMS_INBOUND_OVERAGE_PRICE_ENV,
  SMS_METERED_PRICE_ENV_KEYS,
  SMS_PRICE_ENV_KEYS,
} from "@/lib/sms/stripe";
import { SMS_PLANS, type SmsPlanKey } from "@/lib/sms/pricing";

export class SmsBillingGuardError extends Error {
  readonly status: 403 | 404 | 503;
  constructor(message: string, status: 403 | 404 | 503 = 403) {
    super(message);
    this.name = "SmsBillingGuardError";
    this.status = status;
  }
}

/** Customer may see onboarding UI (still not public marketing). */
export function assertSmsOnboardingSurface(): void {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) {
    throw new SmsBillingGuardError("SMS onboarding is not available", 404);
  }
}

/**
 * Any path that would create Stripe Checkout / subscription / invoice /
 * meter events for SMS must pass this. Defaults refuse.
 */
export function assertSmsLiveBillingWritesAllowed(): void {
  if (!isSmsCodeEnabled()) {
    throw new SmsBillingGuardError("SMS is not available", 404);
  }
  if (!isSmsAccountSignupEnabled()) {
    throw new SmsBillingGuardError("SMS signup is not available", 404);
  }
  if (!isSmsBillingEnabled()) {
    throw new SmsBillingGuardError("SMS live billing is not enabled", 403);
  }
  if (!isSmsActivationPurchaseEnabled()) {
    throw new SmsBillingGuardError("SMS activation purchase is not enabled", 403);
  }
}

/** Fail closed if any required live price ID is missing for a plan. */
export function assertSmsCatalogConfigured(plan: SmsPlanKey, bundled: boolean): void {
  if (!(plan in SMS_PLANS)) {
    throw new SmsBillingGuardError("Invalid SMS plan", 403);
  }
  const keys = SMS_PRICE_ENV_KEYS[plan];
  const fixed = process.env[bundled && keys.bundled ? keys.bundled : keys.standard]?.trim();
  const metered = process.env[SMS_METERED_PRICE_ENV_KEYS[plan]]?.trim();
  const overage = process.env[SMS_INBOUND_OVERAGE_PRICE_ENV]?.trim();
  const activation = process.env[SMS_ACTIVATION_PRICE_ENV]?.trim();
  if (!fixed || !metered || !overage || !activation) {
    throw new SmsBillingGuardError("SMS Stripe catalog is not fully configured", 503);
  }
  // Email prices must never be selected for SMS
  for (const id of [fixed, metered, overage, activation]) {
    if (id.startsWith("price_") === false) {
      throw new SmsBillingGuardError("SMS price ID format invalid", 503);
    }
  }
}

export function smsBillingFlagsSnapshot() {
  return {
    code: isSmsCodeEnabled(),
    accountSignup: isSmsAccountSignupEnabled(),
    billing: isSmsBillingEnabled(),
    activationPurchase: isSmsActivationPurchaseEnabled(),
    liveWritesAllowed:
      isSmsCodeEnabled() &&
      isSmsAccountSignupEnabled() &&
      isSmsBillingEnabled() &&
      isSmsActivationPurchaseEnabled(),
  };
}
