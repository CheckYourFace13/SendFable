import type { SenderIdentity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  domainOf,
  platformSendDomain,
  requiresRewrite,
  rewrittenAddress,
} from "@/lib/dmarc";

/**
 * Resolve the From / Reply-To headers actually used at send time.
 *
 * - Verified custom-domain-aligned addresses (workspace has VERIFIED DOMAIN
 *   identity covering the From domain) send as-is.
 * - Strict-DMARC public providers and unverified custom domains are rewritten
 *   to localpart@PLATFORM_SEND_DOMAIN with Reply-To = real address.
 * - Display name prefers the workspace business/trade name so campaigns look
 *   like the customer brand (not the legal operator email display name).
 */
export function resolveFromHeaders(identity: {
  value: string;
  displayName: string | null;
  rewriteRequired: boolean;
}): { from: string; replyTo?: string } {
  const displayName = (identity.displayName ?? identity.value.split("@")[0]).replace(
    /["\r\n<>]/g,
    ""
  );
  if (identity.rewriteRequired) {
    return {
      from: `${displayName} <${rewrittenAddress(identity.value)}>`,
      replyTo: identity.value,
    };
  }
  return { from: `${displayName} <${identity.value}>` };
}

/**
 * Send-time rewrite decision: never spoof a domain SES cannot authenticate.
 * Prefer workspace business name as the visible From display name.
 */
export async function resolveCampaignFromHeaders(
  workspaceId: string,
  identity: {
    value: string;
    displayName: string | null;
    rewriteRequired: boolean;
  },
  opts?: { businessDisplayName?: string | null }
): Promise<{ from: string; replyTo?: string; rewritten: boolean }> {
  const displayName = (
    opts?.businessDisplayName?.trim() ||
    identity.displayName ||
    identity.value.split("@")[0] ||
    "SendFable"
  ).replace(/["\r\n<>]/g, "");

  const domain = domainOf(identity.value);
  const platform = platformSendDomain().toLowerCase();

  let rewrite = false;
  if (domain && domain === platform) {
    rewrite = false;
  } else if (identity.rewriteRequired || requiresRewrite(identity.value)) {
    rewrite = true;
  } else if (domain) {
    const aligned = await coveredByVerifiedDomain(workspaceId, identity.value);
    rewrite = !aligned;
  } else {
    rewrite = true;
  }

  if (rewrite) {
    return {
      from: `${displayName} <${rewrittenAddress(identity.value)}>`,
      replyTo: identity.value,
      rewritten: true,
    };
  }
  return {
    from: `${displayName} <${identity.value}>`,
    rewritten: false,
  };
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
    select: { id: true },
  });
  return !!match;
}

export function identityNeedsRewrite(email: string): boolean {
  return requiresRewrite(email);
}

/** The default (or first verified) sender identity for a workspace. */
export async function getDefaultIdentity(
  workspaceId: string
): Promise<SenderIdentity | null> {
  const explicit = await prisma.senderIdentity.findFirst({
    where: { workspaceId, isDefault: true, status: "VERIFIED", type: "ADDRESS" },
  });
  if (explicit) return explicit;
  return prisma.senderIdentity.findFirst({
    where: { workspaceId, status: "VERIFIED", type: "ADDRESS" },
    orderBy: { createdAt: "asc" },
  });
}
