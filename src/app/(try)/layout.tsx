import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { MarketingAnalytics } from "@/components/marketing/marketing-analytics";

export const dynamic = "force-dynamic";

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="border-b border-ink/8 bg-page/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Logo variant="lockup" className="h-7 w-auto" />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="px-4 py-6 text-center text-xs text-ink/45">SendFable</footer>
      <Suspense fallback={null}>
        <MarketingAnalytics />
      </Suspense>
    </div>
  );
}
