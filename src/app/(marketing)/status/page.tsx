import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Service status",
  description:
    "How Sendfable plans to communicate platform status — a static foundation without fabricated uptime percentages.",
};

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
        This is a static status foundation — not a live monitor and not a page of invented uptime
        charts. When we publish real-time components, they will replace this explanation.
      </p>

      <div className="rounded-2xl border bg-slate-50 p-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Current posture
        </div>
        <p className="mt-2 text-lg font-medium text-slate-900">
          No automated status feed is connected on this page yet.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          If you are experiencing an issue, check your workspace dashboards first (sends, bounces,
          billing), then email support. We will not invent a green checkmark to look “always up.”
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
        Sendfable&apos;s app is healthy. We will distinguish product incidents from upstream provider
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
        Prefer email updates? Contact support from your account email once you are signed up — we
        are not collecting a fake status-subscriber count on this page.
      </p>

      <MarketingCta
        title="Build on a clear foundation"
        body="Create a free Sendfable account while we expand live status reporting."
      />
    </div>
  );
}
