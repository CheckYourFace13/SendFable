import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CURRENT_POLICY_BUNDLE,
  POLICY_VERSIONS,
} from "@/lib/legal-policies";

export type PolicyAcceptanceSource = "signup" | "reaccept" | "checkout" | "invite";

export async function recordPolicyAcceptance(opts: {
  userId: string;
  workspaceId?: string | null;
  source: PolicyAcceptanceSource;
  ip?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  const db = opts.tx ?? prisma;
  return db.policyAcceptance.create({
    data: {
      userId: opts.userId,
      workspaceId: opts.workspaceId ?? null,
      policyBundleVersion: CURRENT_POLICY_BUNDLE,
      termsVersion: POLICY_VERSIONS.terms,
      privacyVersion: POLICY_VERSIONS.privacy,
      acceptableUseVersion: POLICY_VERSIONS.acceptableUse,
      refundPolicyVersion: POLICY_VERSIONS.refund,
      source: opts.source,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ? opts.userAgent.slice(0, 512) : null,
    },
  });
}

/** Latest recorded acceptance for a user, if any. */
export async function getLatestPolicyAcceptance(userId: string) {
  return prisma.policyAcceptance.findFirst({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });
}

/**
 * Soft reacceptance: true when the user has never accepted the current
 * bundle (including accounts created before acceptance recording existed).
 * Callers must not hard-block access solely because of a missing historical
 * record — show a banner and let them accept.
 */
export async function needsPolicyReacceptance(userId: string): Promise<boolean> {
  const latest = await getLatestPolicyAcceptance(userId);
  if (!latest) return true;
  return latest.policyBundleVersion !== CURRENT_POLICY_BUNDLE;
}
