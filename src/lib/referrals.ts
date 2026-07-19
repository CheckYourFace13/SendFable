import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/utils";

export const REFERRAL_SIGNUP_REASON = "REFERRAL_SIGNUP";
export const REFERRAL_CREDIT_AMOUNT = 1;

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
 * Award a single non-monetary REFERRAL_SIGNUP credit to the referrer
 * when the referred user verifies email or completes first campaign launch.
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
        amount: REFERRAL_CREDIT_AMOUNT,
        reason: REFERRAL_SIGNUP_REASON,
        meta: { referredUserId, trigger, code: user.referredByCode },
      },
    }),
    prisma.referralAttribution.updateMany({
      where: { referredUserId, status: { in: ["signed_up", "clicked"] } },
      data: { status: "qualified" },
    }),
  ]);

  return true;
}
