import {
  LEGAL_OPERATOR_NAME,
  LEGAL_OPERATOR_STATEMENT,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";
import { LegalA, LegalDoc, LegalH2, LegalH3, LegalUl } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Terms of Service",
  description:
    "SendFable Terms of Service: accounts, workspaces, acceptable use, billing, provider dependencies, and liability limits.",
};

/*
 * NOTE (internal): technically tailored to the current product; not reviewed or
 * approved by counsel. See docs/LEGAL_STATUS.md.
 */
export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service">
      <p>
        <strong>Effective date:</strong> {POLICY_EFFECTIVE_DATE}
        <br />
        <strong>Last updated:</strong> {POLICY_LAST_UPDATED}
        <br />
        <strong>Document version:</strong> {POLICY_VERSIONS.terms}
      </p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern access to and use of the SendFable
        email marketing platform and related websites, applications, and services (the
        &quot;Service&quot;). {LEGAL_OPERATOR_STATEMENT} (&quot;Operator,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;). &quot;SendFable&quot; is the product name for the
        Service. As of the Effective Date, we have not verified a separate registered DBA or
        assumed-name filing for &quot;SendFable.&quot;
      </p>
      <p>
        By creating an account, clicking to agree, or using the Service, you agree to these
        Terms and to the{" "}
        <LegalA href={POLICY_PATHS.acceptableUse}>Acceptable Use &amp; Anti-Spam Policy</LegalA>,{" "}
        <LegalA href={POLICY_PATHS.refund}>Billing, Renewal, Cancellation &amp; Refund Policy</LegalA>
        , and <LegalA href={POLICY_PATHS.privacy}>Privacy Policy</LegalA>, which are incorporated
        by reference.
      </p>

      <LegalH2>1. Defined terms</LegalH2>
      <LegalUl>
        <li>
          <strong>Customer</strong>, <strong>you</strong>, or <strong>your</strong> means the
          individual or entity that registers for or uses the Service.
        </li>
        <li>
          <strong>Workspace</strong> means a SendFable workspace that holds audience data,
          campaigns, templates, settings, and related content.
        </li>
        <li>
          <strong>Authorized User</strong> means a person invited into a Workspace with a role
          (OWNER, ADMIN, or MEMBER).
        </li>
        <li>
          <strong>Customer Content</strong> means contacts, custom fields, tags, segments, forms,
          templates, campaign content, sender identities, uploaded files, mailing addresses, and
          other materials you or your Authorized Users submit to the Service.
        </li>
        <li>
          <strong>Recipients</strong> means people on your lists or who interact with your
          campaigns or forms.
        </li>
      </LegalUl>

      <LegalH2>2. Eligibility and authority</LegalH2>
      <p>
        You must be at least 18 years old and able to form a binding contract. If you use the
        Service on behalf of a business or organization, you represent that you have authority to
        bind that entity to these Terms. The Service is intended for business and organizational
        email marketing, not for children.
      </p>

      <LegalH2>3. Accounts, authentication, and security</LegalH2>
      <p>
        Accounts may be created with email and password. Sign-in also supports a passwordless
        magic-link emailed to the claimed address. We do not require Google or Microsoft OAuth.
        You must provide accurate account information and keep credentials and inbox access secure.
        You are responsible for activity under your account and for Authorized Users you invite.
        Notify us promptly at <LegalA href={`mailto:${PUBLIC_MAILBOXES.support}`}>{PUBLIC_MAILBOXES.support}</LegalA>{" "}
        of suspected unauthorized access.
      </p>
      <p>
        During early launch, public signup may be closed and access may be invitation- or
        waitlist-based. Early-access wording on the website remains in effect until we remove it.
      </p>

      <LegalH2>4. Workspaces, roles, and ownership</LegalH2>
      <p>
        Workspaces organize Customer Content. Typical roles (where enabled by plan seat limits):
      </p>
      <LegalUl>
        <li>
          <strong>OWNER</strong> — full workspace management, billing controls, team controls, and
          workspace deletion.
        </li>
        <li>
          <strong>ADMIN</strong> — operational workspace management. Billing access follows
          documented product policy and may be gated by launch flags. Ownership transfer is not a
          self-serve feature unless we later enable it.
        </li>
        <li>
          <strong>MEMBER</strong> — day-to-day audience and campaign work. No billing, team
          administration, ownership changes, or destructive workspace deletion.
        </li>
      </LegalUl>
      <p>
        The Customer is responsible for Authorized Users&apos; compliance with these Terms. Team
        seat limits are configured in product (Free/Starter/Growth: 1 seat; Pro: up to 5; Pro Plus:
        up to 10). Multi-user invites may be limited during early launch and are not advertised on
        public pricing until production-ready.
      </p>

      <LegalH2>5. Customer Content and license</LegalH2>
      <p>
        You retain ownership of Customer Content. You grant us a limited, worldwide, non-exclusive
        license to host, process, transmit, display, and otherwise use Customer Content solely as
        needed to provide, secure, support, and improve the Service (including delivery through
        Amazon SES and related infrastructure), and to enforce these Terms. Feedback you provide may
        be used freely to improve the Service without obligation to you.
      </p>

      <LegalH2>6. Acceptable use and anti-spam</LegalH2>
      <p>
        You must comply with the{" "}
        <LegalA href={POLICY_PATHS.acceptableUse}>Acceptable Use &amp; Anti-Spam Policy</LegalA>.
        In summary: permission-based sending only; no purchased, rented, scraped, harvested,
        appended, or unauthorized third-party lists; accurate sender identity and subjects; valid
        physical postal address in campaign footers; working unsubscribe (including one-click /
        List-Unsubscribe where we implement it); honor opt-outs; do not bypass suppressions; and do
        not send illegal, deceptive, phishing, malware, or other prohibited content. You are
        responsible for lawful Recipient permission and for maintaining consent records where
        applicable.
      </p>

      <LegalH2>7. Email features, tracking, and compliance controls</LegalH2>
      <p>Depending on plan and launch flags, the Service may include:</p>
      <LegalUl>
        <li>Contacts, tags, segments, custom fields, CSV import/export, and signup forms</li>
        <li>Sender identities and domain authentication workflows tied to Amazon SES</li>
        <li>Templates and an email builder</li>
        <li>Campaign drafting, scheduling, queueing, pausing, cancellation, and sending</li>
        <li>Open and click tracking for campaign analytics</li>
        <li>Unsubscribe processing, bounce and complaint handling, and suppression lists</li>
        <li>Quotas, sending ramps, auto-pause thresholds, and workspace sending holds</li>
      </LegalUl>
      <p>
        <strong>Early-launch / provider gates.</strong> Campaign sending, public billing checkout,
        public signup, and SES-controlled tests may be disabled by configuration flags even when the
        UI exists. Amazon SES production access and other provider approvals may further limit
        delivery. We do not guarantee inbox placement, open rates, click rates, deliverability,
        uptime, or revenue outcomes.
      </p>

      <LegalH2>8. Monitoring, abuse, suspension, and termination</LegalH2>
      <p>
        We may monitor for abuse and reputation risk, request consent evidence, throttle or pause
        campaigns, place sending holds, suspend Workspaces or accounts, or terminate access for
        Terms or Acceptable Use violations, payment risk, legal requirements, or harm to the
        platform or Recipients. Where practical we will warn first; severe abuse may be addressed
        without prior notice. We may retain suppression and security records as described in the
        Privacy Policy. You may stop using the Service and (as OWNER) delete a Workspace from
        settings, subject to retention rules.
      </p>

      <LegalH2>9. Plans, usage, and billing</LegalH2>
      <p>
        Plan limits (contacts, monthly emails, seats, custom domains) are shown on the pricing page
        and enforced in product. Usage is measured from Service records (for example sends and
        stored contacts). Paid subscriptions are billed through Stripe on monthly or annual cycles
        and renew automatically until canceled. Taxes may apply. Upgrades, proration, downgrades,
        cancellation (typically cancel-at-period-end via the Stripe Customer Portal), failed
        payments, and refunds are governed by the{" "}
        <LegalA href={POLICY_PATHS.refund}>Billing, Renewal, Cancellation &amp; Refund Policy</LegalA>
        . Public Stripe Checkout may be temporarily disabled during early launch while owner testing
        remains gated.
      </p>

      <LegalH2>10. Third-party services and provider dependency</LegalH2>
      <p>
        The Service depends on third parties, including Amazon Web Services / Amazon SES (email
        delivery), Stripe (payments and Customer Portal), hosting infrastructure (application,
        PostgreSQL, Redis), and mailbox providers for support addresses. Their outages, policy
        enforcement, or account status can affect the Service. Payment-card details are handled by
        Stripe; we do not store full card numbers.
      </p>

      <LegalH2>11. Intellectual property</LegalH2>
      <p>
        SendFable software, design, documentation, and branding are owned by the Operator or its
        licensors. Built-in templates may be used in campaigns you send through SendFable but may
        not be resold as standalone templates. You may not reverse engineer, scrape, or abuse the
        Service except as allowed by law.
      </p>

      <LegalH2>12. Privacy and confidentiality</LegalH2>
      <p>
        Our <LegalA href={POLICY_PATHS.privacy}>Privacy Policy</LegalA> explains how we process
        personal information. You must not disclose non-public Service credentials or another
        customer&apos;s data obtained through misuse. We treat Customer Content as confidential
        except as needed to operate the Service, comply with law, or as you direct.
      </p>

      <LegalH2>13. Security limitations</LegalH2>
      <p>
        We implement reasonable administrative, technical, and organizational safeguards described
        on our <LegalA href={POLICY_PATHS.security}>Security</LegalA> page. No method of
        transmission or storage is perfectly secure. You are responsible for configuring access
        carefully and for the security of your own systems and Recipient data practices.
      </p>

      <LegalH2>14. Service and feature changes; early launch</LegalH2>
      <p>
        We may change, add, or discontinue features with reasonable notice where practical.
        Beta/early-launch restrictions, waitlists, and feature flags may limit availability. Early
        access does not create a promise of uninterrupted public availability or of any specific
        future roadmap item.
      </p>

      <LegalH2>15. Disclaimers</LegalH2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM
        EXTENT PERMITTED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT, AND ANY WARRANTY THAT EMAILS WILL BE DELIVERED,
        OPENED, OR PLACED IN THE INBOX.
      </p>

      <LegalH2>16. Indemnification</LegalH2>
      <p>
        You will defend and indemnify the Operator and its personnel against claims, damages, and
        expenses (including reasonable attorneys&apos; fees) arising from Customer Content, your
        campaigns, your Recipient practices, your violation of law or these Terms, or disputes with
        Recipients or Authorized Users.
      </p>

      <LegalH2>17. Limitation of liability</LegalH2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE,
        GOODWILL, OR DATA, EVEN IF ADVISED OF THE POSSIBILITY. OUR TOTAL LIABILITY FOR ANY CLAIM
        RELATING TO THE SERVICE IS LIMITED TO THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE
        TWELVE (12) MONTHS BEFORE THE CLAIM. NOTHING IN THESE TERMS LIMITS LIABILITY THAT CANNOT
        BE LIMITED UNDER APPLICABLE LAW.
      </p>

      <LegalH2>18. Governing law and disputes</LegalH2>
      <p>
        <strong>Governing-law state not yet verified:</strong> we have not verified from reliable
        formation or registration records that {LEGAL_OPERATOR_NAME} is organized, incorporated, or
        registered in a specific U.S. state for use as governing law in these Terms (including
        Illinois). Until that confirmation is recorded and these Terms are updated, disputes will be
        handled in a court of competent jurisdiction in the United States, and U.S. federal law (and
        applicable state law as determined by that court) will apply to the extent necessary.{" "}
        <em>
          We intentionally do not include mandatory arbitration or a class-action waiver in these
          Terms.
        </em>
      </p>

      <LegalH2>19. Force majeure</LegalH2>
      <p>
        We are not liable for delays or failures caused by events beyond reasonable control,
        including provider outages, internet failures, labor disputes, natural disasters, war, or
        government actions.
      </p>

      <LegalH2>20. Assignment, severability, waiver, entire agreement</LegalH2>
      <p>
        You may not assign these Terms without our consent; we may assign them in connection with a
        merger, acquisition, or sale of assets. If a provision is unenforceable, the remainder
        stays in effect. Failure to enforce a provision is not a waiver. These Terms and the
        incorporated policies are the entire agreement regarding the Service and supersede prior
        proposals on the same subject.
      </p>

      <LegalH2>21. Changes to Terms</LegalH2>
      <p>
        We may update these Terms. For material changes we will give notice by email or in-app
        before the changes take effect where practical. Continued use after the effective date
        constitutes acceptance. We may also ask you to re-accept a policy bundle in-product.
      </p>

      <LegalH2>22. Electronic notices</LegalH2>
      <p>
        You agree to receive electronic notices at your account email or in-product. Legal notices
        to us should be sent to{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.legal}`}>{PUBLIC_MAILBOXES.legal}</LegalA> and may
        also be submitted via the <LegalA href={POLICY_PATHS.contact}>contact form</LegalA> (topic:
        Legal).
      </p>

      <LegalH2>23. Contact</LegalH2>
      <LegalUl>
        <li>
          Support:{" "}
          <LegalA href={`mailto:${PUBLIC_MAILBOXES.support}`}>{PUBLIC_MAILBOXES.support}</LegalA>
        </li>
        <li>
          Legal: <LegalA href={`mailto:${PUBLIC_MAILBOXES.legal}`}>{PUBLIC_MAILBOXES.legal}</LegalA>
        </li>
        <li>
          Privacy:{" "}
          <LegalA href={`mailto:${PUBLIC_MAILBOXES.privacy}`}>{PUBLIC_MAILBOXES.privacy}</LegalA>
        </li>
        <li>
          Abuse: <LegalA href={`mailto:${PUBLIC_MAILBOXES.abuse}`}>{PUBLIC_MAILBOXES.abuse}</LegalA>
        </li>
        <li>
          Security:{" "}
          <LegalA href={`mailto:${PUBLIC_MAILBOXES.security}`}>{PUBLIC_MAILBOXES.security}</LegalA>
        </li>
      </LegalUl>

      <LegalH3>Operator identity (legal documents only)</LegalH3>
      <p>
        {LEGAL_OPERATOR_STATEMENT}. Mentions of the legal entity are limited to appropriate legal,
        billing, and contractual contexts and are not used as ordinary marketing branding.
      </p>
    </LegalDoc>
  );
}
