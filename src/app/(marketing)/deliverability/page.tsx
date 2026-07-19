export const metadata = {
  title: "Deliverability",
  description:
    "How Sendfable approaches SPF, DKIM, DMARC, Gmail From-rewrite, custom domains, and list-quality protections.",
};

export default function DeliverabilityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Deliverability, explained simply</h1>
      <p>
        Inbox placement isn&apos;t magic — it&apos;s authentication, reputation, and list quality.
        Here&apos;s how Sendfable approaches each.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">SPF, DKIM, and DMARC</h2>
      <ul>
        <li>
          <strong>SPF</strong> says which servers may send mail for a domain.
        </li>
        <li>
          <strong>DKIM</strong> cryptographically signs each message so receivers can verify it
          wasn&apos;t altered.
        </li>
        <li>
          <strong>DMARC</strong> tells receivers what to do when SPF/DKIM fail — and Gmail, Yahoo,
          and others now publish strict policies (<code>p=reject</code>).
        </li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Why we rewrite Gmail From addresses</h2>
      <p>
        If you verify <code>you@gmail.com</code> as a sender, we cannot honestly send mail that
        passes Gmail&apos;s DMARC when the message originates from Sendfable&apos;s servers. So we
        send as <code>you@send.sendfable.com</code> (our authenticated platform domain), keep your
        display name, and set <strong>Reply-To</strong> to your real address. Replies still reach
        you; the message stays out of spam.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Custom domains (Growth+)</h2>
      <p>
        Prefer full brand alignment? Authenticate your own domain with three DKIM CNAME records.
        Once verified, any From address at that domain sends with proper alignment — no rewrite
        needed.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">List quality & auto-protection</h2>
      <p>
        We never allow purchased lists. Campaigns that exceed 5% bounce or 0.1% complaint rates are
        auto-paused, and the account is flagged. Clean lists beat clever copy every time.
      </p>
    </div>
  );
}
