/**
 * Self-replenishing discovery autofill — runs until inventory target or daily ceiling.
 */

import { prisma } from "@/lib/prisma";
import { acquisitionDiscoveryEnabled } from "@/lib/acquisition/flags";
import { runDiscovery, type DiscoverSummary } from "@/lib/acquisition/discovery/discover";
import {
  DISCOVERY_COOLDOWN_MINUTES,
  DISCOVERY_STARVED_HOURS,
  getInventoryHealth,
  type InventoryHealth,
} from "@/lib/acquisition/discovery/inventory";
import { alertOwnerException } from "@/lib/acquisition/notify";
import { autoApproveAndQueue } from "@/lib/acquisition/auto-approve";

export type AutofillResult = {
  ran: boolean;
  reason: string;
  batches: number;
  attempted: number;
  newDomains: number;
  qualified: number;
  approved: number;
  healthBefore: InventoryHealth;
  healthAfter: InventoryHealth | null;
};

function cooldownMs(status: InventoryHealth["status"]): number {
  return DISCOVERY_COOLDOWN_MINUTES[status] * 60_000;
}

export async function shouldRunDiscoveryNow(now = new Date()): Promise<boolean> {
  if (!acquisitionDiscoveryEnabled()) return false;

  const health = await getInventoryHealth(now);

  // Always allow daily maintenance pass at UTC noon when healthy
  const noonPass = now.getUTCHours() === 12 && now.getUTCMinutes() < 5;
  if (!health.needsDiscovery && !noonPass) return false;
  if (!health.canDiscoverMoreToday && health.needsDiscovery) return false;

  const recent = await prisma.acquisitionEvent.findFirst({
    where: {
      type: "discovery_run",
      createdAt: { gte: new Date(now.getTime() - cooldownMs(health.status)) },
    },
    select: { id: true },
  });
  if (recent) return false;

  return health.needsDiscovery || noonPass;
}

/**
 * Run 1..N discovery batches until preferred inventory target or daily ceiling.
 * STARVED runs more markets / larger batches; never lowers score threshold.
 */
export async function runInventoryAutofill(
  now = new Date(),
  opts?: { force?: boolean }
): Promise<AutofillResult> {
  const healthBefore = await getInventoryHealth(now);
  if (!acquisitionDiscoveryEnabled()) {
    return {
      ran: false,
      reason: "disabled",
      batches: 0,
      attempted: 0,
      newDomains: 0,
      qualified: 0,
      approved: 0,
      healthBefore,
      healthAfter: healthBefore,
    };
  }
  if (!opts?.force && !(await shouldRunDiscoveryNow(now))) {
    return {
      ran: false,
      reason: "cooldown_or_healthy",
      batches: 0,
      attempted: 0,
      newDomains: 0,
      qualified: 0,
      approved: 0,
      healthBefore,
      healthAfter: healthBefore,
    };
  }
  if (opts?.force) {
    if (healthBefore.sendableInventory >= healthBefore.preferredTarget) {
      return {
        ran: false,
        reason: "healthy",
        batches: 0,
        attempted: 0,
        newDomains: 0,
        qualified: 0,
        approved: 0,
        healthBefore,
        healthAfter: healthBefore,
      };
    }
    if (!healthBefore.canDiscoverMoreToday) {
      return {
        ran: false,
        reason: "daily_ceiling",
        batches: 0,
        attempted: 0,
        newDomains: 0,
        qualified: 0,
        approved: 0,
        healthBefore,
        healthAfter: healthBefore,
      };
    }
  }

  let batches = 0;
  let attempted = 0;
  let newDomains = 0;
  let qualified = 0;
  let approved = 0;
  const maxBatches =
    healthBefore.status === "STARVED"
      ? 5
      : healthBefore.status === "LOW"
        ? 4
        : 1;

  for (let i = 0; i < maxBatches; i++) {
    const health = await getInventoryHealth(now);
    if (health.sendableInventory >= health.preferredTarget) break;
    if (!health.canDiscoverMoreToday) break;

    const remaining = health.dailyCeiling - health.attemptsToday;
    if (remaining <= 0) break;

    const limit =
      health.status === "STARVED"
        ? Math.min(40, remaining)
        : health.status === "LOW"
          ? Math.min(30, remaining)
          : Math.min(20, remaining);

    const disc: DiscoverSummary = await runDiscovery({
      limit,
      enrich: true,
      marketCount: health.status === "STARVED" ? 5 : health.status === "LOW" ? 4 : 3,
      marketOffset: i + now.getUTCHours(),
    });
    batches++;
    attempted += disc.attempted;
    newDomains += disc.newDomains;
    qualified += disc.qualified;

    const ap = await autoApproveAndQueue({ limit: 30 });
    approved += ap.approved;

    // Stop early if we made no progress (avoid spinning Overpass)
    if (disc.newDomains === 0 && disc.qualified === 0 && disc.upserted === 0) break;
  }

  const healthAfter = await getInventoryHealth(now);
  await maybeAlertDiscoveryStarved(healthAfter, newDomains, qualified);

  return {
    ran: batches > 0,
    reason: batches > 0 ? "autofill" : "no_batch",
    batches,
    attempted,
    newDomains,
    qualified,
    approved,
    healthBefore,
    healthAfter,
  };
}

async function maybeAlertDiscoveryStarved(
  health: InventoryHealth,
  newDomainsThisRun: number,
  qualifiedThisRun: number
): Promise<void> {
  if (health.status === "HEALTHY") return;
  if (qualifiedThisRun > 0 || newDomainsThisRun > 0) return;
  if (!health.discoveryStarved && health.sendableInventory > 0) {
    // Only alert on true 48h drought when needing inventory
  }

  const since = new Date(Date.now() - DISCOVERY_STARVED_HOURS * 3600_000);
  const recentQualified = await prisma.acquisitionProspect.count({
    where: {
      status: { in: ["QUALIFIED", "QUEUED"] },
      updatedAt: { gte: since },
      sourceKind: { not: "seed_catalog" },
    },
  });
  if (recentQualified > 0) return;

  const alertSince = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const recentAlert = await prisma.acquisitionEvent.findFirst({
    where: { type: "discovery_starved_alert", createdAt: { gte: alertSince } },
  });
  if (recentAlert) return;

  await alertOwnerException(
    "SendFable acquisition discovery STARVED — no new qualified businesses (48h)",
    `Inventory status: ${health.status}\nSendable: ${health.sendableInventory} (target ${health.preferredTarget}, ${health.daysOfInventory} days)\nStage: ${health.stage}\nAttempts today: ${health.attemptsToday}/${health.dailyCeiling}\n\nNo new QUALIFIED/QUEUED from continuous discovery in ${DISCOVERY_STARVED_HOURS}h. Check Overpass /admin/acquisition.`
  );
  await prisma.acquisitionEvent.create({
    data: {
      type: "discovery_starved_alert",
      meta: {
        status: health.status,
        sendable: health.sendableInventory,
        preferredTarget: health.preferredTarget,
      },
    },
  });
}
