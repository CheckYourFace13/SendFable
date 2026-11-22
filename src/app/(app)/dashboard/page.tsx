import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { isOwnerInternalWorkspace } from "@/lib/internal-entitlement";
import { ensureSendCountReset } from "@/lib/quota";
import { formatNumber } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import { AutopilotDashboardCard } from "./autopilot-card";
import { UsageUpgradeBanner } from "@/components/app/usage-upgrade-banner";
import { FirstSendFeedback } from "@/components/app/first-send-feedback";
import { SetupChecklist, type SetupItem } from "./setup-checklist";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspaceContext();

  if (!workspace.onboardingCompletedAt && workspace.onboardingStep < 4) {
    const campaignCount = await prisma.campaign.count({
      where: { workspaceId: workspace.id },
    });
    if (campaignCount === 0) {
      redirect("/onboarding");
    }
  }

  const owner = await ensureSendCountReset(await getWorkspaceOwner(workspace.id));
  const plan = PLANS[owner.plan];
  const internalUnlimited = isOwnerInternalWorkspace({
    isInternal: workspace.isInternal,
    disabled: Boolean(workspace.disabledAt),
  });

  const [
    contactCount,
    campaignCount,
    recentCampaigns,
    completedCount,
    verifiedSender,
    publishedSignupTool,
    testSentCount,
  ] = await Promise.all([
    prisma.contact.count({ where: { workspaceId: workspace.id } }),
    prisma.campaign.count({ where: { workspaceId: workspace.id } }),
    prisma.campaign.findMany({
      where: { workspaceId: workspace.id, status: { in: ["COMPLETED", "SENDING"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.campaign.count({
      where: { workspaceId: workspace.id, status: "COMPLETED" },
    }),
    prisma.senderIdentity.count({
      where: { workspaceId: workspace.id, status: "VERIFIED" },
    }),
    prisma.signupForm.count({
      where: { workspaceId: workspace.id, status: "ACTIVE" },
    }),
    prisma.campaign.count({
      where: { workspaceId: workspace.id, testSentAt: { not: null } },
    }),
  ]);

  const firstRun = completedCount === 0;
  const audienceReady = contactCount > 0 || publishedSignupTool > 0;

  const activationSteps: SetupItem[] = [
    {
      id: "sender",
      label: "Verify your sending email",
      done: verifiedSender > 0,
      href: "/settings/senders",
      hint: "Confirm the From address people recognize.",
    },
    {
      id: "audience",
      label: "Add contacts or publish a Signup Tool",
      done: audienceReady,
      href: contactCount > 0 ? "/forms" : "/contacts",
      hint: "Import a CSV, add people, or publish a hosted signup.",
    },
    {
      id: "test",
      label: "Send yourself a test",
      done: testSentCount > 0,
      href: campaignCount > 0 ? "/campaigns" : "/campaigns/new",
      hint: "Open a draft and use Send test before a real send.",
    },
    {
      id: "first-send",
      label: "Send your first campaign",
      done: completedCount > 0,
      href: campaignCount > 0 ? "/campaigns" : "/campaigns/new",
      hint: "Review recipients, then send or schedule.",
    },
  ];

  if (firstRun) {
    return (
      <div className="mx-auto max-w-xl">
        {!internalUnlimited && (
          <UsageUpgradeBanner
            planName={plan.name}
            planIsFree={owner.plan === "FREE"}
            emailsUsed={owner.monthlySendCount}
            emailsCap={plan.emailsPerMonth}
            contactsUsed={contactCount}
            contactsCap={plan.contactCap}
            surface="dashboard"
          />
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Let&apos;s send your first campaign
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Steps update from your real account — finish them in any order.
        </p>

        <div className="mt-8">
          <SetupChecklist items={activationSteps} />
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link href="/onboarding" className="text-teal hover:underline">
            Guided setup
          </Link>
          <Link href="/contacts/migrate" className="text-muted-foreground hover:underline">
            Migrate from another tool
          </Link>
          <Link href="/forms" className="text-muted-foreground hover:underline">
            Signup Tools
          </Link>
        </div>
      </div>
    );
  }

  const recentContacts = await prisma.contact.findMany({
    where: {
      workspaceId: workspace.id,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { createdAt: true },
  });
  const growthMap = new Map<string, number>();
  for (const row of recentContacts) {
    const day = new Date(row.createdAt).toISOString().slice(0, 10);
    growthMap.set(day, (growthMap.get(day) || 0) + 1);
  }
  const growth = Array.from(growthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return (
    <div>
      {!internalUnlimited && (
        <UsageUpgradeBanner
          planName={plan.name}
          planIsFree={owner.plan === "FREE"}
          emailsUsed={owner.monthlySendCount}
          emailsCap={plan.emailsPerMonth}
          contactsUsed={contactCount}
          contactsCap={plan.contactCap}
          surface="dashboard"
        />
      )}
      <FirstSendFeedback show={completedCount === 1} />
      <AutopilotDashboardCard workspaceId={workspace.id} />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground">
            {internalUnlimited
              ? `${formatNumber(contactCount)} people · Internal workspace — unlimited`
              : `${formatNumber(contactCount)} people · ${formatNumber(owner.monthlySendCount)} / ${formatNumber(plan.emailsPerMonth)} emails this month`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/campaigns">Reuse a campaign</Link>
          </Button>
          <Button asChild>
            <Link href="/campaigns/new">Create an email</Link>
          </Button>
        </div>
      </div>

      <DashboardCharts growth={growth} campaigns={recentCampaigns} />
    </div>
  );
}
