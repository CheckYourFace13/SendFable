import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { appUrl, randomToken } from "@/lib/utils";
import { ensureReferralCodes } from "@/lib/referrals";

const patchSchema = z.object({
  referralCode: z
    .string()
    .trim()
    .min(4)
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/, "Code may only use letters, numbers, _ and -")
    .optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userCode, workspaceCode } = await ensureReferralCodes(
    ctx.user.id,
    ctx.workspace.id
  );
  const code = workspaceCode || userCode;
  const shareLink = appUrl(`/signup?ref=${encodeURIComponent(code)}`);

  const ledger = await prisma.creditLedgerEntry.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const attributions = await prisma.referralAttribution.findMany({
    where: { referralCode: code },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    referralCode: code,
    shareLink,
    ledger,
    attributions,
  });
}

export async function PATCH(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (ctx.membership.role !== "OWNER") {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let nextCode = parsed.data.referralCode;
  if (!nextCode) {
    nextCode = randomToken(6).slice(0, 8);
  }

  const clashUser = await prisma.user.findFirst({
    where: { referralCode: nextCode, NOT: { id: ctx.user.id } },
  });
  const clashWs = await prisma.workspace.findFirst({
    where: { referralCode: nextCode, NOT: { id: ctx.workspace.id } },
  });
  if (clashUser || clashWs) {
    return NextResponse.json({ error: "That referral code is already taken" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: ctx.user.id },
      data: { referralCode: nextCode },
    }),
    prisma.workspace.update({
      where: { id: ctx.workspace.id },
      data: { referralCode: nextCode },
    }),
  ]);

  return NextResponse.json({
    referralCode: nextCode,
    shareLink: appUrl(`/signup?ref=${encodeURIComponent(nextCode)}`),
  });
}
