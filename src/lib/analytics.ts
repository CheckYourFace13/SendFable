/**
 * First-party product analytics — privacy-conscious funnel events.
 *
 * Rules:
 * - Event names + numeric/boolean/string props only (scrubbed)
 * - Never send emails, phones, subjects, bodies, mailing addresses,
 *   sender identities, Stripe IDs, tokens, or full IP addresses
 * - Disabled unless ANALYTICS_ENABLED=true
 * - Failures fail open (never throw into product flows)
 */

export const ANALYTICS_EVENTS = [
  // Public
  "homepage_view",
  "pricing_view",
  "comparison_view",
  "comparison_cta_click",
  "mailchimp_calculator_use",
  "guide_view",
  "industry_page_view",
  "template_page_view",
  "signup_cta_click",
  "signup_start",
  "signup_complete",
  "login_clicked",
  "plan_cta_clicked",
  // Activation
  "workspace_created",
  "onboarding_started",
  "onboarding_step_completed",
  "onboarding_skipped",
  "onboarding_completed",
  "mailing_address_added",
  "sender_setup_started",
  "sender_verified",
  "contact_created",
  "contact_imported",
  "signup_form_created",
  "template_selected",
  "campaign_created",
  "campaign_editor_opened",
  "campaign_previewed",
  "test_send_completed",
  "first_campaign_scheduled",
  "first_campaign_sent",
  "second_campaign_sent",
  // Monetization
  "usage_80_percent",
  "usage_90_percent",
  "free_limit_reached",
  "upgrade_prompt_viewed",
  "upgrade_prompt_clicked",
  "pricing_from_app_viewed",
  "checkout_started",
  "checkout_completed",
  "subscription_started",
  "plan_upgraded",
  "plan_downgraded",
  "subscription_cancelled",
  "referral_attributed",
  "referral_badge_click",
  "feedback_submitted",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

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
  referrerDomain?: string;
  deviceCategory?: "mobile" | "tablet" | "desktop" | "unknown";
  qaTraffic?: boolean;
};

export function analyticsEnabled(): boolean {
  return process.env.ANALYTICS_ENABLED === "true";
}

export function analyticsRetentionDays(): number {
  const raw = Number(process.env.ANALYTICS_RETENTION_DAYS || "90");
  if (!Number.isFinite(raw) || raw < 7) return 90;
  return Math.min(Math.floor(raw), 730);
}

export function normalizeEventName(event: string): AnalyticsEvent | null {
  if ((ANALYTICS_EVENTS as readonly string[]).includes(event)) {
    return event as AnalyticsEvent;
  }
  return LEGACY_MAP[event] ?? null;
}

export function scrubProps(props?: AnalyticsProps): Record<string, number | boolean | string> {
  if (!props) return {};
  const out: Record<string, number | boolean | string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    if (/email|phone|subject|body|address|token|secret|stripe|password|ip\b/i.test(k)) continue;
    if (typeof v === "string" && v.length > 120) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    out[k] = v;
  }
  return out;
}

const BOT_UA =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|redditbot|applebot|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|curl|wget|python-requests|httpclient|headless/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length < 3) return true;
  return BOT_UA.test(ua);
}

export function deviceCategoryFromUa(ua: string | null | undefined): AnalyticsContext["deviceCategory"] {
  if (!ua) return "unknown";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|iphone|android(?!.*tablet)/i.test(ua)) return "mobile";
  return "desktop";
}

export function referrerDomainFrom(referer: string | null | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    const host = new URL(referer).hostname.toLowerCase();
    if (!host || host.endsWith("sendfable.com")) return undefined;
    return host.slice(0, 120);
  } catch {
    return undefined;
  }
}

type DeliverFn = (
  event: AnalyticsEvent,
  props: Record<string, number | boolean | string>,
  ctx: AnalyticsContext
) => void | Promise<void>;

let deliverImpl: DeliverFn | null = null;

export function registerAnalyticsDeliver(fn: DeliverFn) {
  deliverImpl = fn;
}

export function trackEvent(
  event: string,
  props?: AnalyticsProps,
  ctx: AnalyticsContext = {}
): void {
  try {
    if (!analyticsEnabled()) return;
    const name = normalizeEventName(event);
    if (!name) return;
    const clean = scrubProps(props);
    if (ctx.qaTraffic) clean.qa = true;
    if (ctx.referrerDomain) clean.referrerDomain = ctx.referrerDomain.slice(0, 120);
    if (ctx.deviceCategory) clean.deviceCategory = ctx.deviceCategory;
    if (deliverImpl) {
      void Promise.resolve(deliverImpl(name, clean, ctx)).catch(() => undefined);
    }
  } catch {
    /* fail open */
  }
}

export const FUNNEL_STAGES: { id: string; events: AnalyticsEvent[] }[] = [
  { id: "organic_landing", events: ["homepage_view", "pricing_view", "comparison_view", "guide_view"] },
  { id: "signup", events: ["signup_start", "signup_complete"] },
  { id: "workspace", events: ["workspace_created", "onboarding_completed"] },
  { id: "sender_verified", events: ["sender_verified"] },
  { id: "contacts_added", events: ["contact_created", "contact_imported"] },
  { id: "campaign_created", events: ["campaign_created"] },
  { id: "first_campaign_sent", events: ["first_campaign_sent"] },
  { id: "second_campaign_sent", events: ["second_campaign_sent"] },
  { id: "upgrade_intent", events: ["upgrade_prompt_viewed", "upgrade_prompt_clicked", "pricing_from_app_viewed"] },
  { id: "checkout", events: ["checkout_started"] },
  { id: "paid_conversion", events: ["checkout_completed", "plan_upgraded", "subscription_started"] },
];
