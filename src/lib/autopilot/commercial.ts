import type { Plan } from "@prisma/client";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";

/**
 * One creation credit is one successfully generated new Autopilot campaign draft.
 * Page checks, unchanged pages, duplicates, failed generation, previews, edits,
 * reminders, and scheduling do not consume a credit.
 */
export type CreationSource =
  | "TRIAL"
  | "PLAN_INCLUDED"
  | "PAID_CREDIT"
  | "PROMO_MONTHLY"
  | "PROMO_WEEKLY"
  | "OWNER_INTERNAL";

export type PromoKind = "NONE" | "MONTHLY" | "WEEKLY";

export const AUTOPILOT_PROMO_CODES = {
  AUTOPILOT1MONTH: "MONTHLY",
  AUTOPILOT1WEEK: "WEEKLY",
} as const;

export const AUTOPILOT_CREATION_PACKS = [
  { id: "pack_5", credits: 5, cents: 1900, label: "5 creations" },
  { id: "pack_10", credits: 10, cents: 3500, label: "10 creations" },
  { id: "pack_25", credits: 25, cents: 7500, label: "25 creations" },
] as const;

export type CreationPackId = (typeof AUTOPILOT_CREATION_PACKS)[number]["id"];

const TRIAL_MONTHS = 3;
const TRIAL_PER_PERIOD = 1;

export function planIncludedCreations(plan: Plan): number {
  return autopilotMaxDraftsPerMonth(plan);
}

export function packById(id: string) {
  return AUTOPILOT_CREATION_PACKS.find((pack) => pack.id === id) ?? null;
}

export function promoFromCode(raw: string): PromoKind | null {
  const key = raw.trim().toUpperCase();
  if (key in AUTOPILOT_PROMO_CODES) {
    return AUTOPILOT_PROMO_CODES[key as keyof typeof AUTOPILOT_PROMO_CODES];
  }
  return null;
}

/** Complimentary and owner-internal creations keep the SendFable footer forever. */
export function complimentaryBranding(source: CreationSource): boolean {
  return (
    source === "TRIAL" ||
    source === "PROMO_MONTHLY" ||
    source === "PROMO_WEEKLY" ||
    source === "OWNER_INTERNAL"
  );
}

/**
 * Paid plan-included and purchased credits follow the plan badge policy at
 * creation time. Complimentary sources always keep the footer, even if the
 * workspace later changes plan.
 */
export function brandingRequiredFor(
  source: CreationSource,
  planShowsBadge: boolean
): boolean {
  if (complimentaryBranding(source)) return true;
  return planShowsBadge;
}

/** Manual campaigns have no Autopilot draft and keep the current plan policy. */
export function sendBadgeForAutopilotDraft(
  draft: { brandingRequired: boolean } | null,
  currentPlanShowsBadge: boolean
): boolean {
  if (draft) return draft.brandingRequired;
  return currentPlanShowsBadge;
}

export function addUtcMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Monday 00:00 UTC. Unused weekly promo creations do not carry forward. */
export function weekStartUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export type TrialPeriod = { index: number; start: Date; end: Date };

export function currentTrialPeriod(startedAt: Date, now: Date): TrialPeriod | null {
  for (let index = 0; index < TRIAL_MONTHS; index++) {
    const start = addUtcMonths(startedAt, index);
    const end = addUtcMonths(startedAt, index + 1);
    if (now.getTime() >= start.getTime() && now.getTime() < end.getTime()) {
      return { index, start, end };
    }
  }
  return null;
}

export function trialMonthsRemaining(startedAt: Date | null, now: Date): number {
  if (!startedAt) return 0;
  const period = currentTrialPeriod(startedAt, now);
  if (!period) return 0;
  return TRIAL_MONTHS - period.index;
}

export type CreationUsage = {
  planThisMonth: number;
  trialThisPeriod: number;
  promoThisMonth: number;
  promoThisWeek: number;
};

export type CreationChoice = {
  source: CreationSource;
  brandingRequired: boolean;
};

/**
 * Prefer paid entitlements before complimentary ones so a paid creation is not
 * forced into promo branding. Trial is used before a promo while it is active.
 * Unused trial, monthly, and weekly allowances do not roll over.
 */
export function chooseCreation(input: {
  now: Date;
  isOwnerInternal: boolean;
  plan: Plan;
  planShowsBadge: boolean;
  trialStartedAt: Date | null;
  creditBalance: number;
  promo: PromoKind;
  used: CreationUsage;
}): CreationChoice | null {
  if (input.isOwnerInternal) {
    return { source: "OWNER_INTERNAL", brandingRequired: true };
  }

  const included = planIncludedCreations(input.plan);
  if (included > 0 && input.used.planThisMonth < included) {
    return {
      source: "PLAN_INCLUDED",
      brandingRequired: brandingRequiredFor("PLAN_INCLUDED", input.planShowsBadge),
    };
  }

  if (input.creditBalance > 0) {
    return {
      source: "PAID_CREDIT",
      brandingRequired: brandingRequiredFor("PAID_CREDIT", input.planShowsBadge),
    };
  }

  if (input.trialStartedAt) {
    const period = currentTrialPeriod(input.trialStartedAt, input.now);
    if (period && input.used.trialThisPeriod < TRIAL_PER_PERIOD) {
      return { source: "TRIAL", brandingRequired: true };
    }
  }

  if (input.promo === "MONTHLY" && input.used.promoThisMonth < 1) {
    return { source: "PROMO_MONTHLY", brandingRequired: true };
  }
  if (input.promo === "WEEKLY" && input.used.promoThisWeek < 1) {
    return { source: "PROMO_WEEKLY", brandingRequired: true };
  }

  return null;
}

export function countUsage(
  drafts: Array<{ creationSource: string | null; createdAt: Date }>,
  now: Date,
  trialStartedAt: Date | null
): CreationUsage {
  const month = monthStartUtc(now).getTime();
  const week = weekStartUtc(now).getTime();
  const period = trialStartedAt ? currentTrialPeriod(trialStartedAt, now) : null;
  const usage: CreationUsage = {
    planThisMonth: 0,
    trialThisPeriod: 0,
    promoThisMonth: 0,
    promoThisWeek: 0,
  };
  for (const draft of drafts) {
    const at = draft.createdAt.getTime();
    if (draft.creationSource === "PLAN_INCLUDED" && at >= month) usage.planThisMonth++;
    if (
      draft.creationSource === "TRIAL" &&
      period &&
      at >= period.start.getTime() &&
      at < period.end.getTime()
    ) {
      usage.trialThisPeriod++;
    }
    if (draft.creationSource === "PROMO_MONTHLY" && at >= month) usage.promoThisMonth++;
    if (draft.creationSource === "PROMO_WEEKLY" && at >= week) usage.promoThisWeek++;
  }
  return usage;
}
