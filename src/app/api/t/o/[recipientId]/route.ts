import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: Request,
  { params }: { params: { recipientId: string } }
) {
  const rl = await rateLimit(
    "tracking",
    clientIp(req),
    RATE_LIMITS.tracking.limit,
    RATE_LIMITS.tracking.windowSec
  );

  if (rl.ok) {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: params.recipientId },
      });
      if (recipient && !recipient.openedAt) {
        await prisma.$transaction([
          prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { openedAt: new Date() },
          }),
          prisma.campaign.update({
            where: { id: recipient.campaignId },
            data: { openCount: { increment: 1 } },
          }),
        ]);
      }
    } catch (err) {
      console.error("[open-pixel]", err);
    }
  }

  return new NextResponse(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
