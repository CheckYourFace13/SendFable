import { PAID_PLAN_ORDER, type PaidPlanKey } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export type BillingInterval = "month" | "year";

export type PlanCheckoutIntent = {
  plan: PaidPlanKey;
  interval: BillingInterval;
};

export function isPaidPlanKey(value: unknown): value is PaidPlanKey {
  return typeof value === "string" && (PAID_PLAN_ORDER as readonly string[]).includes(value);
}

export function parseBillingInterval(value: unknown): BillingInterval {
  return value === "year" || value === "annual" || value === "yearly" ? "year" : "month";
}

/** Read plan + interval from signup/pricing query params. */
export function parsePlanCheckoutIntent(search: {
  get(name: string): string | null;
}): PlanCheckoutIntent | null {
  const raw = search.get("plan")?.trim().toUpperCase();
  if (!isPaidPlanKey(raw)) return null;
  return { plan: raw, interval: parseBillingInterval(search.get("interval")) };
}

/** Public CTA from pricing → signup (or free signup). */
export function publicPlanCtaHref(plan: Plan, annual: boolean): string {
  if (plan === "FREE") return "/signup";
  const q = new URLSearchParams({
    plan,
    interval: annual ? "year" : "month",
  });
  return `/signup?${q.toString()}`;
}

/** After signup/login, land on billing ready to checkout the same plan. */
export function billingCheckoutPath(intent: PlanCheckoutIntent): string {
  const q = new URLSearchParams({
    plan: intent.plan,
    interval: intent.interval,
    checkout: "1",
  });
  return `/billing?${q.toString()}`;
}
