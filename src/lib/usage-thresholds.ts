/**
 * Plan usage thresholds for free→paid prompts (product-led growth).
 * Pure helpers — UI decides where to show; avoid duplicate banners.
 *
 * Progression: no messaging under 80%; subtle 80–89%; prominent 90–99%; blocking at 100%.
 */

import { PLANS } from "@/lib/plans";

export const USAGE_THRESHOLDS = [80, 90, 100] as const;
export type UsageThreshold = (typeof USAGE_THRESHOLDS)[number];

export type UsageMetric = "emails" | "contacts";

export function usagePercent(used: number, cap: number): number {
  if (!cap || cap <= 0) return 0;
  return Math.min(100, Math.floor((Math.max(0, used) * 100) / cap));
}

/** Highest crossed threshold, or null if under 80%. */
export function crossedUsageThreshold(used: number, cap: number): UsageThreshold | null {
  const pct = usagePercent(used, cap);
  let hit: UsageThreshold | null = null;
  for (const t of USAGE_THRESHOLDS) {
    if (pct >= t) hit = t;
  }
  return hit;
}

/**
 * Next Free/paid monthly send allowance reset label.
 * Matches `ensureSendCountReset`: calendar month UTC (not billing anniversary).
 */
export function nextMonthlySendResetLabel(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const next = new Date(Date.UTC(y, m + 1, 1));
  return next.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function usagePromptCopy(input: {
  metric: UsageMetric;
  used: number;
  cap: number;
  planName: string;
  /** Optional: next send-allowance reset (emails only, at 100%). */
  resetLabel?: string | null;
}): { tone: "subtle" | "prominent" | "blocking"; title: string; body: string } {
  const threshold = crossedUsageThreshold(input.used, input.cap) ?? 80;
  const usedLabel = input.used.toLocaleString();
  const capLabel = input.cap.toLocaleString();
  const starterContacts = PLANS.STARTER.contactCap.toLocaleString();
  const starterEmails = PLANS.STARTER.emailsPerMonth.toLocaleString();

  if (input.metric === "contacts") {
    if (threshold >= 100) {
      return {
        tone: "blocking",
        title: `You've reached your ${input.planName} plan contact limit`,
        body: `You're using ${usedLabel} of ${capLabel} Free contacts. Your contacts stay safe — upgrade anytime for more room. Starter supports up to ${starterContacts} contacts.`,
      };
    }
    if (threshold >= 90) {
      return {
        tone: "prominent",
        title: `You're almost at your ${input.planName} contact limit`,
        body: `You're using ${usedLabel} of your ${capLabel} Free contacts. Need more room? Starter supports up to ${starterContacts}.`,
      };
    }
    return {
      tone: "subtle",
      title: `You're using ${usedLabel} of your ${capLabel} Free contacts`,
      body: `Need more room? Starter supports up to ${starterContacts} contacts.`,
    };
  }

  // emails
  if (threshold >= 100) {
    const reset =
      input.resetLabel?.trim() ||
      nextMonthlySendResetLabel();
    return {
      tone: "blocking",
      title: `You've reached this month's ${input.planName}-plan sending limit`,
      body: `You've sent ${usedLabel} of your ${capLabel} Free-plan emails this month. Upgrade to keep sending this month, or your Free sending allowance resets on ${reset}. Your contacts and past campaigns stay put.`,
    };
  }
  if (threshold >= 90) {
    return {
      tone: "prominent",
      title: `You're almost at this month's ${input.planName} sending limit`,
      body: `You've sent ${usedLabel} of your ${capLabel} Free-plan emails this month. Need more sending room? See your options.`,
    };
  }
  return {
    tone: "subtle",
    title: `You've sent ${usedLabel} of your ${capLabel} Free-plan emails this month`,
    body: `Need more sending room? Starter includes up to ${starterEmails} emails/month.`,
  };
}
