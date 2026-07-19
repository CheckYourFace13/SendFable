import Stripe from "stripe";
import type { Plan } from "@prisma/client";

let stripe: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    stripe = null;
    return null;
  }
  stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  return stripe;
}

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export type PaidPlan = Exclude<Plan, "FREE">;
export type BillingInterval = "month" | "year";

export function priceIdFor(plan: PaidPlan, interval: BillingInterval): string | null {
  const key = `STRIPE_PRICE_${plan}_${interval === "month" ? "MONTHLY" : "YEARLY"}`;
  return process.env[key] || null;
}

export function planFromPriceId(priceId: string): { plan: PaidPlan; interval: BillingInterval } | null {
  const map: Array<{ env: string; plan: PaidPlan; interval: BillingInterval }> = [
    { env: "STRIPE_PRICE_STARTER_MONTHLY", plan: "STARTER", interval: "month" },
    { env: "STRIPE_PRICE_STARTER_YEARLY", plan: "STARTER", interval: "year" },
    { env: "STRIPE_PRICE_GROWTH_MONTHLY", plan: "GROWTH", interval: "month" },
    { env: "STRIPE_PRICE_GROWTH_YEARLY", plan: "GROWTH", interval: "year" },
    { env: "STRIPE_PRICE_PRO_MONTHLY", plan: "PRO", interval: "month" },
    { env: "STRIPE_PRICE_PRO_YEARLY", plan: "PRO", interval: "year" },
  ];
  for (const row of map) {
    if (process.env[row.env] === priceId) return { plan: row.plan, interval: row.interval };
  }
  return null;
}
