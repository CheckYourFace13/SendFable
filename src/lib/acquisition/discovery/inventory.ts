/**
 * Acquisition inventory health — drives continuous self-replenishing discovery.
 *
 * Rule: keep ≥14 days of qualified+queued (sendable) inventory at the current
 * ramp stage. Preferred buffer is higher (Stage 1 → 100).
 */

import { prisma } from "@/lib/prisma";
import { getStageCaps } from "@/lib/acquisition/ramp";
import { ACQUISITION_RAMP_STAGES } from "@/lib/acquisition/flags";

/** 14-day minimum sendable inventory by ramp stage (new/day × 14). */
export const INVENTORY_MIN_BY_STAGE: Record<number, number> = {
  1: ACQUISITION_RAMP_STAGES[1].newPerDay * 14, // 70
  2: ACQUISITION_RAMP_STAGES[2].newPerDay * 14, // 140
  3: ACQUISITION_RAMP_STAGES[3].newPerDay * 14, // 280
  4: ACQUISITION_RAMP_STAGES[4].newPerDay * 14, // 420
};

/** Preferred Stage 1 buffer above the 14-day floor. */
export const INVENTORY_PREFERRED_BUFFER_STAGE1 = 100;

/** Days below this → STARVED (worker prioritizes discovery). */
export const INVENTORY_STARVED_DAYS = 2;
export const INVENTORY_MIN_DAYS = 14;
/** Alert when no newly QUALIFIED prospects for this long. */
export const DISCOVERY_STARVED_HOURS = 48;

/** Base safe enrich ceiling per UTC day (protects Overpass + site fetches). */
export const DISCOVERY_DAILY_ATTEMPT_CEILING = 200;
/** Hard cap even when inventory is deeply starved. */
export const DISCOVERY_DAILY_ATTEMPT_HARD_CAP = 600;

/** Scale daily ceiling with inventory deficit (~8 enrich attempts per needed qualified). */
export function discoveryCeilingForDeficit(
  preferredTarget: number,
  sendableInventory: number
): number {
  const deficit = Math.max(0, preferredTarget - sendableInventory);
  const scaled = Math.max(DISCOVERY_DAILY_ATTEMPT_CEILING, deficit * 8);
  return Math.min(DISCOVERY_DAILY_ATTEMPT_HARD_CAP, scaled);
}

/** Cooldown between discovery runs (minutes) by inventory status. */
export const DISCOVERY_COOLDOWN_MINUTES = {
  STARVED: 12,
  LOW: 25,
  HEALTHY: 50,
} as const;

export type InventoryStatus = "HEALTHY" | "LOW" | "STARVED";

export type InventoryHealth = {
  qualifiedUnsent: number;
  queuedUnsent: number;
  sendableInventory: number;
  daysOfInventory: number;
  stage: number;
  newPerDay: number;
  /** Stage-scaled 14-day floor (70 / 140 / 280 / 420). */
  targetMin: number;
  /** Preferred fill target (Stage 1 prefers 100). */
  preferredTarget: number;
  status: InventoryStatus;
  needsDiscovery: boolean;
  lastDiscoveryAt: Date | null;
  lastEmailSentAt: Date | null;
  /** True when no new QUALIFIED in 48h while inventory needs fill. */
  discoveryStarved: boolean;
  attemptsToday: number;
  dailyCeiling: number;
  canDiscoverMoreToday: boolean;
};

export function inventoryTargetForStage(stage: number): {
  targetMin: number;
  preferredTarget: number;
} {
  const s = Math.min(4, Math.max(1, stage));
  const targetMin = INVENTORY_MIN_BY_STAGE[s] ?? INVENTORY_MIN_BY_STAGE[1];
  const preferredTarget =
    s === 1 ? Math.max(targetMin, INVENTORY_PREFERRED_BUFFER_STAGE1) : targetMin;
  return { targetMin, preferredTarget };
}

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

async function discoveryAttemptsToday(now = new Date()): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const runs = await prisma.acquisitionEvent.findMany({
    where: { type: "discovery_run", createdAt: { gte: start } },
    select: { meta: true },
  });
  let sum = 0;
  for (const r of runs) {
    const meta = r.meta as { attempted?: number };
    if (typeof meta?.attempted === "number") sum += meta.attempted;
  }
  return sum;
}

export async function getInventoryHealth(now = new Date()): Promise<InventoryHealth> {
  const caps = await getStageCaps();
  const inv = await countSendableInventory();
  const { targetMin, preferredTarget } = inventoryTargetForStage(caps.stage);
  const daysOfInventory =
    caps.newPerDay > 0 ? inv.sendableInventory / caps.newPerDay : inv.sendableInventory;

  const lastDiscovery = await prisma.acquisitionEvent.findFirst({
    where: { type: { in: ["discovery_run", "discovered_new"] } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const lastQualifiedEvent = await prisma.acquisitionEvent.findFirst({
    where: {
      type: { in: ["discovered_new", "discovered", "auto_approved"] },
      createdAt: { gte: new Date(now.getTime() - DISCOVERY_STARVED_HOURS * 3600_000) },
    },
    select: { createdAt: true },
  });
  // Also count QUALIFIED/QUEUED prospects updated recently as evidence of fill
  const recentQualifiedProspect = await prisma.acquisitionProspect.findFirst({
    where: {
      status: { in: ["QUALIFIED", "QUEUED"] },
      updatedAt: { gte: new Date(now.getTime() - DISCOVERY_STARVED_HOURS * 3600_000) },
      sourceKind: { not: "seed_catalog" },
    },
    select: { updatedAt: true },
  });

  const lastSent = await prisma.acquisitionMessage.findFirst({
    where: { dryRun: false, sentAt: { not: null } },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });

  const attemptsToday = await discoveryAttemptsToday(now);
  const dailyCeiling = discoveryCeilingForDeficit(preferredTarget, inv.sendableInventory);
  const canDiscoverMoreToday = attemptsToday < dailyCeiling;

  let status: InventoryStatus = "HEALTHY";
  if (inv.sendableInventory === 0 || daysOfInventory < INVENTORY_STARVED_DAYS) {
    status = "STARVED";
  } else if (daysOfInventory < INVENTORY_MIN_DAYS || inv.sendableInventory < targetMin) {
    status = "LOW";
  }

  const fillingOk = Boolean(lastQualifiedEvent || recentQualifiedProspect);
  const discoveryStarved =
    status !== "HEALTHY" && !fillingOk && Boolean(lastDiscovery?.createdAt);

  return {
    ...inv,
    daysOfInventory: Math.round(daysOfInventory * 10) / 10,
    stage: caps.stage,
    newPerDay: caps.newPerDay,
    targetMin,
    preferredTarget,
    status,
    needsDiscovery: status !== "HEALTHY" || inv.sendableInventory < preferredTarget,
    lastDiscoveryAt: lastDiscovery?.createdAt ?? null,
    lastEmailSentAt: lastSent?.sentAt ?? null,
    discoveryStarved,
    attemptsToday,
    dailyCeiling,
    canDiscoverMoreToday,
  };
}

/** @deprecated use inventoryTargetForStage(1).preferredTarget */
export const INVENTORY_MIN_QUALIFIED = INVENTORY_PREFERRED_BUFFER_STAGE1;
