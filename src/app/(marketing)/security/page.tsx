import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import {
  LEGAL_OPERATOR_STATEMENT,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";
import { LegalA, LegalH2, LegalUl } from "@/components/legal/legal-doc";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Security & responsible disclosure",
  description:
    "SendFable security practices, customer responsibilities, and how to report vulnerabilities — without unverified compliance badges.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Security", href: "/security", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">
        Security &amp; responsible disclosure
      </h1>
      <p>
        <strong>Effective date:</strong> {POLICY_EFFECTIVE_DATE}
        <br />
        <strong>Last updated:</strong> {POLICY_LAST_UPDATED}
        <br />
        <strong>Document version:</strong> {POLICY_VERSIONS.security}
      </p>
      <p className="text-lg text-muted-foreground">
        This page describes practices we actually implement. {LEGAL_OPERATOR_STATEMENT}. We do not
        claim SOC 2, ISO 27001, HIPAA, PCI certification beyond Stripe&apos;s role as payment
        processor, penetration-test scores, or other formal certifications unless we link to a
        current report.
      </p>

      <LegalH2>General approach</LegalH2>
      <LegalUl>
        <li>Encryption in transit via HTTPS/TLS for the public application.</li>
        <li>Access controls on production systems and least-privilege cloud credentials where used.</li>
        <li>Role-based access inside Workspaces (OWNER / ADMIN / MEMBER).</li>
        <li>Tenant isolation controls so Workspace data is scoped by Workspace membership.</li>
        <li>Database backups and, when enabled, encrypted off-host backups.</li>
        <li>Operational health checks and logging for reliability and abuse response.</li>
        <li>Incident response: investigate, contain, remediate, and notify as appropriate and required.</li>
      </LegalUl>

      <LegalH2>Accounts &amp; authentication</LegalH2>
      <LegalUl>
        <li>Passwords stored as one-way bcrypt hashes, not plaintext.</li>
        <li>Magic-link sign-in uses time-limited tokens emailed only to the claimed address.</li>
        <li>Session auth via Auth.js / NextAuth with server-side checks on app routes.</li>
        <li>No requirement for Google or Microsoft OAuth.</li>
      </LegalUl>

      <LegalH2>Payments and email delivery</LegalH2>
      <LegalUl>
        <li>Stripe handles payment-card details; we store billing identifiers and subscription state, not full PANs.</li>
        <li>Amazon SES / AWS handles campaign delivery and related bounce/complaint feedback.</li>
      </LegalUl>

      <LegalH2>Sending &amp; abuse controls</LegalH2>
      <LegalUl>
        <li>Acceptable Use prohibitions on purchased/scraped lists and abusive content.</li>
        <li>Campaign auto-pause on elevated bounce or complaint rates.</li>
        <li>Suppression of hard bounces, complaints, and unsubscribes.</li>
        <li>New-account daily send ramps and plan quotas.</li>
        <li>Manual sending holds for abuse or payment risk.</li>
      </LegalUl>

      <LegalH2>No absolute guarantee</LegalH2>
      <p>
        No internet service can guarantee perfect security or uninterrupted availability. See also
        the disclaimers in our <LegalA href={POLICY_PATHS.terms}>Terms</LegalA> and{" "}
        <LegalA href={POLICY_PATHS.privacy}>Privacy Policy</LegalA>.
      </p>

      <LegalH2>Customer security responsibilities</LegalH2>
      <LegalUl>
        <li>Protect account credentials and mailbox access used for magic links.</li>
        <li>Invite only trusted Authorized Users and remove access you no longer need.</li>
        <li>Keep Recipient permission and list hygiene lawful.</li>
        <li>Do not share secrets in campaign content or support tickets.</li>
      </LegalUl>

      <LegalH2>Responsible disclosure</LegalH2>
      <p>
        Report suspected vulnerabilities to{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.security}`}>{PUBLIC_MAILBOXES.security}</LegalA> or
        through our <Link href="/contact" className="underline">contact form</Link> (topic: Security
        issue). Please include:
      </p>
      <LegalUl>
        <li>A clear description of the issue and potential impact</li>
        <li>Steps to reproduce or proof-of-concept details (non-destructive)</li>
        <li>Affected URLs, accounts (test only), and approximate timing</li>
        <li>Your contact information for follow-up</li>
      </LegalUl>
      <p>
        Do not publicly disclose the issue before we have had a reasonable chance to remediate. Do
        not perform destructive testing, data exfiltration beyond what is needed to demonstrate the
        issue, social engineering of staff or Customers, or attacks on other VPS applications
        sharing infrastructure. We aim to acknowledge good-faith reports and keep you updated, but
        we do not guarantee a fixed response deadline or bounty.
      </p>

      <LegalH2>Privacy requests</LegalH2>
      <p>
        For privacy or data requests, email{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.privacy}`}>{PUBLIC_MAILBOXES.privacy}</LegalA> or
        see our <LegalA href={POLICY_PATHS.privacy}>Privacy Policy</LegalA>.
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
