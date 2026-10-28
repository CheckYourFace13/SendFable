import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Service status",
  description:
    "How SendFable plans to communicate platform status. This page is a static foundation until live monitoring is connected.",
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
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Status</h1>
      <p className="text-lg text-muted-foreground">
        This page is a static status note. Live incident monitoring is not connected yet. When it
        is, it will replace this explanation.
      </p>

      <div className="rounded-2xl border bg-slate-50 p-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Current posture
        </div>
        <p className="mt-2 text-lg font-medium text-slate-900">
          No automated status feed is connected on this page yet.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          If something looks wrong, check your workspace dashboards first (sends, bounces, billing),
          then use the{" "}
          <Link href="/contact" className="text-teal hover:underline">
            contact form
          </Link>
          .
        </p>
      </div>

      <h2 className="pt-6 text-2xl font-semibold text-slate-900">What status will cover</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>App & API</strong> — ability to sign in, edit campaigns, and manage audiences
        </li>
        <li>
          <strong>Sending pipeline</strong> — queue workers that hand messages to Amazon SES
        </li>
        <li>
          <strong>Tracking & webhooks</strong> — open/click recording and SES event ingestion
        </li>
        <li>
          <strong>Billing</strong> — Stripe checkout and portal availability (when relevant)
        </li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Dependencies we do not control</h2>
      <p>
        Inbox placement and Amazon SES regional availability can affect delivery even when
        SendFable&apos;s app is healthy. We will distinguish product incidents from upstream provider
        issues whenever we post updates.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">How we will communicate</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Post incident summaries on this status surface (or a dedicated status host).</li>
        <li>Note start time, impact, and resolution without vague “degraded performance” fluff.</li>
        <li>Link related{" "}
          <Link href="/changelog" className="text-teal hover:underline">
            changelog
          </Link>{" "}
          entries when a fix ships.
        </li>
      </ol>

      <p className="pt-2 text-sm text-muted-foreground">
        Prefer a written update? Once you have an account, use the{" "}
        <Link href="/contact" className="text-teal hover:underline">
          contact form
        </Link>
        .
      </p>

      <MarketingCta
        title="Build on a clear foundation"
        body="Create a free SendFable account while we expand live status reporting."
      />
    </div>
  );
}
