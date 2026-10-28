import type { FormFieldDef } from "@/lib/forms/fields";
import { isWithinSendWindow } from "@/lib/acquisition/schedule";

export const UTILITY_SIGNUP_COPY_VERSION = "utility_signup";
export const UTILITY_SIGNUP_LANDING = "/try/signup-tool";

export const TRY_BUSINESS_TYPES = [
  "band",
  "restaurant",
  "brewery",
  "contractor",
  "retail",
  "local",
  "other",
] as const;

export type TryBusinessType = (typeof TRY_BUSINESS_TYPES)[number];

export type TrySignupConfig = {
  businessType: TryBusinessType;
  audienceName: string;
  extraAudienceName: string;
  headline: string;
  buttonLabel: string;
  display: "inline" | "popup";
  firstName: boolean;
  phone: boolean;
  smsConsent: boolean;
  platform: "wordpress" | "wix" | "squarespace" | "webflow" | "other";
};

export const TRY_INTENT_EVENTS = [
  "builder_started",
  "builder_previewed",
  "activation_clicked",
  "signup_started",
  "try_page_view",
  "customization_changed",
  "platform_selected",
  "make_live_clicked",
] as const;

export type TryIntentEvent = (typeof TRY_INTENT_EVENTS)[number];

export type TrySignupEvents = Partial<Record<TryIntentEvent, string>>;

const EXAMPLES: Record<
  TryBusinessType,
  {
    label: string;
    audience: string;
    extra: string;
    headline: string;
    button: string;
    siteName: string;
    tagline: string;
    pitch: string;
  }
> = {
  band: {
    label: "Band / music",
    audience: "Fans",
    extra: "Venues",
    headline: "Join the fan list",
    button: "Join the fan list",
    siteName: "KarPool Band",
    tagline: "Get show dates & band news.",
    pitch:
      "Put a signup on your site for fans. Keep a separate audience for venues. When you post a new show, Scribe can prepare the email for you.",
  },
  restaurant: {
    label: "Restaurant",
    audience: "Customers",
    extra: "Private Events",
    headline: "Get the specials",
    button: "Join",
    siteName: "Your restaurant",
    tagline: "Tonight's specials, in your inbox.",
    pitch:
      "Collect regulars from your website. Keep private-event inquiries separate. When you post a special, Scribe can prepare the campaign.",
  },
  brewery: {
    label: "Brewery",
    audience: "Taproom",
    extra: "Beer Releases",
    headline: "Get release notes",
    button: "Join",
    siteName: "Your taproom",
    tagline: "New pours and events.",
    pitch:
      "Build a taproom list and a release list. Add a signup to your site. When a new beer or event appears, Scribe can draft the announcement.",
  },
  contractor: {
    label: "Contractor",
    audience: "Customers",
    extra: "Leads",
    headline: "Request a reminder",
    button: "Join",
    siteName: "Your business",
    tagline: "Updates from the shop.",
    pitch:
      "Collect interested customers from your site, keep leads in another audience, and send seasonal reminders without building a CRM.",
  },
  retail: {
    label: "Retail",
    audience: "Customers",
    extra: "VIP",
    headline: "Get new arrivals",
    button: "Join",
    siteName: "Your shop",
    tagline: "New arrivals, first.",
    pitch:
      "Collect customers, announce new products or promotions, and keep the list exportable.",
  },
  local: {
    label: "Local event business",
    audience: "Attendees",
    extra: "Partners",
    headline: "Stay in the loop",
    button: "Join",
    siteName: "Your events",
    tagline: "Dates, doors, and updates.",
    pitch:
      "Keep attendees and partners in separate audiences. When your site lists a new date, Scribe can draft the update.",
  },
  other: {
    label: "Local business",
    audience: "Customers",
    extra: "Leads",
    headline: "Join the list",
    button: "Join",
    siteName: "Your website",
    tagline: "Stay in the loop.",
    pitch:
      "Collect people from your website, keep groups separate, and let Scribe prepare campaigns from new content.",
  },
};

export function tryBusinessLabel(type: TryBusinessType): string {
  return EXAMPLES[type].label;
}

export function tryBusinessPitch(type: TryBusinessType): string {
  return EXAMPLES[type].pitch;
}

