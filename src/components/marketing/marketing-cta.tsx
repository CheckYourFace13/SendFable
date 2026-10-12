import { Button } from "@/components/ui/button";
import { UtmLink } from "@/components/marketing/utm-link";
import { appendUtmParams } from "@/lib/utm-preserve";

export { appendUtmParams };

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
          <UtmLink href={primary}>{primaryLabel}</UtmLink>
        </Button>
        {secondary && secondaryLabel && (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-page/40 bg-transparent text-page hover:bg-page/10 hover:text-page"
          >
            <UtmLink href={secondary}>{secondaryLabel}</UtmLink>
          </Button>
        )}
      </div>
    </section>
  );
}
