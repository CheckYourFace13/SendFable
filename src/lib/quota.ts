import type { Plan, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS, rampDailyLimit } from "@/lib/plans";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { softwareQuotas } from "@/lib/internal-entitlement";

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

function utcMonthStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function isReadOnlyForSending(
  user: User,
  contactCount: number,
  opts?: { ignorePaymentFailed?: boolean; plan?: Plan }
): boolean {
  if (user.sendingHeldAt) return true;
  const planKey = opts?.plan ?? user.plan;
  const cap = PLANS[planKey].contactCap;
  if (contactCount > cap) return true;
  if (!opts?.ignorePaymentFailed && user.paymentFailedAt) {
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
  const ent = await getWorkspaceEntitlement(workspaceId);
  if (ent.disabled) {
    return { ok: false, error: "This workspace is disabled." };
  }

  const quotas = softwareQuotas({
    isInternal: ent.isInternal,
    disabled: ent.disabled,
    plan: ent.plan,
  });
  const internalUnlimited = quotas.entitlement === "OWNER_INTERNAL_UNLIMITED";
  const planKey = ent.plan;
  const plan = PLANS[planKey];
  const internalOverride = Boolean(ent.isInternal && ent.internalPlanOverride);

  if (internalUnlimited) {
    if (owner.sendingHeldAt) {
      return { ok: false, error: "Sending is paused on this account." };
    }
    return { ok: true };
  }

  const user = internalOverride ? owner : await ensureSendCountReset(owner);

  const contactCount = await prisma.contact.count({ where: { workspaceId } });
  if (
    isReadOnlyForSending(user, contactCount, {
      ignorePaymentFailed: internalOverride,
      plan: planKey,
    })
  ) {
    return {
      ok: false,
      error:
        contactCount > plan.contactCap
          ? `Your list (${contactCount.toLocaleString()}) exceeds the ${plan.name} plan limit (up to ${plan.contactCap.toLocaleString()} contacts). Prune contacts or upgrade to send.`
          : "Sending is paused due to a failed payment. Update your billing method to continue.",
      upgradeRequired: contactCount > plan.contactCap,
    };
  }

  let usedMonth = user.monthlySendCount;
  if (internalOverride) {
    // Dogfood Free accurately: count only this workspace's sends this month.
    usedMonth = await prisma.campaignRecipient.count({
      where: {
        status: "SENT",
        sentAt: { gte: utcMonthStart() },
        campaign: { workspaceId },
      },
    });
  }

  if (usedMonth + recipientCount > plan.emailsPerMonth) {
    return {
      ok: false,
      error: `This send would exceed your monthly allowance (up to ${plan.emailsPerMonth.toLocaleString()} emails/month; ${usedMonth.toLocaleString()} used this calendar month). Unused sends do not roll over.`,
      upgradeRequired: true,
    };
  }

  const daily = rampDailyLimit(user.accountRampLevel, planKey);
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

export async function incrementMonthlySendCount(
  userId: string,
  n: number,
  opts?: { workspaceId?: string }
): Promise<void> {
  if (opts?.workspaceId) {
    const ent = await getWorkspaceEntitlement(opts.workspaceId).catch(() => null);
    if (ent?.isInternal && ent.internalPlanOverride) {
      // Workspace-scoped counting for internal overrides — do not consume the
      // operator account's shared Stripe-backed monthly counter.
      return;
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { monthlySendCount: { increment: n } },
  });
}

export function planAllowsSeats(plan: Plan): number {
  return PLANS[plan].seats;
}
