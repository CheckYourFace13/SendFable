import { prisma } from "@/lib/prisma";
import { processWelcomeLedgerJob } from "@/lib/newsletter/auto-welcome";
import { processAutopilotAutoLedgerJob } from "@/lib/newsletter/auto-weekly";

/** Drain due automation ledger jobs (welcome + autopilot auto-send retries). */
export async function processDueAutomationSends(limit = 10): Promise<string[]> {
  const actions: string[] = [];
  const now = new Date();

  // Recover stuck PROCESSING (>10 min)
  await prisma.automationSendLedger.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lte: new Date(now.getTime() - 10 * 60_000) },
    },
    data: { status: "FAILED", nextAttemptAt: now, updatedAt: now },
  });

  const due = await prisma.automationSendLedger.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  for (const job of due) {
    try {
      if (job.kind === "welcome") {
        const r = await processWelcomeLedgerJob(job.id);
        actions.push(`welcome:${job.id}:${r.status}`);
      } else if (job.kind === "autopilot_auto") {
        const r = await processAutopilotAutoLedgerJob(job.id);
        actions.push(`autopilot_auto:${job.id}:${r.status}`);
      } else {
        actions.push(`unknown_kind:${job.kind}`);
      }
    } catch (err) {
      actions.push(
        `err:${job.id}:${err instanceof Error ? err.message : "err"}`
      );
    }
  }
  return actions;
}
