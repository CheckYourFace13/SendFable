export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
      <p>Last updated: July 18, 2026</p>

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
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Account termination</h2>
      <p>
        We may suspend or terminate accounts that harm platform deliverability, abuse the service,
        or violate these terms. We may retain suppression data as needed to protect recipients.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Service</h2>
      <p>
        Sendfable provides the platform &quot;as is.&quot; We strive for high availability but do
        not guarantee uninterrupted delivery. Email delivery depends on recipient providers.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Billing</h2>
      <p>
        Paid plans renew monthly or annually via Stripe until canceled. Downgrades to Free do not
        delete your data; sending may become read-only if you exceed Free contact caps until you
        prune or re-upgrade.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Contact</h2>
      <p>Questions: legal@sendfable.com</p>
    </div>
  );
}
