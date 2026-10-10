import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { MobileAppNav } from "@/components/app/mobile-app-nav";
import { UserMenu } from "@/components/app/user-menu";
import { VerifyEmailBanner } from "@/components/app/verify-email-banner";
import { RedisDevBanner } from "@/components/app/redis-dev-banner";
import { EarlyLaunchBanner } from "@/components/app/early-launch-banner";
import { PolicyReacceptBanner } from "@/components/app/policy-reaccept-banner";
import { AdminViewBanner } from "@/components/app/admin-view-banner";
import { ReportProductIssue } from "@/components/app/report-product-issue";
import { requireWorkspaceContext } from "@/lib/session";
import { needsPolicyReacceptance } from "@/lib/policy-acceptance";
import { PLANS } from "@/lib/plans";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { ADMIN_VIEW_COOKIE } from "@/lib/admin-view";
import { isOwnerAdminUser } from "@/lib/platform-admin";
import { OWNER_ADMIN_HOME } from "@/lib/owner-admin-access";
import { prisma } from "@/lib/prisma";
import {
  INTERNAL_ENTITLEMENT_LABEL,
  isOwnerInternalWorkspace,
  workspaceSwitcherModel,
} from "@/lib/internal-entitlement";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireWorkspaceContext();
  const showPolicyReaccept = await needsPolicyReacceptance(user.id);
  const entitlement = await getWorkspaceEntitlement(workspace.id).catch(() => null);
  const planName = PLANS[entitlement?.plan ?? user.plan].name;
  const internalUnlimited = entitlement
    ? isOwnerInternalWorkspace({
        isInternal: entitlement.isInternal,
        disabled: entitlement.disabled,
      })
    : false;
  const planNote = internalUnlimited ? INTERNAL_ENTITLEMENT_LABEL : `${planName} plan`;

  let adminViewName: string | null = null;
  const rawView = cookies().get(ADMIN_VIEW_COOKIE)?.value;
  if (rawView) {
    try {
      const parsed = JSON.parse(rawView) as { workspaceName?: string; workspaceId?: string };
      if (parsed.workspaceId === workspace.id && parsed.workspaceName) {
        adminViewName = parsed.workspaceName;
      }
    } catch {
      /* ignore */
    }
  }
  const ownerAdmin = await isOwnerAdminUser(user);
  const showIssueReporter = Boolean(workspace.isInternal) && ownerAdmin;
  const internalWorkspaces = ownerAdmin
    ? await prisma.workspace.findMany({
        where: { isInternal: true, disabledAt: null },
        select: { id: true, name: true, isInternal: true },
        orderBy: { name: "asc" },
      })
    : [];
  const ownMemberships = ownerAdmin
    ? []
    : await prisma.membership.findMany({
        where: { userId: user.id, workspace: { isInternal: false } },
        include: { workspace: { select: { id: true, name: true, isInternal: true } } },
        orderBy: { createdAt: "asc" },
      });
  const switcher = workspaceSwitcherModel({
    isOwnerAdmin: ownerAdmin,
    internalWorkspaces,
    memberships: ownMemberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      isInternal: m.workspace.isInternal,
    })),
  });

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-ink text-page lg:flex">
        <div className="flex h-14 items-center border-b border-white/10 px-5">
          <Logo href="/dashboard" tone="dark" className="h-7 w-auto" />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="truncate text-sm font-medium text-page">{workspace.name}</div>
          <div className="text-xs text-page/70">{planNote}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {adminViewName && <AdminViewBanner workspaceName={adminViewName} />}
        <EarlyLaunchBanner />
        <RedisDevBanner />
        {showPolicyReaccept && <PolicyReacceptBanner />}
        {!user.emailVerified && <VerifyEmailBanner />}
        {user.paymentFailedAt && !internalUnlimited && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Your last payment failed. Sending pauses if it isn&apos;t resolved.
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Update payment method
            </Link>
          </div>
        )}
        <header className="flex h-14 items-center justify-between gap-3 border-b border-ink/10 bg-page px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <MobileAppNav workspaceName={workspace.name} />
            <Logo href="/dashboard" className="h-7 w-auto" />
          </div>
          <div className="min-w-0 flex-1">
            {switcher.mode === "plain" ? (
              <div className="truncate text-sm font-medium text-ink">{workspace.name}</div>
            ) : (
              <WorkspaceSwitcher
                currentId={workspace.id}
                currentName={workspace.name}
                mode={switcher.mode}
                businesses={switcher.businesses}
                showAdminLinks={switcher.showAdminLinks}
                adminView={Boolean(adminViewName)}
              />
            )}
          </div>
          <UserMenu name={user.name} email={user.email} />
        </header>
        <main className="relative flex-1 overflow-x-auto bg-parchment/40 p-4 lg:p-8">
          {children}
          {showIssueReporter && <ReportProductIssue />}
        </main>
        {ownerAdmin && (
          <footer className="border-t border-ink/5 px-4 py-1.5 text-right lg:px-8">
            <Link
              href={OWNER_ADMIN_HOME}
              data-testid="owner-admin-link"
              className="text-[11px] font-normal text-ink/35 hover:text-ink/55"
            >
              Admin
            </Link>
          </footer>
        )}
      </div>
    </div>
  );
}
