import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Email marketing without a Gmail account",
  description:
    "Run email marketing with any work email on Sendfable — no Google login required. Send from Gmail addresses via From-rewrite, or authenticate your own domain.",
};

const FAQS = [
  {
    q: "Can I still send to customers who use Gmail?",
    a: "Yes. “Without Gmail” means you do not need a Google account to use Sendfable. Recipients can use any mailbox.",
  },
  {
    q: "What if my From address is @gmail.com?",
    a: "You can verify it. Because Gmail publishes strict DMARC, Sendfable sends from an authenticated platform address with your display name and sets Reply-To to your Gmail so replies reach you.",
  },
  {
    q: "Do you support Microsoft login only?",
    a: "No OAuth requirement either way. Email + password or magic link is enough.",
  },
];

export default function EmailMarketingWithoutGmailPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          {
            label: "Email marketing without Gmail",
            href: "/email-marketing-without-gmail",
            current: true,
          },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">
        Email marketing without a Gmail account
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Many tools push “Sign in with Google.” Sendfable does not. Use a work address, a custom
        domain, or another mailbox — your choice.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Sign up with any email</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/features">See features</Link>
        </Button>
      </div>

      <section className="mt-12 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Why teams care</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Company policy blocks personal Google accounts for business tools</li>
          <li>You already authenticate on a custom domain and want mail aligned to it</li>
          <li>You prefer password or magic-link auth over OAuth sprawl</li>
        </ul>
      </section>

      <section className="mt-12 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Sending options</h2>
        <p>
          <strong>Any verified From</strong> — confirm the address, then send through Sendfable&apos;s
          SES pipeline.
        </p>
        <p>
          <strong>Strict-DMARC consumer mailboxes</strong> — platform From-rewrite keeps
          authentication honest; Reply-To preserves the conversation. Explained on{" "}
          <Link href="/deliverability" className="text-teal hover:underline">
            deliverability
          </Link>
          .
        </p>
        <p>
          <strong>Custom domain (Growth+)</strong> — add DKIM CNAMEs and send aligned as
          you@yourdomain.com.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta />
    </div>
  );
}
