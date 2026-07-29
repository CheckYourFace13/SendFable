import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export const REFERRAL_SIGNUP_REASON = "REFERRAL_SIGNUP";
export const REFERRAL_PAID_REASON = "REFERRAL_PAID_CREDIT";

/** Placeholder unit count when credits are disabled / non-monetary mode. */
export const REFERRAL_SIGNUP_PLACEHOLDER = 1;

/**
 * Sustainable default: $10 account credit (1000 cents) after referred customer
 * completes a qualifying paid period. Must stay below expected gross margin on
 * the referred subscription — see docs/SF-009_REFERRAL_ECONOMICS.md.
 * Inactive unless REFERRAL_CREDITS_ENABLED=true.
 */
export function referralCreditsEnabled(): boolean {
  return process.env.REFERRAL_CREDITS_ENABLED === "true";
}

export function referralCreditCents(): number {
  const raw = Number(process.env.REFERRAL_CREDIT_CENTS || "1000");
  if (!Number.isFinite(raw) || raw <= 0) return 1000;
  // Hard ceiling: never exceed $25 without code change + owner review
  return Math.min(Math.floor(raw), 2500);
}

export function referralQualifyingPaidDays(): number {
  const raw = Number(process.env.REFERRAL_QUALIFYING_PAID_DAYS || "30");
  if (!Number.isFinite(raw) || raw < 1) return 30;
  return Math.min(Math.floor(raw), 90);
}

/** Ensure user + primary workspace have referral codes. */
export async function ensureReferralCodes(userId: string, workspaceId?: string): Promise<{
  userCode: string;
  workspaceCode: string | null;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  let userCode = user.referralCode;
  if (!userCode) {
    userCode = randomToken(6).slice(0, 8);
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: userCode },
    });
  }

  let workspaceCode: string | null = null;
  if (workspaceId) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (ws) {
      workspaceCode = ws.referralCode;
      if (!workspaceCode) {
        workspaceCode = userCode;
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { referralCode: workspaceCode },
        });
      }
    }
  }

  return { userCode, workspaceCode };
}

/** Resolve a referral code to the referring user (user code or workspace code → owner). */
export async function findReferrerByCode(code: string): Promise<{ id: string } | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const byUser = await prisma.user.findFirst({
    where: { referralCode: trimmed },
    select: { id: true },
  });
  if (byUser) return byUser;

  const ws = await prisma.workspace.findFirst({
    where: { referralCode: trimmed },
    include: {
      memberships: {
        where: { role: "OWNER" },
        take: 1,
        select: { userId: true },
      },
    },
  });
  const ownerId = ws?.memberships[0]?.userId;
  return ownerId ? { id: ownerId } : null;
}

/**
 * Award a single non-monetary REFERRAL_SIGNUP placeholder to the referrer
 * when the referred user verifies email or completes first campaign launch.
 * Monetary Stripe credits stay off until REFERRAL_CREDITS_ENABLED + paid qualify.
 */
export async function maybeAwardReferralSignupCredit(
  referredUserId: string,
  trigger: "email_verified" | "first_campaign"
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: referredUserId } });
  if (!user?.referredByCode) return false;

  const referrer = await findReferrerByCode(user.referredByCode);
  if (!referrer || referrer.id === referredUserId) return false;

  const prior = await prisma.creditLedgerEntry.findMany({
    where: { userId: referrer.id, reason: REFERRAL_SIGNUP_REASON },
    take: 200,
  });
  const already = prior.some((e) => {
    const meta = e.meta as { referredUserId?: string } | null;
    return meta?.referredUserId === referredUserId;
  });
  if (already) return false;

  await prisma.$transaction([
    prisma.creditLedgerEntry.create({
      data: {
        userId: referrer.id,
        amount: REFERRAL_SIGNUP_PLACEHOLDER,
        reason: REFERRAL_SIGNUP_REASON,
        meta: {
          referredUserId,
          trigger,
          code: user.referredByCode,
          monetary: false,
          note: "Placeholder only — Stripe credit inactive until owner approval",
        },
      },
    }),
    prisma.referralAttribution.updateMany({
      where: { referredUserId, status: { in: ["signed_up", "clicked"] } },
      data: { status: "qualified" },
    }),
  ]);

  trackEvent("referral_attributed", { monetary: false });
  return true;
}

/**
 * Future: after referred customer completes qualifying paid period, credit
 * referrer. Gated — does nothing unless REFERRAL_CREDITS_ENABLED=true.
 * Does not call Stripe until a separate owner-approved applicator exists.
 */
export async function maybeAwardReferralPaidCredit(referredUserId: string): Promise<{
  awarded: boolean;
  reason: string;
}> {
  if (!referralCreditsEnabled()) {
    return { awarded: false, reason: "REFERRAL_CREDITS_ENABLED=false" };
  }

  const user = await prisma.user.findUnique({ where: { id: referredUserId } });
  if (!user?.referredByCode) return { awarded: false, reason: "no_referral" };

  const referrer = await findReferrerByCode(user.referredByCode);
  if (!referrer || referrer.id === referredUserId) {
    return { awarded: false, reason: "self_or_missing_referrer" };
  }

  const prior = await prisma.creditLedgerEntry.findMany({
    where: { userId: referrer.id, reason: REFERRAL_PAID_REASON },
    take: 200,
  });
  if (
    prior.some((e) => (e.meta as { referredUserId?: string } | null)?.referredUserId === referredUserId)
  ) {
    return { awarded: false, reason: "already_credited" };
  }

  const cents = referralCreditCents();
  await prisma.creditLedgerEntry.create({
    data: {
      userId: referrer.id,
      amount: cents,
      reason: REFERRAL_PAID_REASON,
      meta: {
        referredUserId,
        code: user.referredByCode,
        monetaryPending: true,
        creditCents: cents,
        note: "Ledger only — apply Stripe customer balance separately after approval",
      },
    },
  });

  trackEvent("referral_attributed", { monetary: true, cents });
  return { awarded: true, reason: "ledger_written" };
}
