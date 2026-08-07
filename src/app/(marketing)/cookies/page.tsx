import {
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";
import { LegalA, LegalDoc, LegalH2, LegalUl } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Cookie disclosure",
  description:
    "Cookies and similar technologies used by SendFable — first-party session, CSRF, and workspace preference cookies only.",
};

export default function CookiesPage() {
  return (
    <LegalDoc title="Cookie disclosure">
      <p>
        <strong>Effective date:</strong> {POLICY_EFFECTIVE_DATE}
        <br />
        <strong>Last updated:</strong> {POLICY_LAST_UPDATED}
        <br />
        <strong>Document version:</strong> {POLICY_VERSIONS.cookies}
      </p>
      <p>
        This page describes cookies and similar technologies used on sendfable.com. It supplements
        our <LegalA href={POLICY_PATHS.privacy}>Privacy Policy</LegalA>.
      </p>

      <LegalH2>What we use today</LegalH2>
      <p>
        SendFable uses <strong>first-party, strictly necessary</strong> cookies to operate the
        Service:
      </p>
      <LegalUl>
        <li>
          <strong>Authentication / session cookies</strong> (Auth.js / NextAuth) — keep you signed
          in securely.
        </li>
        <li>
          <strong>CSRF protection cookies</strong> — help prevent cross-site request forgery on
          authentication flows.
        </li>
        <li>
          <strong>Workspace preference cookie</strong> (<code>sf_workspace</code>) — remembers which
          Workspace you last used when you belong to more than one.
        </li>
      </LegalUl>

      <LegalH2>What we do not use by default</LegalH2>
      <LegalUl>
        <li>Advertising or retargeting cookies</li>
        <li>Meta Pixel or other social tracking pixels on the marketing site</li>
        <li>PostHog, Plausible, or similar third-party product analytics (unless separately configured)</li>
      </LegalUl>
      <p>
        Optional Google Analytics 4 may be enabled by the operator via a public measurement ID. Until
        that ID is set, we do not load GA. If GA is enabled and your jurisdiction requires consent for
        analytics cookies, update this disclosure and add a consent banner before turning it on in
        production.
      </p>
      <p>
        Necessary first-party cookies do not require a marketing cookie-consent banner. Non-essential
        cookies should only be enabled after this disclosure and consent behavior are updated.
      </p>

      <LegalH2>Campaign tracking (not a marketing-site cookie banner topic)</LegalH2>
      <p>
        When Customers send campaigns, open and click tracking may use first-party links or pixels
        as part of the email product. That tracking is controlled by the sending Customer&apos;s
        campaign and is described in the Privacy Policy under usage information.
      </p>

      <LegalH2>Managing cookies</LegalH2>
      <p>
        You can delete or block cookies in your browser. Blocking necessary cookies may prevent
        sign-in or Workspace switching from working correctly.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Questions:{" "}
        <LegalA href={`mailto:${PUBLIC_MAILBOXES.privacy}`}>{PUBLIC_MAILBOXES.privacy}</LegalA> or{" "}
        <LegalA href={POLICY_PATHS.contact}>contact form</LegalA>.
      </p>
    </LegalDoc>
  );
}
