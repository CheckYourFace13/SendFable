export const metadata = {
  title: "Billing, Renewal, Cancellation & Refund Policy",
  description:
    "How Sendfable subscriptions bill and renew, how to cancel, what happens on downgrade or failed payment, and when refunds apply.",
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">
        Billing, Renewal, Cancellation &amp; Refund Policy
      </h1>
      <p>Last updated: July 24, 2026</p>
      <p>
        This policy is part of the Sendfable{" "}
        <a className="underline" href="/terms">
          Terms of Service
        </a>
        . Payments are processed by Stripe; Sendfable never stores your card number.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Plans and billing</h2>
      <ul>
        <li>Paid plans are billed in advance, monthly or annually, in USD.</li>
        <li>
          Subscriptions <strong>renew automatically</strong> at the end of each billing period
          until canceled.
        </li>
        <li>The Free plan has no charge and no renewal; its limits are shown on the pricing page.</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Upgrades and downgrades</h2>
      <ul>
        <li>
          Upgrades take effect immediately. Stripe prorates the difference for the remainder of the
          current period.
        </li>
        <li>
          Downgrades take effect according to the option you choose in the billing portal; plan
          limits of the lower tier then apply. Downgrading does not delete your data, but features
          may become read-only if you exceed the lower tier&apos;s caps until you prune contacts or
          re-upgrade.
        </li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Cancellation</h2>
      <ul>
        <li>
          You can cancel anytime from Settings → Billing (Stripe customer portal). Cancellation
          stops the <em>next</em> renewal; your paid features remain active until the end of the
          period you already paid for.
        </li>
        <li>Cancellation by itself is not a refund — see below for when refunds apply.</li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Failed payments</h2>
      <p>
        If a renewal payment fails, Stripe retries it automatically and emails you. If payment
        continues to fail, the subscription is marked past due and may be canceled, moving the
        workspace to Free-plan limits. Sending can be paused while an account is past due.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Refunds</h2>
      <ul>
        <li>
          <strong>First paid charge:</strong> if Sendfable isn&apos;t right for you, contact us
          within 14 days of your first paid charge and we&apos;ll refund it in full.
        </li>
        <li>
          <strong>Renewals:</strong> renewal charges are generally non-refundable, but if you
          contact us within 7 days of an unwanted renewal and haven&apos;t sent campaigns in the new
          period, we&apos;ll issue a refund as a courtesy.
        </li>
        <li>
          <strong>Duplicate or erroneous charges</strong> are always refunded in full.
        </li>
        <li>
          <strong>Not refundable:</strong> partial periods after cancellation, accounts terminated
          for violating the{" "}
          <a className="underline" href="/acceptable-use">
            Acceptable Use Policy
          </a>{" "}
          (including purchased-list use), and periods already consumed with normal sending
          activity.
        </li>
        <li>
          Approved refunds are returned to the original payment method. Stripe typically posts
          refunds to cards within 5–10 business days depending on the card issuer.
        </li>
      </ul>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Data after cancellation</h2>
      <p>
        Canceling a paid plan does not delete your workspace. You can export contacts at any time
        and delete your workspace from settings. Global suppression records (hard bounces and
        complaints) may be retained to protect recipients across the platform.
      </p>

      <h2 className="pt-4 text-2xl font-semibold text-slate-900">Questions</h2>
      <p>
        Contact us about any charge at{" "}
        <a className="underline" href="mailto:support@sendfable.com">
          support@sendfable.com
        </a>{" "}
        or via the{" "}
        <a className="underline" href="/contact">
          contact form
        </a>{" "}
        (topic: &quot;Billing or refunds&quot;). Include the workspace name and approximate charge
        date — never send full card numbers.
      </p>
    </div>
  );
}
