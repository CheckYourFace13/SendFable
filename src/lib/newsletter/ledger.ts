import { prisma } from "@/lib/prisma";

export type AutomationKind = "welcome" | "autopilot_auto";

export type LedgerStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "SKIPPED"
  | "FAILED";

const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 30_000;

export function welcomeIdempotencyKey(contactId: string): string {
  return `welcome:${contactId}`;
}

export function autopilotAutoIdempotencyKey(draftId: string): string {
  return `autopilot-auto:${draftId}`;
}

export async function enqueueAutomationSend(opts: {
  workspaceId: string;
  kind: AutomationKind;
  idempotencyKey: string;
  contactId?: string | null;
  draftId?: string | null;
  campaignId?: string | null;
}): Promise<{ enqueued: boolean; id: string | null }> {
  const existing = await prisma.automationSendLedger.findUnique({
    where: {
      workspaceId_kind_idempotencyKey: {
        workspaceId: opts.workspaceId,
        kind: opts.kind,
        idempotencyKey: opts.idempotencyKey,
      },
    },
    select: { id: true },
  });
  if (existing) return { enqueued: false, id: existing.id };

  try {
    const row = await prisma.automationSendLedger.create({
      data: {
        workspaceId: opts.workspaceId,
        kind: opts.kind,
        idempotencyKey: opts.idempotencyKey,
        contactId: opts.contactId ?? null,
        draftId: opts.draftId ?? null,
        campaignId: opts.campaignId ?? null,
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    });
    return { enqueued: true, id: row.id };
  } catch (err) {
    // Race: unique violation = already queued/sent for this key.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { enqueued: false, id: null };
    }
    throw err;
  }
}

/** Clear welcome ledger on unsubscribe so a later re-opt-in can welcome once. */
export async function clearWelcomeLedgerOnUnsubscribe(
  workspaceId: string,
  contactId: string
): Promise<void> {
  await prisma.automationSendLedger.deleteMany({
    where: {
      workspaceId,
      kind: "welcome",
      idempotencyKey: welcomeIdempotencyKey(contactId),
      status: { in: ["PENDING", "FAILED", "SKIPPED"] },
    },
  });
  // SENT rows stay for audit; re-opt uses a new key suffix via contact cycle.
  // For re-opt after full unsub we delete SENT welcome keys too so one new welcome is allowed.
  await prisma.automationSendLedger.deleteMany({
    where: {
      workspaceId,
      kind: "welcome",
      idempotencyKey: welcomeIdempotencyKey(contactId),
    },
  });
}

export function nextBackoff(attempts: number): Date {
  const exp = Math.min(attempts, 6);
  const ms = BASE_BACKOFF_MS * Math.pow(2, exp);
  return new Date(Date.now() + ms);
}

export { MAX_ATTEMPTS };
