import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import {
  JsonLd,
  articleJsonLd,
} from "@/components/marketing/json-ld";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Email marketing guide for small businesses",
  description:
    "A practical Sendfable guide to building a consented list, authenticating mail, writing campaigns, and reading results without hype.",
};

const TOC = [
  { id: "permission", label: "1. Permission before volume" },
  { id: "list", label: "2. Building a clean list" },
  { id: "auth", label: "3. Authentication basics" },
  { id: "campaigns", label: "4. Campaign structure" },
  { id: "measure", label: "5. What to measure" },
  { id: "tools", label: "6. Choosing tools" },
];

export default function EmailMarketingGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 text-slate-700 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: "Email marketing guide for small businesses",
          description:
            "A practical guide to lists, authentication, campaigns, and measurement.",
          path: "/email-marketing-guide",
          datePublished: "2026-07-18",
        })}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Guide", href: "/email-marketing-guide", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">
        Email marketing guide
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        A straightforward playbook for operators who want email that people asked for — not
        growth hacks that burn domains. Written for Sendfable users, useful on any ESP.
      </p>

      <nav className="mt-10 rounded-2xl border bg-slate-50/80 p-6" aria-label="Table of contents">
        <div className="text-sm font-semibold text-slate-900">On this page</div>
        <ol className="mt-3 space-y-2 text-sm">
          {TOC.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="text-ink hover:underline">
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="permission" className="mt-14 scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">1. Permission before volume</h2>
        <p>
          Email works when recipients recognize you and can leave easily. Collect addresses through
          your site, checkout, events, or in-person signups — and say what you will send. Purchased
          or scraped lists are a fast path to bounces, spam complaints, and blocked sending.
        </p>
        <p>
          Double opt-in is not required everywhere, but it helps when signup quality is uneven.
          Sendfable hosted forms support confirmation flows when you want that extra step.
        </p>
      </section>

      <section id="list" className="mt-12 scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">2. Building a clean list</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Store source and signup date when you can — useful for segments later.</li>
          <li>Use tags for interests (events, wholesale, VIP) instead of exploding into dozens of lists.</li>
          <li>Remove hard bounces promptly; respect unsubscribes without guilt trips.</li>
          <li>When migrating, import only consented contacts — see our{" "}
            <Link href="/migrate" className="text-teal hover:underline">
              migration guide
            </Link>
            .
          </li>
        </ul>
      </section>

      <section id="auth" className="mt-12 scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">3. Authentication basics</h2>
        <p>
          Inbox providers look at SPF, DKIM, and DMARC to decide whether mail is legitimately from
          your domain. If you send from a personal Gmail or Yahoo address, strict DMARC often forces
          a platform From-rewrite so authentication can pass — replies still go to you via Reply-To.
          Prefer a custom domain on Growth+ when brand alignment matters. Details live on our{" "}
          <Link href="/deliverability" className="text-teal hover:underline">
            deliverability page
          </Link>
          .
        </p>
      </section>

      <section id="campaigns" className="mt-12 scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">4. Campaign structure that works</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Subject</strong> — specific and honest; avoid spammy ALL CAPS and fake “Re:”
          </li>
          <li>
            <strong>Opening line</strong> — state the point in the first sentence
          </li>
          <li>
            <strong>One primary CTA</strong> — button or link with a clear next step
          </li>
          <li>
            <strong>Footer</strong> — physical address (where required) and one-click unsubscribe
          </li>
        </ul>
        <p>
          Start from an industry layout in the{" "}
          <Link href="/templates" className="text-teal hover:underline">
            template gallery
          </Link>
          , then edit copy so it sounds like your business — not a generic promo.
        </p>
      </section>

      <section id="measure" className="mt-12 scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">5. What to measure</h2>
        <p>
          Opens are noisy (privacy features and image blocking distort them). Treat them as
          directional. Clicks, unsubscribes, bounces, and complaints tell you more about list fit.
          If complaint or bounce rates spike, pause and fix the list or offer — Sendfable will
          auto-pause campaigns that cross safety thresholds.
        </p>
      </section>

      <section id="tools" className="mt-12 scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">6. Choosing tools</h2>
        <p>
          Pick an ESP for list quality controls, clear pricing, and authentication that matches how
          you send — not for vanity dashboards. Compare Sendfable with{" "}
          <Link href="/compare/mailchimp" className="text-teal hover:underline">
            Mailchimp
          </Link>
          ,{" "}
          <Link href="/compare/brevo" className="text-teal hover:underline">
            Brevo
          </Link>
          , and others when pricing or workflow fit matters. If cost is the main constraint, read{" "}
          <Link href="/cheap-email-marketing" className="text-teal hover:underline">
            cheap email marketing
          </Link>
          .
        </p>
      </section>

      <MarketingCta
        title="Put the guide into practice"
        body="Create a free Sendfable account, import a consented CSV, and send a small first campaign."
        secondaryHref="/resources"
        secondaryLabel="More resources"
      />
    </article>
  );
}
