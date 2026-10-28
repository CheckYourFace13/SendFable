import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { safeClickRedirectUrl } from "@/lib/click-redirect";

export const dynamic = "force-dynamic";

/**
 * Casey acquisition CTA click tracker.
 * Records clickedAt + site_visit, then redirects to landing with UTMs.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const fallback = appUrl("/automated-email-marketing?utm_source=casey&utm_medium=email&utm_campaign=acquisition");

  if (!token) return NextResponse.redirect(fallback, 302);

  const rl = await rateLimit(
    "acq-click",
    clientIp(req),
    RATE_LIMITS.tracking?.limit ?? 120,
    RATE_LIMITS.tracking?.windowSec ?? 60
  );

  const payload = await verifyToken("acquisition-click", token);
  if (!payload?.messageId) return NextResponse.redirect(fallback, 302);

  const msg = await prisma.acquisitionMessage.findUnique({
    where: { id: payload.messageId },
    include: {
      prospect: {
        select: {
          id: true,
          landingPagePath: true,
          category: true,
        },
      },
    },
  });

  const path =
    (payload.path && payload.path.startsWith("/") ? payload.path : null) ||
    msg?.ctaPath ||
    msg?.prospect.landingPagePath ||
    "/automated-email-marketing";

  const version = payload.v || msg?.copyVersion || "v1a";
  let landingPath = path;
  let tryToken: string | null = null;
  let tryType: string | null = null;
  if (path.startsWith("/try/signup-tool") && msg?.prospect.id) {
    try {
      const { defaultTryConfig, categoryToTryType } = await import("@/lib/try-signup/config");
      const { randomToken } = await import("@/lib/utils");
      tryType = categoryToTryType(msg.prospect.category);
      const existing = await prisma.trySignupDraft.findFirst({
        where: { prospectId: msg.prospect.id, claimedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        tryToken = existing.token;
      } else {
        const created = await prisma.trySignupDraft.create({
          data: {
            token: randomToken(18),
            prospectId: msg.prospect.id,
            config: defaultTryConfig(categoryToTryType(msg.prospect.category)),
          },
        });
        tryToken = created.token;
      }
      landingPath = "/try/signup-tool";
    } catch {
      /* fail open to the original landing */
    }
  }
  const qs = new URLSearchParams({
    utm_source: "casey",
    utm_medium: "email",
    utm_campaign: "acquisition",
    utm_content: version,
    utm_term: msg?.prospect.category || "smb",
  });
  if (tryToken) qs.set("try", tryToken);
  if (tryType) qs.set("type", tryType);
  const targetRaw = appUrl(`${landingPath}?${qs.toString()}`);
  const target = safeClickRedirectUrl(targetRaw) || fallback;

  if (rl.ok && msg) {
    try {
      const isFirst = !msg.clickedAt;
      if (isFirst) {
        await prisma.acquisitionMessage.update({
          where: { id: msg.id },
          data: { clickedAt: new Date() },
        });
        await prisma.acquisitionEvent.create({
          data: {
            prospectId: msg.prospectId,
            type: "clicked",
            meta: { messageId: msg.id, step: msg.step, copyVersion: msg.copyVersion },
          },
        });
      }
      await prisma.acquisitionEvent.create({
        data: {
          prospectId: msg.prospectId,
          type: "site_visit",
          meta: { messageId: msg.id, path, copyVersion: version },
        },
      });
    } catch (err) {
      console.warn("[acq-click]", err);
    }
  }

  return NextResponse.redirect(target, 302);
}
