/**
 * First-party product analytics interface — intentionally DISABLED at launch.
 *
 * Decision (2026-07-24): no third-party analytics vendor is approved for
 * Sendfable, and the Plausible instance on the shared VPS belongs to another
 * product (RentalNoodle) and must not be reused. Rather than adding an
 * unapproved vendor, this typed interface exists so funnel instrumentation can
 * be wired later without touching call sites. Enable by setting
 * ANALYTICS_ENABLED=true and implementing `deliver()`.
 *
 * Privacy rules for any future implementation:
 * - Event names and numeric counts only.
 * - Never send email addresses, contact lists, campaign subjects/content,
 *   Stripe IDs, tokens, or per-recipient open/click data.
 */

export type AnalyticsEvent =
  | "pricing_viewed"
  | "signup_started"
  | "signup_completed"
  | "auth_completed"
  | "workspace_created"
  | "sender_setup_started"
  | "sender_verified"
  | "csv_import_completed" // props: { rows: number } counts only
  | "campaign_created"
  | "test_email_sent"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_canceled"
  | "first_campaign_sent";

export function analyticsEnabled(): boolean {
  return process.env.ANALYTICS_ENABLED === "true";
}

/** No-op until a provider is approved. Safe to call from server code. */
export function trackEvent(event: AnalyticsEvent, props?: Record<string, number | boolean>): void {
  if (!analyticsEnabled()) return;
  // Placeholder delivery: structured log only (no PII by type contract).
  console.log("[analytics]", event, props ?? {});
}
