import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/acquisition/normalize";
import { normalizeEmail } from "@/lib/utils";
import type { AcquisitionProspectStatus } from "@prisma/client";

export const TERMINAL_SUPPRESSION_STATUSES: AcquisitionProspectStatus[] = [
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINT",
  "SUPPRESSED",
  "NOT_INTERESTED",
  "SIGNED_UP",
  "PAID",
  "REJECTED",
  "INCORRECT",
];

export async function isSuppressed(email?: string | null, domain?: string | null): Promise<{
  suppressed: boolean;
  reason?: string;
}> {
  if (email) {
    const e = normalizeEmail(email);
    const byEmail = await prisma.acquisitionSuppression.findUnique({ where: { email: e } });
    if (byEmail) return { suppressed: true, reason: byEmail.reason };
  }
  if (domain) {
    const d = normalizeDomain(domain);
    const byDomain = await prisma.acquisitionSuppression.findFirst({
      where: { domain: d },
    });
    if (byDomain) return { suppressed: true, reason: byDomain.reason };
  }
  return { suppressed: false };
}

export async function addSuppression(opts: {
  email?: string | null;
  domain?: string | null;
  reason: string;
  source?: string;
  notes?: string;
}): Promise<void> {
  const email = opts.email ? normalizeEmail(opts.email) : null;
  const domain = opts.domain ? normalizeDomain(opts.domain) : null;
  if (email) {
    await prisma.acquisitionSuppression.upsert({
      where: { email },
      create: {
        email,
        domain,
        reason: opts.reason,
        source: opts.source || "system",
        notes: opts.notes,
      },
      update: {
        reason: opts.reason,
        domain: domain || undefined,
        notes: opts.notes,
        source: opts.source || "system",
      },
    });
  } else if (domain) {
    const existing = await prisma.acquisitionSuppression.findFirst({ where: { domain } });
    if (existing) {
      await prisma.acquisitionSuppression.update({
        where: { id: existing.id },
        data: { reason: opts.reason, notes: opts.notes },
      });
    } else {
      await prisma.acquisitionSuppression.create({
        data: {
          domain,
          reason: opts.reason,
          source: opts.source || "system",
          notes: opts.notes,
        },
      });
    }
  }
}

export async function suppressProspect(
  prospectId: string,
  status: AcquisitionProspectStatus,
  reason: string
): Promise<void> {
  const p = await prisma.acquisitionProspect.findUnique({ where: { id: prospectId } });
  if (!p) return;
  await prisma.acquisitionProspect.update({
    where: { id: prospectId },
    data: { status, suppressionReason: reason, nextFollowUpAt: null },
  });
  await addSuppression({
    email: p.contactEmail,
    domain: p.domain,
    reason,
    source: "prospect",
  });
  await prisma.acquisitionMessage.updateMany({
    where: {
      prospectId,
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
    data: { status: "CANCELLED" },
  });
  await prisma.acquisitionEvent.create({
    data: {
      prospectId,
      type: "suppressed",
      meta: { status, reason },
    },
  });
}

/** Existing SendFable customers must never be prospected. */
export async function isExistingCustomerDomainOrEmail(
  email?: string | null,
  domain?: string | null
): Promise<boolean> {
  if (email) {
    const e = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: e }, select: { id: true } });
    if (user) return true;
  }
  if (domain) {
    const d = normalizeDomain(domain);
    const identity = await prisma.senderIdentity.findFirst({
      where: {
        OR: [{ value: { equals: d, mode: "insensitive" } }, { value: { endsWith: `@${d}` } }],
      },
      select: { id: true },
    });
    if (identity) return true;
    const userOnDomain = await prisma.user.findFirst({
      where: { email: { endsWith: `@${d}` } },
      select: { id: true },
    });
    if (userOnDomain) return true;
  }
  return false;
}
