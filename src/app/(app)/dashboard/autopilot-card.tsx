import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AutopilotUpgradeBanner } from "@/components/app/autopilot-upgrade-banner";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { softwareQuotas } from "@/lib/internal-entitlement";

export async function AutopilotDashboardCard({ workspaceId }: { workspaceId: string }) {
  const config = await prisma.marketingAutopilotConfig.findUnique({
    where: { workspaceId },
  });
  if (!config?.enabled) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-ink/15 bg-parchment/40 px-4 py-3 text-sm">
        <p className="font-medium text-ink">Marketing Autopilot</p>
        <p className="mt-1 text-muted-foreground">
          Watch a specials or events page. Draft campaigns automatically — send only when you
          approve.
        </p>
        <Link className="mt-2 inline-block text-coral underline" href="/settings/marketing-autopilot">
          Set up
        </Link>
      </div>
    );
  }

  const ent = await getWorkspaceEntitlement(workspaceId);
  const quotas = softwareQuotas({
    isInternal: ent.isInternal,
    disabled: ent.disabled,
    plan: ent.plan,
  });
  const unlimited = quotas.entitlement === "OWNER_INTERNAL_UNLIMITED";
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  );
  const draftsUsedThisMonth = await prisma.marketingAutopilotDraft.count({
    where: { workspaceId, createdAt: { gte: monthStart } },
  });
  const draftsCap = quotas.autopilotDraftsPerMonth;

  const waiting = await prisma.marketingAutopilotDraft.count({
    where: {
      workspaceId,
      status: { in: ["AWAITING_APPROVAL", "DRAFTED"] },
    },
  });
  const lastSent = await prisma.marketingAutopilotDraft.findFirst({
    where: { workspaceId, status: "SENT" },
    orderBy: { decidedAt: "desc" },
    select: { decidedAt: true },
  });
  const waitingDraft = await prisma.marketingAutopilotDraft.findFirst({
    where: {
      workspaceId,
      status: { in: ["AWAITING_APPROVAL", "DRAFTED", "EDITING"] },
    },
    orderBy: { createdAt: "desc" },
    select: { campaignId: true },
  });

  const host = config.pageUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="mb-6">
      {!unlimited && draftsCap != null && (
        <AutopilotUpgradeBanner
          plan={ent.plan}
          draftsUsed={draftsUsedThisMonth}
          draftsCap={draftsCap}
          surface="dashboard"
        />
      )}
      <div className="rounded-xl border border-teal/25 bg-teal/5 px-4 py-4 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-ink">Marketing Autopilot</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                Watching: <span className="text-ink">{host}</span>
              </li>
              <li>
                Last checked:{" "}
                {config.lastFetchedAt
                  ? new Date(config.lastFetchedAt).toLocaleDateString()
                  : "Not yet"}
              </li>
              <li>
                Drafts this month:{" "}
                {unlimited
                  ? `${draftsUsedThisMonth} · unlimited`
                  : draftsCap === 0
                    ? "Not included on Free — trial is 1 per month"
                    : `${draftsUsedThisMonth} / ${draftsCap}`}
              </li>
              <li>Drafts waiting: {waiting}. If you do nothing, nothing sends.</li>
              <li>
                Last campaign:{" "}
                {lastSent?.decidedAt
                  ? `Sent ${new Date(lastSent.decidedAt).toLocaleDateString()}`
                  : "—"}
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            {waitingDraft?.campaignId && (
              <Button asChild size="sm">
                <Link href="/settings/marketing-autopilot#waiting">Waiting for approval</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/marketing-autopilot">Settings</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
