import type { Plan } from "@prisma/client";

export interface PlanConfig {
  name: string;
  emailsPerMonth: number;
  contactCap: number;
  monthlyPrice: number;
  yearlyPrice: number;
  seats: number;
  customDomains: boolean;
  badge: boolean; // "Sent with Sendfable" footer badge
  /** Absolute per-day ceiling regardless of ramp level */
  dailyCeiling: number;
}

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    name: "Free",
    emailsPerMonth: 2_000,
    contactCap: 500,
    monthlyPrice: 0,
    yearlyPrice: 0,
    seats: 1,
    customDomains: false,
    badge: true,
    dailyCeiling: 2_000,
  },
  STARTER: {
    name: "Starter",
    emailsPerMonth: 15_000,
    contactCap: 2_500,
    monthlyPrice: 9,
    yearlyPrice: 90,
    seats: 1,
    customDomains: false,
    badge: false,
    dailyCeiling: 15_000,
  },
  GROWTH: {
    name: "Growth",
    emailsPerMonth: 60_000,
    contactCap: 10_000,
    monthlyPrice: 19,
    yearlyPrice: 190,
    seats: 1,
    customDomains: true,
    badge: false,
    dailyCeiling: 60_000,
  },
  PRO: {
    name: "Pro",
    emailsPerMonth: 200_000,
    contactCap: 30_000,
    monthlyPrice: 49,
    yearlyPrice: 490,
    seats: 10,
    customDomains: true,
    badge: false,
    dailyCeiling: 200_000,
  },
};

/**
 * New-account ramp: level 1 starts at 500 emails/day and doubles with each
 * clean completed campaign (bounce/complaint rates under threshold), up to the
 * plan's daily ceiling.
 */
export function rampDailyLimit(rampLevel: number, plan: Plan): number {
  const base = 500 * Math.pow(2, Math.max(0, rampLevel - 1));
  return Math.min(base, PLANS[plan].dailyCeiling);
}

/** Ramp level at which the plan ceiling is reached (no further doubling needed). */
export function maxRampLevel(plan: Plan): number {
  let level = 1;
  while (500 * Math.pow(2, level - 1) < PLANS[plan].dailyCeiling) level++;
  return level;
}

export const BOUNCE_PAUSE_THRESHOLD = 0.05; // 5%
export const COMPLAINT_PAUSE_THRESHOLD = 0.001; // 0.1%

/** Typical Mailchimp Standard-plan pricing by contact count (as of 2026). */
export const MAILCHIMP_PRICE_TABLE: Array<{ contacts: number; price: number }> = [
  { contacts: 500, price: 20 },
  { contacts: 1_500, price: 30 },
  { contacts: 2_500, price: 45 },
  { contacts: 5_000, price: 75 },
  { contacts: 10_000, price: 105 },
  { contacts: 15_000, price: 160 },
  { contacts: 20_000, price: 210 },
  { contacts: 30_000, price: 285 },
  { contacts: 50_000, price: 385 },
];

export function mailchimpPriceFor(contacts: number): number {
  for (const row of MAILCHIMP_PRICE_TABLE) {
    if (contacts <= row.contacts) return row.price;
  }
  return MAILCHIMP_PRICE_TABLE[MAILCHIMP_PRICE_TABLE.length - 1].price;
}

export function sendfablePlanFor(contacts: number): { plan: Plan; price: number } {
  if (contacts <= PLANS.FREE.contactCap) return { plan: "FREE", price: 0 };
  if (contacts <= PLANS.STARTER.contactCap) return { plan: "STARTER", price: PLANS.STARTER.monthlyPrice };
  if (contacts <= PLANS.GROWTH.contactCap) return { plan: "GROWTH", price: PLANS.GROWTH.monthlyPrice };
  return { plan: "PRO", price: PLANS.PRO.monthlyPrice };
}
