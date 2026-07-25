export const metadata = {
  title: "Privacy Policy",
  description:
    "Sendfable privacy policy: what we collect, how we use workspace and send data, cookies, retention, and how to request export or deletion.",
};

/*
 * NOTE (internal): drafted technically; requires qualified legal review before
 * public launch promotion. See docs/LEGAL_STATUS.md.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
      <p>Last updated: July 24, 2026</p>
      <p>
        Sendfable is operated by iScream Studio. This policy explains what we collect, how we use
        it, and the choices you have.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">What we collect</h2>
      <ul>
        <li>Account data: email, name, password hash (or magic-link tokens), billing identifiers</li>
        <li>Workspace data: contacts, campaigns, templates, and settings you upload</li>
        <li>Usage data: send counts, opens, clicks, bounces, complaints for analytics and abuse prevention</li>
        <li>Support messages you send us through the contact form</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">How we use data</h2>
      <p>
        We process data to provide the service, deliver email via Amazon SES, prevent abuse, and
        bill subscriptions via Stripe. We do not sell your contacts, and we do not use your contact
        lists for our own marketing.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Cookies</h2>
      <p>
        Sendfable uses only first-party cookies that are strictly necessary to run the service:
        session/sign-in cookies and a CSRF protection cookie. We do not set advertising or
        third-party analytics cookies, so no cookie-consent banner is currently required. If that
        changes, this policy and the site behavior will be updated first.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">
        Recipient data (if you received an email sent with Sendfable)
      </h2>
      <p>
        Our customers are responsible for having your consent. Every marketing email sent through
        Sendfable includes an unsubscribe link that takes effect immediately. Hard bounces and spam
        complaints are suppressed automatically. To complain about a sender or request removal,
        use the{" "}
        <a className="underline" href="/contact">
          contact form
        </a>{" "}
        (topic: &quot;Report abuse or spam&quot;).
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Subprocessors</h2>
      <ul>
        <li>Amazon Web Services (SES email delivery, optional S3 storage) — United States</li>
        <li>Stripe (payments) — we never store full card numbers</li>
        <li>Hosting provider for the application, database, and Redis</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Retention</h2>
      <p>
        You can delete your workspace at any time, which removes your contacts, campaigns, and
        templates. Backups age out on a fixed schedule afterwards. Global suppression entries (hard
        bounces and complaints) and records we need for billing, security, or legal compliance may
        be retained after deletion to protect recipients across the platform.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">
        Export, deletion, and privacy requests
      </h2>
      <ul>
        <li>
          <strong>Export:</strong> you can export your contacts as CSV from the app at any time.
        </li>
        <li>
          <strong>Deletion:</strong> delete your workspace from settings, or email{" "}
          <a className="underline" href="mailto:privacy@sendfable.com">
            privacy@sendfable.com
          </a>{" "}
          / use the{" "}
          <a className="underline" href="/contact">
            contact form
          </a>{" "}
          (topic: &quot;Privacy or data request&quot;). We verify requests against the account email
          before acting and respond within 30 days.
        </li>
        <li>
          <strong>Access/correction:</strong> the same contact route works for access and
          correction requests, including requests from email recipients.
        </li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Security</h2>
      <p>
        Data is encrypted in transit (HTTPS/TLS), access to production systems is restricted, and
        payment details are handled by Stripe. No internet service can guarantee perfect security;
        see our{" "}
        <a className="underline" href="/security">
          security page
        </a>{" "}
        for current practices and how to report a vulnerability.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Changes</h2>
      <p>
        We will update this policy as the service evolves and note the new date above. Material
        changes are announced by email or in-app before they take effect.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Contact</h2>
      <p>
        Privacy questions and requests:{" "}
        <a className="underline" href="mailto:privacy@sendfable.com">
          privacy@sendfable.com
        </a>
        , or use the{" "}
        <a className="underline" href="/contact">
          contact form
        </a>{" "}
        (topic: &quot;Privacy or data request&quot;).
      </p>
    </div>
  );
}
