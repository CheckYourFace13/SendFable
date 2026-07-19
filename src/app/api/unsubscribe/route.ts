import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { unsubscribeContact } from "@/lib/suppression";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const payload = await verifyToken("unsubscribe", parsed.data.token);
  if (!payload?.email || !payload?.workspaceId) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  await unsubscribeContact(payload.workspaceId, payload.email, "one-click unsubscribe");

  if (payload.recipientId) {
    const recip = await prisma.campaignRecipient.findUnique({
      where: { id: payload.recipientId },
    });
    if (recip && !recip.unsubscribedAt) {
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recip.id },
          data: { unsubscribedAt: new Date() },
        }),
        prisma.campaign.update({
          where: { id: recip.campaignId },
          data: { unsubscribeCount: { increment: 1 } },
        }),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
