/**
 * First-party product analytics — privacy-conscious funnel events.
 *
 * Rules:
 * - Event names + numeric/boolean props only
 * - Never send emails, phones, subjects, bodies, mailing addresses,
 *   sender identities, Stripe IDs, or tokens
 * - Disabled unless ANALYTICS_ENABLED=true
 * - Optional persistence to ProductAnalyticsEvent when DB is available
 */

export const ANALYTICS_EVENTS = [
  // Public
  "homepage_view",
  "pricing_view",
  "comparison_view",
  "comparison_cta_click",
  "mailchimp_calculator_use",
  "guide_view",
  "signup_cta_click",
  "signup_start",
  "signup_complete",
  // Activation
  "workspace_created",
  "onboarding_started",
  "onboarding_completed",
  "mailing_address_added",
  "sender_setup_started",
  "sender_verified",
  "contact_created",
  "contact_imported",
  "signup_form_created",
  "template_selected",
  "campaign_created",
  "test_send_completed",
  "first_campaign_sent",
  // Revenue
  "checkout_started",
  "checkout_completed",
  "plan_upgraded",
  "plan_downgraded",
  "subscription_cancelled",
  "referral_attributed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Legacy aliases kept for existing call sites */
const LEGACY_MAP: Record<string, AnalyticsEvent> = {
  pricing_viewed: "pricing_view",
  signup_started: "signup_start",
  signup_completed: "signup_complete",
  auth_completed: "signup_complete",
  csv_import_completed: "contact_imported",
  test_email_sent: "test_send_completed",
  subscription_activated: "checkout_completed",
  subscription_canceled: "subscription_cancelled",
};

export type AnalyticsProps = Record<string, number | boolean | string | undefined>;

export type AnalyticsContext = {
  path?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  sessionId?: string;
  firstTouch?: string;
  lastTouch?: string;
};

export function analyticsEnabled(): boolean {
  return process.env.ANALYTICS_ENABLED === "true";
}

export function normalizeEventName(event: string): AnalyticsEvent | null {
  if ((ANALYTICS_EVENTS as readonly string[]).includes(event)) {
    return event as AnalyticsEvent;
  }
  return LEGACY_MAP[event] ?? null;
}

function scrubProps(props?: AnalyticsProps): Record<string, number | boolean | string> {
  if (!props) return {};
  const out: Record<string, number | boolean | string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    // Hard block common PII-shaped keys
    if (/email|phone|subject|body|address|token|secret|stripe|password/i.test(k)) continue;
    if (typeof v === "string" && v.length > 120) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    out[k] = v;
  }
  return out;
}

type DeliverFn = (
  event: AnalyticsEvent,
  props: Record<string, number | boolean | string>,
  ctx: AnalyticsContext
) => void | Promise<void>;

let deliverImpl: DeliverFn | null = null;

/** Allow server bootstrap to register DB persistence without circular imports. */
export function registerAnalyticsDeliver(fn: DeliverFn) {
  deliverImpl = fn;
}

export function trackEvent(
  event: string,
  props?: AnalyticsProps,
  ctx: AnalyticsContext = {}
): void {
  if (!analyticsEnabled()) return;
  const name = normalizeEventName(event);
  if (!name) return;
  const clean = scrubProps(props);
  // Structured log (no PII by scrubber)
  console.log("[analytics]", name, clean, {
    path: ctx.path,
    utm: ctx.utmCampaign || ctx.utmSource,
  });
  if (deliverImpl) {
    void Promise.resolve(deliverImpl(name, clean, ctx)).catch(() => {
      /* never break product flows */
    });
  }
}

/** Funnel stages for admin reporting */
export const FUNNEL_STAGES: { id: string; events: AnalyticsEvent[] }[] = [
  { id: "organic_landing", events: ["homepage_view", "pricing_view", "comparison_view", "guide_view"] },
  { id: "signup", events: ["signup_start", "signup_complete"] },
  { id: "workspace", events: ["workspace_created", "onboarding_completed"] },
  { id: "sender_verified", events: ["sender_verified"] },
  { id: "contacts_added", events: ["contact_created", "contact_imported"] },
  { id: "campaign_created", events: ["campaign_created"] },
  { id: "first_campaign_sent", events: ["first_campaign_sent"] },
  { id: "paid_conversion", events: ["checkout_completed", "plan_upgraded"] },
];
