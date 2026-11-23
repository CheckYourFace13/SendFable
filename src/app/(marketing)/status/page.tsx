import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const metadata = marketingPageMeta({
  title: "Service status",
  description: "Current SendFable service status. Report problems with the contact form.",
  path: "/status",
});

export const dynamic = "force-dynamic";

async function liveChecks(): Promise<{
  ok: boolean;
  checkedAt: Date;
  checks: { app: "ok"; database: "ok" | "down"; redis: "ok" | "down" | "n/a" };
}> {
  const checks: { app: "ok"; database: "ok" | "down"; redis: "ok" | "down" | "n/a" } = {
    app: "ok",
    database: "down",
    redis: "n/a",
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "down";
  }
  try {
    const redis = getRedis();
    if (redis) {
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "down";
    }
  } catch {
    checks.redis = "down";
  }
  return {
    ok: checks.database === "ok",
    checkedAt: new Date(),
    checks,
  };
}

function formatCheckedAt(d: Date): string {
  try {
    // Explicit field options (not dateStyle/timeStyle) so Alpine/Node without full ICU still formats.
    return d.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return `${d.toISOString()} UTC`;
  }
}

export default async function StatusPage() {
  const health = await liveChecks();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Status", href: "/status", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Service status</h1>
      <p className="text-lg text-muted-foreground">Live platform checks for SendFable.</p>

      <div className="rounded-2xl border bg-slate-50 p-6">
        {health.ok ? (
          <p className="text-lg font-medium text-slate-900">No known issues.</p>
        ) : (
          <p className="text-lg font-medium text-coral">
            We detected a problem with a core check. Sending and sign-in may be affected.
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Last checked {formatCheckedAt(health.checkedAt)}.
        </p>
        <ul className="mt-4 space-y-1 text-sm text-ink/70">
          <li>App: {health.checks.app === "ok" ? "OK" : "Issue"}</li>
          <li>Database: {health.checks.database === "ok" ? "OK" : "Issue"}</li>
          {health.checks.redis !== "n/a" ? (
            <li>Cache: {health.checks.redis === "ok" ? "OK" : "Issue"}</li>
          ) : null}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
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
