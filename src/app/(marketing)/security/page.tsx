import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Security practices",
  description:
    "How Sendfable approaches account security, data handling, and email infrastructure — without unverified compliance badges.",
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Security", href: "/security", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Security overview</h1>
      <p className="text-lg text-muted-foreground">
        This page describes practices we actually implement. We do not claim SOC 2, ISO, or other
        certifications here unless we link to a current report — and we are not publishing fake
        badges.
      </p>

      <h2 className="pt-6 text-2xl font-semibold text-slate-900">Accounts & authentication</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Password credentials are stored as one-way hashes (bcrypt), not plaintext.</li>
        <li>Magic-link sign-in uses short-lived tokens delivered only to the claimed email address.</li>
        <li>Session auth is handled via NextAuth with server-side session checks on app routes.</li>
        <li>We do not require Google or Microsoft OAuth — you can use a work email directly.</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Data & subprocessors</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Application data lives in a managed Postgres database under our hosting stack.</li>
        <li>Email is delivered through Amazon SES on platform infrastructure you do not configure yourself.</li>
        <li>Payments and subscription state go through Stripe; we do not store full card numbers.</li>
        <li>We do not sell your contact lists.</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Sending & abuse controls</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Purchased, rented, or scraped lists are prohibited in our terms.</li>
        <li>Campaigns that exceed bounce or complaint thresholds are auto-paused.</li>
        <li>Hard bounces and complaints feed suppression so we avoid re-mailing known bad addresses.</li>
        <li>New accounts ramp daily send volume gradually to reduce sudden reputation risk.</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">What we will not claim</h2>
      <p>
        We will not invent uptime SLAs, penetration-test scores, or enterprise compliance seals on
        this page. If you need a DPA, security questionnaire, or subprocessors list for procurement,
        contact us and we will answer with current facts.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Report a concern</h2>
      <p>
        Email <a className="text-teal hover:underline" href="mailto:security@sendfable.com">security@sendfable.com</a>{" "}
        for suspected vulnerabilities or abuse. For privacy requests, see our{" "}
        <Link href="/privacy" className="text-teal hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <div className="pt-4">
        <Button asChild variant="outline">
          <Link href="/status">How status reporting works</Link>
        </Button>
      </div>

      <MarketingCta />
    </div>
  );
}
