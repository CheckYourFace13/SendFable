import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Service status",
  description: "Current SendFable service status. Report problems with the contact form.",
  path: "/status",
});

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Status", href: "/status", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Service status</h1>
      <p className="text-lg text-muted-foreground">Current platform status for SendFable.</p>

      <div className="rounded-2xl border bg-slate-50 p-6">
        <p className="text-lg font-medium text-slate-900">No known issues.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          If something looks wrong in your workspace, use the{" "}
          <Link href="/contact" className="text-teal hover:underline">
            contact form
          </Link>
          .
        </p>
      </div>

      <MarketingCta
        title="Ready when you are"
        body="Create a free SendFable account and send your first campaign."
      />
    </div>
  );
}
