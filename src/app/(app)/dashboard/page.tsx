import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Mail, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { ensureSendCountReset } from "@/lib/quota";
import { formatNumber } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import { SetupChecklist } from "./setup-checklist";
import { externalEmailActive } from "@/lib/early-launch";

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspaceContext();

  if (!workspace.onboardingCompletedAt && workspace.onboardingStep < 10) {
    const campaignCount = await prisma.campaign.count({
      where: { workspaceId: workspace.id },
    });
    if (campaignCount === 0) {
      redirect("/onboarding");
    }
  }

  const owner = await ensureSendCountReset(await getWorkspaceOwner(workspace.id));
  const plan = PLANS[owner.plan];

  const [contactCount, campaignCount, recentCampaigns, completedCount, verifiedSender, testedCampaign] =
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
      prisma.campaign.count({
        where: { workspaceId: workspace.id, testSentAt: { not: null } },
      }),
    ]);

  const firstRun = completedCount === 0;
  const checklist = [
    {
      id: "profile",
      label: "Complete business profile",
      href: "/settings",
      done: !!(workspace.name?.trim() && workspace.businessDescription?.trim()),
      hint: "Add your business name and a short description.",
    },
    {
      id: "address",
      label: "Add physical mailing address",
      href: "/settings",
      done: !!workspace.mailingAddress?.trim(),
      hint: "Required by law in every email footer.",
    },
    {
      id: "sender",
      label: "Verify sender",
      href: "/settings/senders",
      done: verifiedSender > 0,
      hint: "Confirm the From address people will see.",
    },
    {
      id: "contacts",
      label: "Import contacts",
      href: "/contacts/import",
      done: contactCount > 0,
      hint: "Only people who asked to hear from you.",
    },
    {
      id: "campaign",
      label: "Create first campaign",
      href: "/campaigns/new",
      done: campaignCount > 0,
      hint: "Pick a goal and write a short message.",
    },
    {
      id: "test",
      label: "Send a test",
      href: campaignCount ? "/campaigns" : "/campaigns/new",
      done: testedCampaign > 0,
      hint: "Preview in your own inbox (local outbox until SES is on).",
    },
    {
      id: "delivery",
      label: "Activate delivery",
      href: "/settings/ses",
      done: externalEmailActive(),
      hint: "Amazon SES must be configured before real customer sends.",
    },
  ];

  if (firstRun) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          What do you want to do?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Three steps. Keep it simple — advanced tools stay in the sidebar when you need them.
        </p>

        <div className="mt-10 grid gap-4">
          <ActionCard
            href="/contacts/import"
            icon={<Users className="h-6 w-6" />}
            title="Add people"
            description="Import a spreadsheet or type in contacts who asked to hear from you."
          />
          <ActionCard
            href="/campaigns/new"
            icon={<Mail className="h-6 w-6" />}
            title="Create an email"
            description="Pick a goal, write a short message, and send a test to yourself."
          />
          <ActionCard
            href={recentCampaigns[0] ? `/campaigns/${recentCampaigns[0].id}/report` : "/campaigns"}
            icon={<BarChart3 className="h-6 w-6" />}
            title="View results"
            description="See who got your email and what to do next after you send."
            muted={!recentCampaigns.length}
          />
        </div>

        <SetupChecklist items={checklist} />

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/onboarding" className="text-teal hover:underline">
            Continue setup wizard
          </Link>
          <Link href="/contacts/migrate" className="text-muted-foreground hover:underline">
            Migrate from another tool
          </Link>
          <Link href="/settings/senders" className="text-muted-foreground hover:underline">
            Verify sender
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
            <Link href="/contacts/import">Add people</Link>
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

function ActionCard({
  href,
  icon,
  title,
  description,
  muted,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-4 rounded-2xl border bg-white p-6 shadow-sm transition hover:border-coral/50 ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="rounded-xl bg-parchment p-3 text-ink">{icon}</div>
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
