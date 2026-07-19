import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingCta({
  title = "Ready to send your story?",
  body = "Free plan includes 500 contacts and 2,000 emails/month. No credit card required.",
  primaryHref = "/signup",
  primaryLabel = "Start writing free",
  secondaryHref,
  secondaryLabel,
}: {
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="mt-16 rounded-2xl bg-ink px-6 py-12 text-center text-page sm:px-10">
      <h2 className="font-display text-2xl text-page sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-page/70">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="bg-coral text-page hover:bg-coral-hover">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryHref && secondaryLabel && (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-page/40 bg-transparent text-page hover:bg-page/10 hover:text-page"
          >
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
