/** Early-launch gates until SES + Stripe are intentionally enabled. */
export function isEarlyLaunch(): boolean {
  if (process.env.EARLY_LAUNCH === "false" || process.env.EARLY_LAUNCH === "0") {
    return false;
  }
  // Default on in production when SES credentials are absent.
  if (process.env.NODE_ENV === "production") {
    const hasSes = !!(
      process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()
    );
    if (!hasSes) return true;
  }
  return process.env.EARLY_LAUNCH === "true" || process.env.EARLY_LAUNCH === "1";
}

export function publicSignupAllowed(): boolean {
  if (process.env.ALLOW_PUBLIC_SIGNUP === "true") return true;
  return !isEarlyLaunch();
}

export function externalEmailActive(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
}

export function stripeBillingActive(): boolean {
  // Keys may be present while public Checkout remains gated off.
  const raw = process.env.STRIPE_BILLING_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
