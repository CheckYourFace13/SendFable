import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

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
    trackEvent("sender_verified");
  }

  let redirectTo = "/settings/senders?verified=1";
  try {
    const { getConversionFixFlags } = await import(
      "@/lib/acquisition/conversion-optimize"
    );
    const flags = await getConversionFixFlags();
    if (flags.fixOnboardingReturn) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: identity.workspaceId },
        select: { onboardingCompletedAt: true },
      });
      if (workspace && !workspace.onboardingCompletedAt) {
        redirectTo = "/settings/senders?verified=1&from=onboarding";
      }
    }
  } catch {
    /* optional */
  }

  return NextResponse.redirect(appUrl(redirectTo));
}
