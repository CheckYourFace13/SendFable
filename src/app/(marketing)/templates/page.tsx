import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import {
  JsonLd,
  marketingPageMeta,
  softwareApplicationJsonLd,
} from "@/components/marketing/json-ld";
import { PLATFORM_TEMPLATES } from "@/lib/platform-templates";

export const metadata = marketingPageMeta({
  title: "Email templates for small businesses",
  description:
    "Real SendFable templates for restaurants, retail, salons, and more. Preview on mobile, then use one in your account.",
  path: "/templates",
});

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <JsonLd data={softwareApplicationJsonLd()} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Templates", href: "/templates", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Email template gallery
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        These are the same templates inside SendFable. Pick one, sign up (or sign in), and we open
        a campaign ready to edit.
      </p>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_TEMPLATES.map((t) => (
          <li key={t.shareSlug}>
            <Link
              href={`/templates/${t.shareSlug}`}
              className="block h-full rounded-xl border border-ink/10 bg-surface p-5 transition hover:border-ink/25"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">{t.industry}</p>
              <h2 className="mt-2 font-display text-xl text-ink">{t.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {t.suggestedPreviewText}
              </p>
              <p className="mt-4 text-sm font-medium text-coral">Preview &amp; use →</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-16">
        <MarketingCta
          title="Ready to send?"
          body="Start free with 500 contacts. No credit card."
          primaryHref="/signup"
          primaryLabel="Create account"
        />
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link href="/pricing">See pricing</Link>
        </Button>
      </div>
    </div>
  );
}
