import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { appUrl } from "@/lib/utils";
import { safeClickRedirectUrl } from "@/lib/click-redirect";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { recipientId: string; linkId: string } }
) {
  const rl = await rateLimit(
    "tracking",
    clientIp(req),
    RATE_LIMITS.tracking.limit,
    RATE_LIMITS.tracking.windowSec
  );

  const link = await prisma.campaignLink.findUnique({
    where: { id: params.linkId },
  });
  const fallback = appUrl("/");
  if (!link) return NextResponse.redirect(fallback, 302);

  // Click-time validation: stored URLs are untrusted. Unsafe/malformed targets
  // are never redirected to; the visitor lands on a neutral branded page.
  const target = safeClickRedirectUrl(link.url);
  if (!target) {
    console.warn("[click] blocked unsafe stored link target");
    return NextResponse.redirect(appUrl("/link-unavailable"), 302);
  }

  if (rl.ok) {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: params.recipientId },
      });
      if (recipient && recipient.campaignId === link.campaignId) {
        const isFirst = !recipient.firstClickedAt;
        await prisma.$transaction([
          prisma.clickEvent.create({
            data: {
              linkId: link.id,
              recipientId: recipient.id,
              userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
            },
          }),
          prisma.campaignLink.update({
            where: { id: link.id },
            data: {
              clickCount: { increment: 1 },
              uniqueClickCount: isFirst ? { increment: 1 } : undefined,
            },
          }),
          ...(isFirst
            ? [
                prisma.campaignRecipient.update({
                  where: { id: recipient.id },
                  data: { firstClickedAt: new Date() },
                }),
                prisma.campaign.update({
                  where: { id: recipient.campaignId },
                  data: { clickCount: { increment: 1 } },
                }),
              ]
            : []),
        ]);
      }
    } catch (err) {
      console.error("[click]", err);
    }
  }

  return NextResponse.redirect(target, 302);
}
