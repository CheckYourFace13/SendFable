import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroProductComposition } from "./hero-composition";

export function Hero() {
  return (
    <section className="editorial-bg relative overflow-hidden border-b border-ink/10">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Email marketing made human
          </p>
          <h1 className="mt-4 font-display text-display-xl text-ink text-balance">
            Send emails people want to open.
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-charcoal/80">
            Create beautiful campaigns, reach the right people and understand what
            worked—without fighting a complicated marketing platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-coral text-page hover:bg-coral-hover">
              <Link href="/signup">Start writing free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink/20 bg-page text-ink hover:bg-parchment"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink/60">
            500 contacts. No credit card. No complicated setup.
          </p>
        </div>
        <HeroProductComposition />
      </div>
    </section>
  );
}
