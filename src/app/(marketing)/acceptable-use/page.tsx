import {
  LEGAL_OPERATOR_STATEMENT,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";
import { LegalA, LegalDoc, LegalH2, LegalUl } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Acceptable Use & Anti-Spam Policy",
  description:
    "SendFable acceptable use and anti-spam rules: permission-based sending, prohibited lists and content, and enforcement.",
};

export default function AcceptableUsePage() {
  return (
    <LegalDoc title="Acceptable Use & Anti-Spam Policy">
      <p>
        <strong>Effective date:</strong> {POLICY_EFFECTIVE_DATE}
        <br />
        <strong>Last updated:</strong> {POLICY_LAST_UPDATED}
        <br />
        <strong>Document version:</strong> {POLICY_VERSIONS.acceptableUse}
      </p>
      <p>
        This Acceptable Use &amp; Anti-Spam Policy (&quot;AUP&quot;) is part of the SendFable{" "}
        <LegalA href={POLICY_PATHS.terms}>Terms of Service</LegalA>. {LEGAL_OPERATOR_STATEMENT}.
        SendFable is for permission-based email. Unsolicited email harms Recipients and every
        Customer on the platform, so we enforce this policy strictly.
      </p>

      <LegalH2>1. Customer requirements</LegalH2>
      <LegalUl>
        <li>Send only to Recipients with lawful permission to receive your email.</li>
        <li>Maintain consent records where applicable and provide them if we request evidence.</li>
        <li>Use accurate From, Reply-To, and subject information; identify the sender accurately.</li>
        <li>
          Include a valid physical postal mailing address in campaign footers (enforced before
          send where the product requires Workspace mailing address).
        </li>
        <li>
          Include SendFable&apos;s required unsubscribe mechanism. We add working unsubscribe links
          and, for campaigns we send, List-Unsubscribe / one-click (RFC 8058) headers where
          implemented.
        </li>
        <li>Honor opt-outs promptly; do not re-import or re-mail unsubscribed or suppressed addresses.</li>
        <li>Use lawful, nondeceptive content.</li>
        <li>Investigate unusual bounce or complaint levels and fix list hygiene problems.</li>
      </LegalUl>

      <LegalH2>2. Prohibited lists and acquisition methods</LegalH2>
      <LegalUl>
        <li>Purchased lists</li>
        <li>Rented lists</li>
        <li>Scraped or harvested addresses</li>
        <li>Address-appending services</li>
        <li>Third-party lists without provable permission</li>
        <li>Dictionary attacks or role-account blasting (for example indiscriminate admin@ / info@ spam)</li>
      </LegalUl>

      <LegalH2>3. Prohibited content and behavior</LegalH2>
      <LegalUl>
        <li>Spam, phishing, fraud, malware, or deceptive redirects</li>
        <li>Identity impersonation or misleading subject lines / headers</li>
        <li>Obscured or broken opt-out mechanisms</li>
        <li>Attempts to bypass suppression, quotas, ramps, or abuse controls</li>
        <li>Attempts to manipulate opens, clicks, or reputation metrics</li>
        <li>Illegal products or services</li>
        <li>Harassment, hate, or abusive content</li>
        <li>Intellectual-property infringement</li>
        <li>Unauthorized security testing of SendFable or other Customers</li>
        <li>Excessive resource use that degrades the Service</li>
        <li>Resale or unauthorized sublicensing of the Service</li>
      </LegalUl>

      <LegalH2>4. Bounces, complaints, and suppressions</LegalH2>
      <LegalUl>
        <li>Unsubscribe requests take effect for future sends through the Service.</li>
        <li>
          Hard bounces and spam complaints feed Workspace and platform-wide suppression so known-bad
          addresses are not re-mailed.
        </li>
        <li>
          Sustained bounce rates above approximately 5% or complaint rates above approximately 0.1%
          can automatically pause campaigns and trigger review (thresholds as implemented in
          product).
        </li>
      </LegalUl>

      <LegalH2>5. Enforcement</LegalH2>
      <p>We may take one or more of the following actions:</p>
      <LegalUl>
        <li>Import review and list-quality checks</li>
        <li>Sending ramps and quotas</li>
        <li>Throttling</li>
        <li>Campaign pause or cancellation</li>
        <li>Workspace sending hold</li>
        <li>Investigation and request for consent evidence</li>
        <li>Suspension or termination of accounts / Workspaces</li>
        <li>Reporting to providers or authorities where legally required</li>
        <li>Retention of suppression records after account closure</li>
      </LegalUl>
      <p>
        Where legally permitted, termination for serious AUP violations is not eligible for refund —
        see the <LegalA href={POLICY_PATHS.refund}>Billing &amp; Refund Policy</LegalA>.
      </p>

      <LegalH2>6. Reporting abuse</LegalH2>
      <p>
        Report unwanted email sent through SendFable to{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.abuse}`}>{PUBLIC_MAILBOXES.abuse}</LegalA> or via
        the <LegalA href={POLICY_PATHS.contact}>contact form</LegalA> (topic: Report abuse or spam).
        Include the sender address and, if possible, full email headers. Reports are reviewed with
        priority.
      </p>
    </LegalDoc>
  );
}
