import type { SuppressionReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/utils";

export async function isSuppressed(workspaceId: string, email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  const [local, global] = await Promise.all([
    prisma.suppressionEntry.findUnique({
      where: { workspaceId_email: { workspaceId, email: e } },
    }),
    prisma.globalSuppression.findUnique({ where: { email: e } }),
  ]);
  return !!(local || global);
}

export async function suppressWorkspace(
  workspaceId: string,
  email: string,
  reason: SuppressionReason,
  note?: string
): Promise<void> {
  const e = normalizeEmail(email);
  await prisma.suppressionEntry.upsert({
    where: { workspaceId_email: { workspaceId, email: e } },
    create: { workspaceId, email: e, reason, note },
    update: { reason, note },
  });
}

export async function suppressGlobal(email: string, reason: SuppressionReason): Promise<void> {
  const e = normalizeEmail(email);
  await prisma.globalSuppression.upsert({
    where: { email: e },
    create: { email: e, reason },
    update: { reason },
  });
}

/** Hard bounce / complaint — mark contact + suppress locally and globally. */
export async function handleHardBounceOrComplaint(
  workspaceId: string,
  email: string,
  kind: "bounce" | "complaint"
): Promise<void> {
  const e = normalizeEmail(email);
  const reason: SuppressionReason = kind === "bounce" ? "HARD_BOUNCE" : "COMPLAINT";
  const status = kind === "bounce" ? "BOUNCED" : "COMPLAINED";

  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { workspaceId, email: e },
      data: { status, unsubscribedAt: new Date() },
    }),
    prisma.suppressionEntry.upsert({
      where: { workspaceId_email: { workspaceId, email: e } },
      create: { workspaceId, email: e, reason },
      update: { reason },
    }),
    prisma.globalSuppression.upsert({
      where: { email: e },
      create: { email: e, reason },
      update: { reason },
    }),
  ]);
}

export async function unsubscribeContact(
  workspaceId: string,
  email: string,
  note?: string
): Promise<void> {
  const e = normalizeEmail(email);
  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { workspaceId, email: e },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    }),
    prisma.suppressionEntry.upsert({
      where: { workspaceId_email: { workspaceId, email: e } },
      create: { workspaceId, email: e, reason: "UNSUBSCRIBED", note },
      update: { reason: "UNSUBSCRIBED", note },
    }),
  ]);
}
