/** Per-industry internal links — keeps solution pages distinct beyond swapped names. */
export const SOLUTION_RELATED_LINKS: Record<
  string,
  { href: string; label: string; note?: string }[]
> = {
  "/solutions/breweries": [
    { href: "/templates", label: "Template gallery" },
    { href: "/compare/mailchimp", label: "Compare Mailchimp pricing" },
    { href: "/email-marketing-guide", label: "Email marketing basics" },
    { href: "/pricing", label: "Plans & limits" },
  ],
  "/solutions/restaurants": [
    { href: "/mailchimp-alternative-for-restaurants", label: "Mailchimp alternative for restaurants" },
    { href: "/templates", label: "Restaurant-ready templates" },
    { href: "/deliverability", label: "Deliverability checklist" },
    { href: "/signup", label: "Start free" },
  ],
  "/solutions/retail": [
    { href: "/compare/mailerlite", label: "vs MailerLite" },
    { href: "/cheap-email-marketing", label: "Affordable email marketing" },
    { href: "/templates", label: "Retail templates" },
    { href: "/pricing", label: "See pricing" },
  ],
  "/solutions/nonprofits": [
    { href: "/mailchimp-alternative-for-nonprofits", label: "Mailchimp alternative for nonprofits" },
    { href: "/solutions/local-events", label: "Local events & fundraisers" },
    { href: "/email-marketing-for-small-business", label: "Email for small teams" },
    { href: "/pricing", label: "Free plan details" },
  ],
  "/solutions/real-estate": [
    { href: "/email-marketing-without-crm", label: "Email without a CRM suite" },
    { href: "/how-sendfable-works", label: "How SendFable works" },
    { href: "/deliverability", label: "Inbox placement basics" },
    { href: "/signup", label: "Create account" },
  ],
  "/solutions/contractors": [
    { href: "/email-marketing-for-small-business", label: "Small-business email guide" },
    { href: "/compare/brevo", label: "vs Brevo" },
    { href: "/templates", label: "Simple templates" },
    { href: "/pricing", label: "Starter at $12/mo" },
  ],
  "/solutions/salons": [
    { href: "/solutions/retail", label: "Retail & boutique email" },
    { href: "/templates", label: "Appointment-style layouts" },
    { href: "/features#forms", label: "Signup forms" },
    { href: "/signup", label: "Try free" },
  ],
  "/solutions/local-events": [
    { href: "/solutions/nonprofits", label: "Nonprofit fundraising email" },
    { href: "/templates", label: "Event announcement templates" },
    { href: "/email-marketing-guide", label: "Permission-based lists" },
    { href: "/pricing", label: "Event-season pricing" },
  ],
  "/solutions/professional-services": [
    { href: "/email-marketing-without-crm", label: "Skip the CRM bloat" },
    { href: "/compare/mailchimp", label: "vs Mailchimp" },
    { href: "/how-sendfable-works", label: "Product walkthrough" },
    { href: "/signup", label: "Start writing free" },
  ],
};
