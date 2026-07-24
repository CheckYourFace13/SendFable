/**
 * Explicit production gate for Stripe Checkout creation.
 * Default: billing disabled when STRIPE_BILLING_ENABLED is missing/false.
 * Owner-only controlled live Checkout when STRIPE_OWNER_TEST_ENABLED=true.
 */
export const STRIPE_BILLING_DISABLED_MESSAGE = "Billing is not activated yet.";

const OWNER_TEST_EMAIL = "chris@iscreamstudio.com";

function envFlagTrue(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isStripeBillingEnabled(): boolean {
  const raw = process.env.STRIPE_BILLING_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === "") return false;
  return envFlagTrue("STRIPE_BILLING_ENABLED");
}

export function isStripeOwnerTestEnabled(): boolean {
  const raw = process.env.STRIPE_OWNER_TEST_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === "") return false;
  return envFlagTrue("STRIPE_OWNER_TEST_ENABLED");
}

export function canCreateCheckoutSession(userEmail: string): boolean {
  if (isStripeBillingEnabled()) return true;
  if (
    isStripeOwnerTestEnabled() &&
    userEmail.trim().toLowerCase() === OWNER_TEST_EMAIL
  ) {
    return true;
  }
  return false;
}

export function assertLiveStripeSecretKey(): void {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // Enforce live keys only in production deployments (local/dev may use sk_test_).
  if (process.env.NODE_ENV !== "production") return;
  if (key.startsWith("sk_test_")) {
    throw new Error("Sandbox Stripe keys are not allowed in this production deployment");
  }
  if (!key.startsWith("sk_live_")) {
    throw new Error("STRIPE_SECRET_KEY must be a live secret key (sk_live_)");
  }
}

export function expectedStripeAccountId(): string | null {
  return process.env.STRIPE_EXPECTED_ACCOUNT_ID?.trim() || null;
}
