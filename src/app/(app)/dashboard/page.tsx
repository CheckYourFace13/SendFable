import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { ensureSendCountReset } from "@/lib/quota";
import { formatNumber } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import { UsageUpgradeBanner } from "@/components/app/usage-upgrade-banner";
import { FirstSendFeedback } from "@/components/app/first-send-feedback";

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspaceContext();

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

  const [contactCount, campaignCount, recentCampaigns, completedCount, verifiedSender] =
    await Promise.all([
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
    ]);

  const firstRun = completedCount === 0;
  const firstSendSteps = [
    {
      id: "ready",
      label: "Account ready",
      done: true,
      href: "/dashboard",
    },
    {
      id: "contacts",
      label: "Add contacts",
      done: contactCount > 0,
      href: "/contacts",
    },
    {
      id: "sender",
      label: "Verify sender",
      done: verifiedSender > 0,
      href: "/settings/senders",
    },
    {
      id: "campaign",
      label: "Create campaign",
      done: campaignCount > 0,
      href: "/campaigns/new",
    },
  ];

  const nextStep =
    firstSendSteps.find((s) => !s.done) ??
    ({ id: "send", label: "Review & send", href: "/campaigns", done: false } as const);
  const continueHref = nextStep.href;

  if (firstRun) {
    return (
      <div className="mx-auto max-w-xl">
        <UsageUpgradeBanner
          planName={plan.name}
          planIsFree={owner.plan === "FREE"}
          emailsUsed={owner.monthlySendCount}
          emailsCap={plan.emailsPerMonth}
          contactsUsed={contactCount}
          contactsCap={plan.contactCap}
          surface="dashboard"
        />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Let&apos;s send your first campaign
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One clear path — we&apos;ll take you to the next incomplete step.
        </p>

        <ol className="mt-8 space-y-2 text-sm">
          {firstSendSteps.map((item, i) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:border-coral/40 ${
                  item.done ? "border-emerald-200 bg-emerald-50/60" : "bg-white"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    item.done ? "bg-emerald-600 text-white" : "bg-ink text-page"
                  }`}
                  aria-hidden
                >
                  {item.done ? "✓" : i + 1}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={continueHref}>Continue</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Next: {nextStep.label}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link href="/onboarding" className="text-teal hover:underline">
            Guided setup
          </Link>
          <Link href="/contacts/migrate" className="text-muted-foreground hover:underline">
            Migrate from another tool
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
      <UsageUpgradeBanner
        planName={plan.name}
        planIsFree={owner.plan === "FREE"}
        emailsUsed={owner.monthlySendCount}
        emailsCap={plan.emailsPerMonth}
        contactsUsed={contactCount}
        contactsCap={plan.contactCap}
        surface="dashboard"
      />
      <FirstSendFeedback show={completedCount === 1} />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground">
            {formatNumber(contactCount)} people · {formatNumber(owner.monthlySendCount)} /{" "}
            {formatNumber(plan.emailsPerMonth)} emails this month
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
