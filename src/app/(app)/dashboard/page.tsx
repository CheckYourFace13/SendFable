import Link from "next/link";
import { CheckCircle2, Circle, Send, Users, Mail } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS, BOUNCE_PAUSE_THRESHOLD, COMPLAINT_PAUSE_THRESHOLD, rampDailyLimit } from "@/lib/plans";
import { ensureSendCountReset } from "@/lib/quota";
import { formatNumber, formatPercent } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspaceContext();
  const owner = await ensureSendCountReset(await getWorkspaceOwner(workspace.id));
  const plan = PLANS[owner.plan];

  const [
    contactCount,
    verifiedSenders,
    campaignCount,
    recentCampaigns,
    recentContacts,
    completedStats,
  ] = await Promise.all([
    prisma.contact.count({ where: { workspaceId: workspace.id } }),
    prisma.senderIdentity.count({
      where: { workspaceId: workspace.id, status: "VERIFIED", type: "ADDRESS" },
    }),
    prisma.campaign.count({ where: { workspaceId: workspace.id } }),
    prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        workspaceId: workspace.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true },
    }),
    prisma.campaign.aggregate({
      where: { workspaceId: workspace.id, status: "COMPLETED" },
      _sum: { sentCount: true, bounceCount: true, complaintCount: true },
    }),
  ]);

  const checklist = [
    {
      done: verifiedSenders > 0,
      label: "Verify a sender identity",
      href: "/settings/senders",
    },
    {
      done: contactCount > 0,
      label: "Import contacts",
      href: "/contacts/import",
    },
    {
      done: campaignCount > 0,
      label: "Create your first campaign",
      href: "/campaigns/new",
    },
  ];

  const sent = completedStats._sum.sentCount ?? 0;
  const bounces = completedStats._sum.bounceCount ?? 0;
  const complaints = completedStats._sum.complaintCount ?? 0;
  const bounceRate = sent ? bounces / sent : 0;
  const complaintRate = sent ? complaints / sent : 0;

  const growthMap = new Map<string, number>();
  for (const row of recentContacts) {
    const day = new Date(row.createdAt).toISOString().slice(0, 10);
    growthMap.set(day, (growthMap.get(day) || 0) + 1);
  }
  const growth = Array.from(growthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const quotaPct = Math.min(100, (owner.monthlySendCount / plan.emailsPerMonth) * 100);
  const contactPct = Math.min(100, (contactCount / plan.contactCap) * 100);

  return (
    <div>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Your audience, campaigns, and deliverability at a glance."
      />

      {!checklist.every((c) => c.done) && (
        <div className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Get started</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Three steps to your first send.
          </p>
          <ul className="mt-4 space-y-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>
                    {item.label}
                  </span>
                </div>
                {!item.done && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href}>Start</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Contacts" value={formatNumber(contactCount)} />
        <StatCard icon={<Send className="h-4 w-4" />} label="Campaigns" value={formatNumber(campaignCount)} />
        <StatCard
          icon={<Mail className="h-4 w-4" />}
          label="Sent this month"
          value={`${formatNumber(owner.monthlySendCount)} / ${formatNumber(plan.emailsPerMonth)}`}
        />
        <StatCard
          label="Daily ramp"
          value={`${formatNumber(rampDailyLimit(owner.accountRampLevel, owner.plan))} / day`}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Quota</h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Emails</span>
                <span className="text-muted-foreground">{quotaPct.toFixed(0)}%</span>
              </div>
              <Progress value={quotaPct} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Contacts</span>
                <span className="text-muted-foreground">{contactPct.toFixed(0)}%</span>
              </div>
              <Progress value={contactPct} />
            </div>
          </div>
          {owner.plan === "FREE" && (
            <Button asChild className="mt-4" size="sm">
              <Link href="/billing">Upgrade plan</Link>
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Account health</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Bounce rate</dt>
              <dd className={`text-lg font-semibold ${bounceRate > BOUNCE_PAUSE_THRESHOLD ? "text-red-600" : ""}`}>
                {formatPercent(bounceRate)}
              </dd>
              <dd className="text-xs text-muted-foreground">Pause at {formatPercent(BOUNCE_PAUSE_THRESHOLD)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Complaint rate</dt>
              <dd className={`text-lg font-semibold ${complaintRate > COMPLAINT_PAUSE_THRESHOLD ? "text-red-600" : ""}`}>
                {formatPercent(complaintRate, 3)}
              </dd>
              <dd className="text-xs text-muted-foreground">Pause at {formatPercent(COMPLAINT_PAUSE_THRESHOLD, 2)}</dd>
            </div>
          </dl>
          {!workspace.mailingAddress && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Add a physical mailing address in{" "}
              <Link href="/settings" className="underline">Settings</Link> before your first send.
            </p>
          )}
        </div>
      </div>

      <DashboardCharts growth={growth} campaigns={recentCampaigns} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