export function trySiteChrome(
  type: TryBusinessType,
  businessName?: string | null
): { siteName: string; tagline: string } {
  const ex = EXAMPLES[type];
  const name = (businessName || "").trim();
  return { siteName: name || ex.siteName, tagline: ex.tagline };
}

const PLATFORMS = ["wordpress", "wix", "squarespace", "webflow", "other"] as const;

export function defaultTryConfig(type: TryBusinessType = "local"): TrySignupConfig {
  const ex = EXAMPLES[type];
  return {
    businessType: type,
    audienceName: ex.audience,
    extraAudienceName: ex.extra,
    headline: ex.headline,
    buttonLabel: ex.button,
    display: "inline",
    firstName: false,
    phone: false,
    smsConsent: false,
    platform: "wordpress",
  };
}

export function categoryToTryType(category?: string | null): TryBusinessType {
  const c = (category || "").toLowerCase();
  if (c.includes("band") || c.includes("music") || c.includes("venue")) return "band";
  if (c === "restaurant" || c === "cafe" || c === "bakery") return "restaurant";
  if (c === "brewery" || c === "taproom") return "brewery";
  if (c === "contractor") return "contractor";
  if (c === "retail") return "retail";
  if (c === "events" || c === "local_events") return "local";
  if (TRY_BUSINESS_TYPES.includes(c as TryBusinessType)) return c as TryBusinessType;
  return "other";
}

export function sanitizeTryConfig(raw: unknown): TrySignupConfig {
  const input = raw && typeof raw === "object" ? (raw as Partial<TrySignupConfig>) : {};
  const type = TRY_BUSINESS_TYPES.includes(input.businessType as TryBusinessType)
    ? (input.businessType as TryBusinessType)
    : "other";
  const fallback = defaultTryConfig(type);
  const name = String(input.audienceName || fallback.audienceName).trim().slice(0, 40);
  const extra = String(input.extraAudienceName || fallback.extraAudienceName).trim().slice(0, 40);
  return {
    businessType: type,
    audienceName: name || fallback.audienceName,
    extraAudienceName: extra && extra.toLowerCase() !== name.toLowerCase() ? extra : fallback.extraAudienceName,
    headline: String(input.headline || fallback.headline).trim().slice(0, 80) || fallback.headline,
    buttonLabel: String(input.buttonLabel || fallback.buttonLabel).trim().slice(0, 32) || "Join",
    display: input.display === "popup" ? "popup" : "inline",
    firstName: input.firstName !== undefined ? Boolean(input.firstName) : fallback.firstName,
    phone: input.phone !== undefined ? Boolean(input.phone) : fallback.phone,
    smsConsent: Boolean(input.phone) && Boolean(input.smsConsent),
    platform: PLATFORMS.includes(input.platform as (typeof PLATFORMS)[number])
      ? (input.platform as TrySignupConfig["platform"])
      : "wordpress",
  };
}

export function fieldsFromTryConfig(config: TrySignupConfig): FormFieldDef[] {
  const fields: FormFieldDef[] = [
    { key: "email", label: "Email", type: "email", required: true },
  ];
  if (config.firstName) {
    fields.push({ key: "firstName", label: "First name", type: "text", required: false });
  }
  if (config.phone) {
    fields.push({ key: "phone", label: "Phone", type: "phone", required: false });
  }
  return fields;
}

export function scheduleTryFollowUpAt(now = new Date(), timeZone = "America/Chicago"): Date {
  const later = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  if (isWithinSendWindow(later, timeZone).ok) return later;
  for (let i = 1; i <= 6; i++) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    candidate.setUTCHours(15, 0, 0, 0);
    if (isWithinSendWindow(candidate, timeZone).ok) return candidate;
  }
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

export function tryConfigMeaningful(config: TrySignupConfig, events: TrySignupEvents): boolean {
  if (events.activation_clicked || events.make_live_clicked || events.builder_previewed || events.customization_changed) {
    return true;
  }
  const fresh = defaultTryConfig(config.businessType);
  return (
    config.audienceName !== fresh.audienceName ||
    config.display !== "inline" ||
    config.phone ||
    config.firstName
  );
}
