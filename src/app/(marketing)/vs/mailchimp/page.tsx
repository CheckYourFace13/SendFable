import { PLANS } from "@/lib/plans";

export const metadata = { title: "Sendfable vs Mailchimp" };

const ROWS = [
  ["Any email signup (no Google/Microsoft OAuth)", "Yes", "Yes (with OAuth options pushed)"],
  ["Own ESP infrastructure (SES)", "Yes — platform SES", "Mailchimp delivers"],
  ["From-rewrite for Gmail/Yahoo DMARC", "Yes, automatic", "Typically requires custom domain"],
  ["Free plan emails/mo", String(PLANS.FREE.emailsPerMonth), "Limited / promotional"],
  ["Starter ~2.5k contacts", `$${PLANS.STARTER.monthlyPrice}/mo`, "~$45/mo (Standard est.)"],
  ["Growth ~10k contacts", `$${PLANS.GROWTH.monthlyPrice}/mo`, "~$105/mo (Standard est.)"],
  ["Drag-and-drop builder", "Yes", "Yes"],
  ["One-click unsubscribe (RFC 8058)", "Yes", "Yes"],
  ["Auto-pause on high bounce/complaint", "Yes", "Account monitoring"],
  ["Purchased lists allowed", "Never", "Prohibited"],
];

export default function VsMailchimpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Sendfable vs Mailchimp</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        An honest comparison. Mailchimp is a mature platform with a huge ecosystem. Sendfable focuses
        on lower cost, clear deliverability for personal domains and public mailboxes, and signup
        with any email address.
      </p>

      <div className="mt-10 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Capability</th>
              <th className="px-4 py-3 font-semibold text-indigo-700">Sendfable</th>
              <th className="px-4 py-3 font-semibold">Mailchimp</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([cap, sf, mc]) => (
              <tr key={cap} className="border-b last:border-0">
                <td className="px-4 py-3">{cap}</td>
                <td className="px-4 py-3">{sf}</td>
                <td className="px-4 py-3 text-muted-foreground">{mc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Mailchimp prices as of 2026 estimates for Standard plan by contact tier — verify on
        mailchimp.com. Features change over time.
      </p>
    </div>
  );
}
