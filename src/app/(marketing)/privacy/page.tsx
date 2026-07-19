export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
      <p>Last updated: July 18, 2026</p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">What we collect</h2>
      <ul>
        <li>Account data: email, name, password hash (or magic-link tokens), billing identifiers</li>
        <li>Workspace data: contacts, campaigns, templates, and settings you upload</li>
        <li>Usage data: send counts, opens, clicks, bounces, complaints for analytics and abuse prevention</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">How we use data</h2>
      <p>
        We process data to provide the service, deliver email via Amazon SES, prevent abuse, and
        bill subscriptions via Stripe. We do not sell your contacts.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Subprocessors</h2>
      <ul>
        <li>Amazon Web Services (SES, optional S3)</li>
        <li>Stripe (payments)</li>
        <li>Hosting provider for application/database/redis</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Retention</h2>
      <p>
        You can delete your workspace at any time. Global suppression entries (hard bounces and
        complaints) may be retained to protect recipients across the platform.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Contact</h2>
      <p>privacy@sendfable.com</p>
    </div>
  );
}
