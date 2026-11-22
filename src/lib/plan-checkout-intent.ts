import { PAID_PLAN_ORDER, type PaidPlanKey } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export type BillingInterval = "month" | "year";

export type PlanCheckoutIntent = {
  plan: PaidPlanKey;
  interval: BillingInterval;
  /** Customer-facing promo code (e.g. TEXT20), when present. */
  code?: string;
};

export function isPaidPlanKey(value: unknown): value is PaidPlanKey {
  return typeof value === "string" && (PAID_PLAN_ORDER as readonly string[]).includes(value);
}

export function parseBillingInterval(value: unknown): BillingInterval {
  return value === "year" || value === "annual" || value === "yearly" ? "year" : "month";
}

/** Normalize a public promo code from query params. */
export function parsePromoCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  if (!code || code.length > 32) return undefined;
  if (!/^[A-Z0-9_-]+$/.test(code)) return undefined;
  return code;
}

/** Read plan + interval (+ optional code) from signup/pricing query params. */
export function parsePlanCheckoutIntent(search: {
  get(name: string): string | null;
}): PlanCheckoutIntent | null {
  const raw = search.get("plan")?.trim().toUpperCase();
  if (!isPaidPlanKey(raw)) return null;
  const code = parsePromoCode(search.get("code"));
  return {
    plan: raw,
    interval: parseBillingInterval(search.get("interval")),
    ...(code ? { code } : {}),
  };
}

/** Public CTA from pricing → signup (or free signup). */
export function publicPlanCtaHref(plan: Plan, annual: boolean, code?: string): string {
  if (plan === "FREE") return "/signup";
  const q = new URLSearchParams({
    plan,
    interval: annual ? "year" : "month",
  });
  if (code) q.set("code", code);
  return `/signup?${q.toString()}`;
}

/** After signup/login, land on billing ready to checkout the same plan. */
export function billingCheckoutPath(intent: PlanCheckoutIntent): string {
  const q = new URLSearchParams({
    plan: intent.plan,
    interval: intent.interval,
    checkout: "1",
  });
  if (intent.code) q.set("code", intent.code);
  return `/billing?${q.toString()}`;
}

/** Resolve a customer-facing code to a Stripe promotion_code id (promo_…). */
export function stripePromotionIdForCode(code: string | undefined | null): string | undefined {
  const normalized = parsePromoCode(code);
  if (!normalized) return undefined;
  if (normalized === "TEXT20") {
    const id = process.env.STRIPE_PROMO_TEXT20?.trim();
    return id || undefined;
  }
  return undefined;
}
