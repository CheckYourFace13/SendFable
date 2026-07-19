import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { UserMenu } from "@/components/app/user-menu";
import { VerifyEmailBanner } from "@/components/app/verify-email-banner";
import { requireWorkspaceContext } from "@/lib/session";
import { PLANS } from "@/lib/plans";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireWorkspaceContext();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-white lg:flex">
        <div className="flex h-14 items-center border-b px-5">
          <Logo href="/dashboard" className="text-lg" />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="border-t p-4">
          <div className="truncate text-sm font-medium">{workspace.name}</div>
          <div className="text-xs text-muted-foreground">{PLANS[user.plan].name} plan</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!user.emailVerified && <VerifyEmailBanner />}
        {user.paymentFailedAt && (
          <div className="flex items-center justify-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
            <AlertTriangle className="h-4 w-4" />
            Your last payment failed. Sending pauses if it isn&apos;t resolved.
            <Link href="/billing" className="font-medium underline underline-offset-2">
              Update payment method
            </Link>
          </div>
        )}
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 lg:px-8">
          <div className="lg:hidden">
            <Logo href="/dashboard" className="text-lg" />
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">{workspace.name}</div>
          <UserMenu name={user.name} email={user.email} />
        </header>
        <main className="flex-1 bg-slate-50/60 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
