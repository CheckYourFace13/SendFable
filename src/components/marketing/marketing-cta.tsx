import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Append utm_* from a query string onto an href (pathname or absolute path). */
export function appendUtmParams(href: string, search?: string | null): string {
  if (!search) return href;
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const from = new URLSearchParams(raw);
  const keep = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = from.get(key);
    if (v) keep.set(key, v);
  }
  if (![...keep.keys()].length) return href;
  const base = href.startsWith("http") ? href : `https://sendfable.com${href.startsWith("/") ? href : `/${href}`}`;
  const u = new URL(base);
  keep.forEach((v, k) => u.searchParams.set(k, v));
  if (href.startsWith("http")) return u.toString();
  return `${u.pathname}${u.search}`;
}

export function MarketingCta({
  title = "Ready to send your story?",
  body = "Start writing free, import opted-in contacts, and send your first campaign. No credit card required.",
  primaryHref = "/signup",
  primaryLabel = "Start writing free",
  secondaryHref = "/login",
  secondaryLabel = "Log in",
  /** When set (e.g. after cohort bottleneck B), preserve casey UTMs onto CTAs */
  preserveSearch = null,
}: {
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  preserveSearch?: string | null;
}) {
  const primary = appendUtmParams(primaryHref, preserveSearch);
  const secondary = secondaryHref
    ? appendUtmParams(secondaryHref, preserveSearch)
    : secondaryHref;

  return (
    <section className="mt-16 rounded-2xl bg-ink px-6 py-12 text-center text-page sm:px-10">
      <h2 className="font-display text-2xl text-page sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-page/70">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href={primary}>{primaryLabel}</Link>
        </Button>
        {secondary && secondaryLabel && (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-page/40 bg-transparent text-page hover:bg-page/10 hover:text-page"
          >
            <Link href={secondary}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
