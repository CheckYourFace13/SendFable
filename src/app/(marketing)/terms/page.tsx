export const metadata = {
  title: "Terms of Service",
  description:
    "Sendfable terms of service covering acceptable use, billing, account responsibilities, and limitations of liability.",
};

/*
 * NOTE (internal): drafted technically; requires qualified legal review before
 * public launch promotion. See docs/LEGAL_STATUS.md.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
      <p>Last updated: July 24, 2026</p>
      <p>
        These terms govern your use of Sendfable, an email marketing platform operated by iScream
        Studio (&quot;Sendfable&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or
        using the service you agree to these terms, the{" "}
        <a className="underline" href="/acceptable-use">
          Acceptable Use &amp; Anti-Spam Policy
        </a>
        , the{" "}
        <a className="underline" href="/refund-policy">
          Billing &amp; Refund Policy
        </a>
        , and the{" "}
        <a className="underline" href="/privacy">
          Privacy Policy
        </a>
        , which are part of these terms.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Eligibility</h2>
      <p>
        You must be at least 18 years old and using Sendfable on behalf of a business or
        organization. You are responsible for activity under your account and for keeping your
        sign-in email secure.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Acceptable use — anti-spam</h2>
      <p>
        Sendfable is for permission-based email marketing only. You agree that every contact you
        import or collect has given affirmative consent to receive email from you.
      </p>
      <ul>
        <li>
          <strong>No purchased, rented, scraped, or appended lists.</strong> Violation is grounds
          for immediate termination without refund.
        </li>
        <li>
          You must include a valid physical mailing address in campaign footers (we enforce this
          before first send).
        </li>
        <li>
          You must honor unsubscribe requests promptly. We implement one-click unsubscribe (RFC
          8058) and suppress unsubscribed addresses.
        </li>
        <li>
          Sustained bounce rates above 5% or complaint rates above 0.1% may result in automatic
          campaign pause, account review, or termination.
        </li>
        <li>
          The full policy, including prohibited content and abuse reporting, is at{" "}
          <a className="underline" href="/acceptable-use">
            /acceptable-use
          </a>
          .
        </li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">
        Account suspension and termination
      </h2>
      <p>
        We may throttle, suspend, or terminate accounts that harm platform deliverability, abuse
        the service, or violate these terms. Where practical we&apos;ll warn you first; severe
        abuse (spam, phishing, illegal content) may be suspended without notice. We may retain
        suppression data as needed to protect recipients. You may stop using the service and delete
        your workspace at any time.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Service</h2>
      <p>
        Sendfable provides the platform &quot;as is&quot; and &quot;as available.&quot; We strive
        for high availability but do not guarantee uninterrupted service, email delivery, or inbox
        placement — delivery ultimately depends on recipient mail providers. We may change or
        discontinue features with reasonable notice where practical.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Billing</h2>
      <p>
        Paid plans renew monthly or annually via Stripe until canceled. Upgrades prorate; downgrades
        to Free do not delete your data, though sending may become read-only if you exceed Free
        contact caps until you prune or re-upgrade. Full billing, renewal, cancellation, failed
        payment, and refund terms are in the{" "}
        <a className="underline" href="/refund-policy">
          Billing &amp; Refund Policy
        </a>
        .
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Your content and data</h2>
      <p>
        You retain ownership of your contact lists, templates, and campaign content. You grant us
        the limited rights needed to store and send it on your behalf. You are responsible for
        having lawful consent for the data you upload. You can export your contacts and delete your
        workspace at any time; see the{" "}
        <a className="underline" href="/privacy">
          Privacy Policy
        </a>{" "}
        for retention details.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Intellectual property</h2>
      <p>
        Sendfable, its software, design, and branding remain our property. Built-in templates may be
        used in campaigns you send through Sendfable but may not be resold as templates.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Sendfable is not liable for indirect, incidental,
        special, or consequential damages, or for lost profits, revenue, or data. Our total
        liability for any claim is limited to the amounts you paid us in the twelve months before
        the claim. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Changes to these terms</h2>
      <p>
        We may update these terms as the service evolves. For material changes we will give notice
        by email or in-app before the changes take effect. Continued use after the effective date
        constitutes acceptance.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Contact</h2>
      <p>
        Legal questions: use the{" "}
        <a className="underline" href="/contact">
          contact form
        </a>{" "}
        (topic: &quot;Legal&quot;).
      </p>
    </div>
  );
}
