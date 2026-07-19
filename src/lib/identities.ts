import type { SenderIdentity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { domainOf, requiresRewrite, rewrittenAddress } from "@/lib/dmarc";

/**
 * Resolve the From / Reply-To headers actually used at send time.
 *
 * - Verified custom-domain-aligned or non-strict-DMARC addresses send as-is.
 * - Addresses on strict-DMARC public providers (gmail.com etc.) are rewritten
 *   to localpart@PLATFORM_SEND_DOMAIN with the display name preserved and
 *   Reply-To set to the user's real, verified address.
 */
export function resolveFromHeaders(identity: {
  value: string;
  displayName: string | null;
  rewriteRequired: boolean;
}): { from: string; replyTo?: string } {
  const displayName = (identity.displayName ?? identity.value.split("@")[0]).replace(/["\r\n<>]/g, "");
  if (identity.rewriteRequired) {
    return {
      from: `${displayName} <${rewrittenAddress(identity.value)}>`,
      replyTo: identity.value,
    };
  }
  return { from: `${displayName} <${identity.value}>` };
}

/**
 * An ADDRESS identity is auto-verified if the workspace has a VERIFIED DOMAIN
 * identity covering its domain (full DKIM alignment already proven).
 */
export async function coveredByVerifiedDomain(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const domain = domainOf(email);
  if (!domain) return false;
  const match = await prisma.senderIdentity.findFirst({
    where: { workspaceId, type: "DOMAIN", value: domain, status: "VERIFIED" },
  });
  return !!match;
}

export function identityNeedsRewrite(email: string): boolean {
  return requiresRewrite(email);
}

/** The default (or first verified) sender identity for a workspace. */
export async function getDefaultIdentity(workspaceId: string): Promise<SenderIdentity | null> {
  const explicit = await prisma.senderIdentity.findFirst({
    where: { workspaceId, isDefault: true, status: "VERIFIED", type: "ADDRESS" },
  });
  if (explicit) return explicit;
  return prisma.senderIdentity.findFirst({
    where: { workspaceId, status: "VERIFIED", type: "ADDRESS" },
    orderBy: { createdAt: "asc" },
  });
}
