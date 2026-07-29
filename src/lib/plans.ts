import type { Plan } from "@prisma/client";

export interface PlanConfig {
  name: string;
  emailsPerMonth: number;
  contactCap: number;
  /** USD dollars (not cents) for display math */
  monthlyPrice: number;
  /** USD dollars per year; 0 for Free */
  yearlyPrice: number;
  /**
   * Max memberships for the workspace owner’s plan.
   * Public pricing focuses on contacts and monthly email allotments.
   */
  seats: number;
  customDomains: boolean;
  badge: boolean; // "Sent with Sendfable" footer badge
  /** Absolute per-day ceiling regardless of ramp level */
  dailyCeiling: number;
}

/** Display order for public pricing and billing. */
export const PLAN_ORDER: Plan[] = ["FREE", "STARTER", "GROWTH", "PRO", "PRO_PLUS"];

export const PAID_PLAN_ORDER = ["STARTER", "GROWTH", "PRO", "PRO_PLUS"] as const;
export type PaidPlanKey = (typeof PAID_PLAN_ORDER)[number];

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    name: "Free",
    emailsPerMonth: 1_000,
    contactCap: 500,
    monthlyPrice: 0,
    yearlyPrice: 0,
    seats: 1,
    customDomains: false,
    badge: true,
    dailyCeiling: 1_000,
  },
  STARTER: {
    name: "Starter",
    emailsPerMonth: 10_000,
    contactCap: 2_500,
    monthlyPrice: 12,
    yearlyPrice: 120,
    seats: 1,
    customDomains: false,
    badge: false,
    dailyCeiling: 10_000,
  },
  GROWTH: {
    name: "Growth",
    emailsPerMonth: 40_000,
    contactCap: 10_000,
    monthlyPrice: 29,
    yearlyPrice: 290,
    seats: 1,
    customDomains: true,
    badge: false,
    dailyCeiling: 40_000,
  },
  PRO: {
    name: "Pro",
    emailsPerMonth: 80_000,
    contactCap: 20_000,
    monthlyPrice: 69,
    yearlyPrice: 690,
    seats: 5,
    customDomains: true,
    badge: false,
    dailyCeiling: 80_000,
  },
  PRO_PLUS: {
    name: "Pro Plus",
    emailsPerMonth: 200_000,
    contactCap: 40_000,
    monthlyPrice: 99,
    yearlyPrice: 990,
    seats: 10,
    customDomains: true,
    badge: false,
    dailyCeiling: 200_000,
  },
};

/** Stripe unit amounts in cents (authoritative for product setup scripts). */
export const PLAN_STRIPE_CENTS: Record<
  PaidPlanKey,
  { monthly: number; annual: number }
> = {
  STARTER: { monthly: 1_200, annual: 12_000 },
  GROWTH: { monthly: 2_900, annual: 29_000 },
  PRO: { monthly: 6_900, annual: 69_000 },
  PRO_PLUS: { monthly: 9_900, annual: 99_000 },
};

/**
 * Customer-facing allowance clarification.
 * Matches server reset: calendar month (UTC), unused sends do not roll over.
 */
export const PLAN_ALLOWANCE_EXPLANATION =
  "Contact and monthly email allowances are maximum plan limits. One email sent to one contact counts as one email. Allowances reset each calendar month, and unused sends do not roll over.";

export const ANNUAL_SAVINGS_LABEL = "Two months free with annual billing.";

export function upToContacts(plan: Plan): string {
  return `Up to ${PLANS[plan].contactCap.toLocaleString()} contacts`;
}

export function upToEmails(plan: Plan): string {
  return `Up to ${PLANS[plan].emailsPerMonth.toLocaleString()} emails/month`;
}

export function annualEffectiveMonthly(plan: Plan): number {
  const p = PLANS[plan];
  if (!p.yearlyPrice) return 0;
  return Math.round(p.yearlyPrice / 12);
}

/** True when annual price equals 10× monthly (two months free). */
export function annualIsTwoMonthsFree(plan: Plan): boolean {
  const p = PLANS[plan];
  if (!p.monthlyPrice) return true;
  return p.yearlyPrice === p.monthlyPrice * 10;
}

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
  { contacts: 40_000, price: 350 },
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
  if (contacts <= PLANS.STARTER.contactCap)
    return { plan: "STARTER", price: PLANS.STARTER.monthlyPrice };
  if (contacts <= PLANS.GROWTH.contactCap)
    return { plan: "GROWTH", price: PLANS.GROWTH.monthlyPrice };
  if (contacts <= PLANS.PRO.contactCap) return { plan: "PRO", price: PLANS.PRO.monthlyPrice };
  return { plan: "PRO_PLUS", price: PLANS.PRO_PLUS.monthlyPrice };
}
