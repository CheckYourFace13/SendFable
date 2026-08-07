import {
  LEGAL_OPERATOR_STATEMENT,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";
import { LegalA, LegalDoc, LegalH2, LegalH3, LegalUl } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Privacy Policy",
  description:
    "SendFable Privacy Policy: information collected, roles, subprocessors, cookies, retention, deletion, and how to make privacy requests.",
};

/*
 * NOTE (internal): technically tailored to the current product; not reviewed or
 * approved by counsel. See docs/LEGAL_STATUS.md.
 */
export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy">
      <p>
        <strong>Effective date:</strong> {POLICY_EFFECTIVE_DATE}
        <br />
        <strong>Last updated:</strong> {POLICY_LAST_UPDATED}
        <br />
        <strong>Document version:</strong> {POLICY_VERSIONS.privacy}
      </p>
      <p>
        This Privacy Policy explains how personal information is handled for the SendFable service.{" "}
        {LEGAL_OPERATOR_STATEMENT} (&quot;we,&quot; &quot;us&quot;). It is incorporated into our{" "}
        <LegalA href={POLICY_PATHS.terms}>Terms of Service</LegalA>.
      </p>

      <LegalH2>1. Roles</LegalH2>
      <LegalUl>
        <li>
          For contact lists, campaign content, form submissions, and similar Customer Content, we
          generally act as a <strong>service provider / processor</strong>. The Customer decides why
          and to whom campaigns are sent and is responsible for lawful bases and notices to
          Recipients.
        </li>
        <li>
          For account, billing, security, fraud/abuse, support, and platform operations data, we act
          as an independent controller / business for our own legitimate operational purposes.
        </li>
      </LegalUl>
      <p>
        We do not claim that SendFable is automatically subject to every privacy statute (for
        example GDPR, CCPA/CPRA, or CASL) for every Customer. Rights described below are offered as
        product practices and may also be required where a statute actually applies.
      </p>

      <LegalH2>2. Information we collect</LegalH2>
      <LegalH3>Account and workspace</LegalH3>
      <LegalUl>
        <li>Account information: name, email, password hash (we do not store plaintext passwords)</li>
        <li>Authentication information: magic-link / verification tokens, session data</li>
        <li>Workspace and team information: workspace name, roles, invitations, mailing address</li>
        <li>Billing identifiers and subscription status via Stripe (not full card numbers)</li>
        <li>Support messages and optional product-interest form submissions</li>
        <li>Policy-acceptance records (policy versions, timestamp, source; IP and user-agent when collected)</li>
      </LegalUl>
      <LegalH3>Customer Content</LegalH3>
      <LegalUl>
        <li>Contact-list information you upload or collect (email, name, tags, segments, custom fields, status)</li>
        <li>Campaign content, templates, sender identities, domain verification information</li>
        <li>Signup-form and subscriber submissions</li>
        <li>Uploaded images and files used in campaigns or branding</li>
      </LegalUl>
      <LegalH3>Usage, device, and security</LegalH3>
      <LegalUl>
        <li>Usage information: sends, quotas, plan enforcement, feature use</li>
        <li>Device/browser information and logs needed to operate and secure the Service</li>
        <li>Cookies described in Section 7 and on our <LegalA href={POLICY_PATHS.cookies}>Cookie disclosure</LegalA></li>
        <li>Open and click events for campaigns you send</li>
        <li>Unsubscribe, bounce, and complaint events</li>
        <li>Security and abuse signals (for example flags, holds, rate-limit metadata)</li>
      </LegalUl>

      <LegalH2>3. Sources</LegalH2>
      <LegalUl>
        <li>Users and Workspace administrators</li>
        <li>Recipients interacting with campaigns or forms</li>
        <li>Stripe</li>
        <li>Amazon SES / AWS (delivery and feedback events)</li>
        <li>Hosting and infrastructure providers</li>
        <li>Support communications</li>
        <li>Automated technical collection (logs, cookies, tracking pixels/links where enabled)</li>
      </LegalUl>

      <LegalH2>4. Purposes</LegalH2>
      <LegalUl>
        <li>Provide and operate the Service</li>
        <li>Authenticate users and manage Workspaces</li>
        <li>Deliver campaigns and process related events</li>
        <li>Process billing and enforce plan limits</li>
        <li>Provide campaign analytics (opens/clicks) to Customers</li>
        <li>Process unsubscribes and suppress bounced/complained addresses</li>
        <li>Prevent fraud and abuse; secure the platform</li>
        <li>Provide support and respond to requests</li>
        <li>Meet legal obligations and enforce Terms</li>
        <li>Improve the product using aggregated or operational signals</li>
      </LegalUl>

      <LegalH2>5. Sharing and sale</LegalH2>
      <p>
        We do <strong>not</strong> sell Customer contact lists or personal information. We do not
        share personal information for cross-context behavioral advertising. We share information
        with service providers / subprocessors as needed to run the Service, or when required by
        law, to protect rights and safety, or with your direction.
      </p>

      <LegalH2>6. Categories of service providers / subprocessors</LegalH2>
      <LegalUl>
        <li>
          <strong>Amazon Web Services / Amazon SES</strong> — email delivery and related feedback
          (typically United States regions we configure)
        </li>
        <li>
          <strong>Stripe</strong> — payments, invoices, Customer Portal, subscription state
        </li>
        <li>
          <strong>Hosting / VPS provider</strong> — application hosting
        </li>
        <li>
          <strong>PostgreSQL and Redis infrastructure</strong> — primary datastore and job/queue
          coordination
        </li>
        <li>
          <strong>Email/mailbox provider</strong> — for SendFable support mailboxes
          (support@, privacy@, legal@, abuse@, security@)
        </li>
        <li>
          <strong>Optional object storage (AWS S3)</strong> — encrypted off-host backups when
          enabled
        </li>
      </LegalUl>
      <p>
        <strong>Analytics:</strong> SendFable records first-party product funnel events when enabled
        (no advertising cookies). Optional Google Analytics 4 may be loaded when a measurement ID is
        configured by the operator; it is not required for the Service to function. We do not load
        Meta Pixel, PostHog, or Plausible by default. Campaign open/click tracking is first-party
        product functionality for Customers. Monitoring is primarily application health checks and
        operational logs.
      </p>

      <LegalH2>7. Cookies</LegalH2>
      <p>
        See the full <LegalA href={POLICY_PATHS.cookies}>Cookie disclosure</LegalA>. In short,
        SendFable uses first-party cookies that are necessary to run the Service (session / Auth.js
        cookies, CSRF protection, and a workspace-preference cookie). Optional GA4, when configured,
        may set analytics cookies from Google — enable only with an updated consent posture if your
        jurisdiction requires it. We do not set advertising cookies by default.
      </p>

      <LegalH2>8. International processing</LegalH2>
      <p>
        The Service is operated with infrastructure that may process data in the United States.
        If you access the Service from elsewhere, you understand that information may be processed
        in the U.S. and other locations where our providers operate.
      </p>

      <LegalH2>9. Retention, deletion, and backups</LegalH2>
      <LegalUl>
        <li>
          You can export contacts as CSV from the app and delete a Workspace (OWNER) from settings,
          which removes associated contacts, campaigns, templates, and related Workspace data from
          the primary database subject to technical cascading deletes.
        </li>
        <li>
          Backups (including encrypted off-host backups when enabled) age out on a fixed schedule
          and are not an interactive live copy of your Workspace.
        </li>
        <li>
          <strong>Not everything can always be deleted immediately.</strong> Suppression records
          (including platform-wide hard-bounce and complaint suppressions), billing and tax records,
          fraud/security logs, policy-acceptance records, and information we must keep for legal
          compliance may be retained as needed to protect Recipients and operate the platform.
        </li>
      </LegalUl>

      <LegalH2>10. Data deletion and privacy-request instructions</LegalH2>
      <LegalUl>
        <li>
          <strong>Export:</strong> use in-app contact export where available.
        </li>
        <li>
          <strong>Deletion:</strong> Workspace OWNER may delete the Workspace in settings, or email{" "}
          <LegalA href={`mailto:${PUBLIC_MAILBOXES.privacy}`}>{PUBLIC_MAILBOXES.privacy}</LegalA> /
          use the <LegalA href={POLICY_PATHS.contact}>contact form</LegalA> (topic: Privacy or data
          request).
        </li>
        <li>
          <strong>Access / correction:</strong> same contact routes, including for Recipients who
          received email sent through SendFable.
        </li>
        <li>
          We verify requests against the relevant account or other reasonable identity checks before
          acting, and aim to respond within 30 days (or sooner if required by applicable law).
        </li>
        <li>
          Where an applicable law provides authorized-agent or appeal rights, include that
          information in your request and we will follow the process required for that law.
        </li>
      </LegalUl>

      <LegalH2>11. Children</LegalH2>
      <p>
        The Service is not directed to children under 18, and we do not knowingly collect personal
        information from children for account registration.
      </p>

      <LegalH2>12. Security</LegalH2>
      <p>
        We use HTTPS/TLS in transit, access controls, role-based Workspace permissions, tenant
        isolation controls, backups, and operational monitoring as described on our{" "}
        <LegalA href={POLICY_PATHS.security}>Security</LegalA> page. No service can guarantee
        absolute security.
      </p>

      <LegalH2>13. State privacy rights</LegalH2>
      <p>
        Depending on your location and whether statutory thresholds apply, you may have rights to
        know, access, correct, delete, or appeal certain processing. We do not sell personal
        information. California or other state rights are described only to the extent they apply;
        contact <LegalA href={`mailto:${PUBLIC_MAILBOXES.privacy}`}>{PUBLIC_MAILBOXES.privacy}</LegalA>{" "}
        to exercise a request. We will not discriminate against you for exercising rights that
        apply.
      </p>

      <LegalH2>14. Policy updates</LegalH2>
      <p>
        We may update this Policy and will revise the dates/version above. Material changes will be
        announced by email or in-app where practical before they take effect.
      </p>

      <LegalH2>15. Contact</LegalH2>
      <p>
        Privacy questions and requests:{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.privacy}`}>{PUBLIC_MAILBOXES.privacy}</LegalA>, or
        the <LegalA href={POLICY_PATHS.contact}>contact form</LegalA> (topic: Privacy or data
        request). Operator: {LEGAL_OPERATOR_STATEMENT}.
      </p>
    </LegalDoc>
  );
}
