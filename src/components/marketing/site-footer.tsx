import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features#campaigns", label: "Email campaigns" },
      { href: "/features#audience", label: "Audience" },
      { href: "/features#builder", label: "Email builder" },
      { href: "/features#forms", label: "Forms" },
      { href: "/features#analytics", label: "Analytics" },
      { href: "/deliverability", label: "Deliverability" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/solutions/restaurants", label: "Restaurants" },
      { href: "/solutions/breweries", label: "Breweries" },
      { href: "/solutions/real-estate", label: "Real estate" },
      { href: "/solutions/retail", label: "Retail" },
      { href: "/solutions/nonprofits", label: "Nonprofits" },
      { href: "/solutions/local-events", label: "Local events" },
    ],
  },
  {
    title: "Templates",
    links: [
      { href: "/templates", label: "Template gallery" },
      { href: "/features#builder", label: "Email builder" },
    ],
  },
  {
    title: "Compare",
    links: [
      { href: "/compare/mailchimp", label: "vs Mailchimp" },
      { href: "/compare/constant-contact", label: "vs Constant Contact" },
      { href: "/compare/brevo", label: "vs Brevo" },
      { href: "/compare/mailerlite", label: "vs MailerLite" },
      { href: "/compare/kit", label: "vs Kit" },
      { href: "/compare/beehiiv", label: "vs beehiiv" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "Resources hub" },
      { href: "/email-marketing-for-small-business", label: "Email for small business" },
      { href: "/email-marketing-guide", label: "Email marketing guide" },
      { href: "/deliverability", label: "Deliverability" },
      { href: "/migrate/mailchimp", label: "Leave Mailchimp" },
      { href: "/migrate", label: "Migrate" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/security", label: "Security" },
      { href: "/status", label: "Status" },
      { href: "/integrations", label: "Integrations" },
      { href: "/contact", label: "Contact & support" },
      { href: "/login", label: "Log in" },
      { href: "/early-access", label: "Early access" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/acceptable-use", label: "Acceptable use" },
      { href: "/refund-policy", label: "Billing & refunds" },
      { href: "/contact", label: "Contact" },
      { href: "mailto:support@sendfable.com", label: "support@sendfable.com" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-parchment">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2.4fr)]">
          <div>
            <Logo variant="wordmark" className="h-7 w-auto" />
            <p className="mt-4 max-w-xs font-display text-xl leading-snug text-ink">
              Every email tells your story.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link
                href="/login"
                className="font-medium text-ink/70 underline-offset-2 hover:text-ink hover:underline"
              >
                Log in
              </Link>
              <span className="text-ink/30" aria-hidden>
                ·
              </span>
              <Link
                href="/signup"
                className="font-medium text-coral underline-offset-2 hover:underline"
              >
                Start writing free
              </Link>
            </div>
            {/* Social links intentionally omitted until official channels exist. */}
          </div>

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="text-sm font-semibold text-ink">{col.title}</div>
                <ul className="mt-3 space-y-2.5 text-sm text-ink/65">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-ink/10 bg-page">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-xs text-ink/55 sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} sendfable. All rights reserved.</p>
          <p className="font-medium text-ink/70">Every email tells your story.</p>
        </div>
      </div>
    </footer>
  );
}
