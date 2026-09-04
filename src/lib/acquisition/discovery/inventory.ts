/**
 * Acquisition inventory health — drives continuous discovery.
 */

import { prisma } from "@/lib/prisma";
import { getStageCaps } from "@/lib/acquisition/ramp";

/** Target qualified+queued unsent inventory at Stage 1+. */
export const INVENTORY_MIN_QUALIFIED = 100;
/** Maintain at least this many days of new-send capacity. */
export const INVENTORY_MIN_DAYS = 14;
/** Alert owner if no net-new domains discovered while enabled. */
export const DISCOVERY_STARVED_HOURS = 48;

export type InventoryHealth = {
  qualifiedUnsent: number;
  queuedUnsent: number;
  sendableInventory: number;
  daysOfInventory: number;
  stage: number;
  newPerDay: number;
  status: "ACTIVE" | "STARVED" | "LOW";
  needsDiscovery: boolean;
  lastDiscoveryAt: Date | null;
  lastEmailSentAt: Date | null;
  discoveryStarved: boolean;
};

export async function countSendableInventory(): Promise<{
  qualifiedUnsent: number;
  queuedUnsent: number;
  sendableInventory: number;
}> {
  const [qualifiedUnsent, queuedUnsent] = await Promise.all([
    prisma.acquisitionProspect.count({
      where: { status: "QUALIFIED", contactEmail: { not: null } },
    }),
    prisma.acquisitionProspect.count({
      where: { status: "QUEUED", contactEmail: { not: null } },
    }),
  ]);
  return {
    qualifiedUnsent,
    queuedUnsent,
    sendableInventory: qualifiedUnsent + queuedUnsent,
  };
}

export async function getInventoryHealth(now = new Date()): Promise<InventoryHealth> {
  const caps = await getStageCaps();
  const inv = await countSendableInventory();
  const daysOfInventory =
    caps.newPerDay > 0 ? inv.sendableInventory / caps.newPerDay : inv.sendableInventory;

  const lastDiscovery = await prisma.acquisitionEvent.findFirst({
    where: { type: { in: ["discovery_run", "discovered_new"] } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const lastSent = await prisma.acquisitionMessage.findFirst({
    where: { dryRun: false, sentAt: { not: null } },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });

  const lastDiscoveryAt = lastDiscovery?.createdAt ?? null;
  const discoveryStarved =
    !lastDiscoveryAt ||
    now.getTime() - lastDiscoveryAt.getTime() > DISCOVERY_STARVED_HOURS * 3600_000;

  let status: InventoryHealth["status"] = "ACTIVE";
  if (inv.sendableInventory === 0) status = "STARVED";
  else if (
    inv.sendableInventory < INVENTORY_MIN_QUALIFIED ||
    daysOfInventory < INVENTORY_MIN_DAYS
  ) {
    status = "LOW";
  }

  return {
    ...inv,
    daysOfInventory: Math.round(daysOfInventory * 10) / 10,
    stage: caps.stage,
    newPerDay: caps.newPerDay,
    status,
    needsDiscovery: status !== "ACTIVE",
    lastDiscoveryAt,
    lastEmailSentAt: lastSent?.sentAt ?? null,
    discoveryStarved: discoveryStarved && status !== "ACTIVE",
  };
}
