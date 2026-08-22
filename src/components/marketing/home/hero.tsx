import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroProductComposition } from "./hero-composition";
import { PLANS } from "@/lib/plans";

export function Hero() {
  return (
    <section className="editorial-bg relative overflow-hidden border-b border-ink/10">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Email marketing for small businesses
          </p>
          <h1 className="mt-4 font-display text-display-xl text-ink text-balance">
            Send emails people want to open.
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-charcoal/80">
            Build a list, write a clear email, and see who opened — without paying for CRM features
            you will never use.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-coral-solid text-white hover:bg-coral-hover">
              <Link href="/signup">Start writing free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink/20 bg-page text-ink hover:bg-parchment"
            >
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink/70">
            {PLANS.FREE.contactCap.toLocaleString()} contacts · No credit card · Cancel anytime
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60">
            <li>Transparent limits</li>
            <li>Easy unsubscribe</li>
            <li>Sender verification</li>
            <li>No long-term contracts</li>
          </ul>
        </div>
        <HeroProductComposition />
      </div>
    </section>
  );
}
