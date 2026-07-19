import type { Plan, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS, rampDailyLimit } from "@/lib/plans";

export async function ensureSendCountReset(user: User): Promise<User> {
  const now = new Date();
  const resetAt = new Date(user.sendCountResetAt);
  const monthElapsed =
    now.getUTCFullYear() > resetAt.getUTCFullYear() ||
    (now.getUTCFullYear() === resetAt.getUTCFullYear() &&
      now.getUTCMonth() > resetAt.getUTCMonth());

  if (!monthElapsed) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: { monthlySendCount: 0, sendCountResetAt: now },
  });
}

export function isReadOnlyForSending(user: User, contactCount: number): boolean {
  const cap = PLANS[user.plan].contactCap;
  if (contactCount > cap) return true;
  if (user.paymentFailedAt) {
    const graceMs = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - user.paymentFailedAt.getTime() > graceMs) return true;
  }
  return false;
}

export async function checkLaunchQuota(
  owner: User,
  workspaceId: string,
  recipientCount: number
): Promise<{ ok: true } | { ok: false; error: string; upgradeRequired?: boolean }> {
  const user = await ensureSendCountReset(owner);
  const plan = PLANS[user.plan];

  const contactCount = await prisma.contact.count({ where: { workspaceId } });
  if (isReadOnlyForSending(user, contactCount)) {
    return {
      ok: false,
      error:
        contactCount > plan.contactCap
          ? `Your list (${contactCount.toLocaleString()}) exceeds the ${plan.name} contact cap (${plan.contactCap.toLocaleString()}). Prune contacts or upgrade to send.`
          : "Sending is paused due to a failed payment. Update your billing method to continue.",
      upgradeRequired: contactCount > plan.contactCap,
    };
  }

  if (user.monthlySendCount + recipientCount > plan.emailsPerMonth) {
    return {
      ok: false,
      error: `This send would exceed your monthly quota (${user.monthlySendCount.toLocaleString()} / ${plan.emailsPerMonth.toLocaleString()} used).`,
      upgradeRequired: true,
    };
  }

  const daily = rampDailyLimit(user.accountRampLevel, user.plan);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = await prisma.campaignRecipient.count({
    where: {
      status: "SENT",
      sentAt: { gte: startOfDay },
      campaign: { workspaceId },
    },
  });

  if (sentToday + recipientCount > daily) {
    return {
      ok: false,
      error: `Daily send ramp limit is ${daily.toLocaleString()} emails (level ${user.accountRampLevel}). Try a smaller audience or wait until tomorrow.`,
    };
  }

  return { ok: true };
}

export async function incrementMonthlySendCount(userId: string, n: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { monthlySendCount: { increment: n } },
  });
}

export function planAllowsSeats(plan: Plan): number {
  return PLANS[plan].seats;
}
