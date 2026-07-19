import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { unsubscribeContact } from "@/lib/suppression";

/**
 * RFC 8058 one-click unsubscribe.
 * List-Unsubscribe-Post: List-Unsubscribe=One-Click
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get("token") || "";

  const contentType = req.headers.get("content-type") || "";
  if (!token && contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    token = String(form.get("token") || "");
  }
  if (!token) {
    try {
      const body = await req.json();
      token = body.token || "";
    } catch {
      /* ignore */
    }
  }

  if (!token) return new NextResponse(null, { status: 400 });

  const payload = await verifyToken("unsubscribe", token);
  if (!payload?.email || !payload?.workspaceId) {
    return new NextResponse(null, { status: 400 });
  }

  await unsubscribeContact(payload.workspaceId, payload.email, "RFC8058 one-click");

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

  return new NextResponse(null, { status: 200 });
}
