import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(appUrl("/settings/senders?error=invalid"));

  const payload = await verifyToken("sender-verify", token);
  if (!payload?.identityId) {
    return NextResponse.redirect(appUrl("/settings/senders?error=invalid"));
  }

  const identity = await prisma.senderIdentity.findUnique({
    where: { id: payload.identityId },
  });
  if (!identity) {
    return NextResponse.redirect(appUrl("/settings/senders?error=invalid"));
  }

  if (identity.status !== "VERIFIED") {
    const hasDefault = await prisma.senderIdentity.findFirst({
      where: { workspaceId: identity.workspaceId, isDefault: true },
    });
    await prisma.senderIdentity.update({
      where: { id: identity.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verificationToken: null,
        isDefault: !hasDefault,
      },
    });
  }

  return NextResponse.redirect(appUrl("/settings/senders?verified=1"));
}
