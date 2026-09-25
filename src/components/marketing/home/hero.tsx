import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroProductComposition } from "./hero-composition";
import { PLANS } from "@/lib/plans";
import { isSmsPublicEnabled } from "@/lib/sms/flags";
import { Text20Hint } from "@/components/marketing/text20-hint";

export function Hero() {
  const smsPublic = isSmsPublicEnabled();

  return (
    <section className="editorial-bg relative overflow-hidden border-b border-ink/10">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            SendFable
          </p>
          <h1 className="mt-3 font-display text-display-lg text-ink text-balance sm:text-display-xl">
            Email and text marketing without the marketing-software headache
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-charcoal/80">
            Free {PLANS.FREE.contactCap.toLocaleString()} contacts /{" "}
            {PLANS.FREE.emailsPerMonth.toLocaleString()} emails · Starter ${PLANS.STARTER.monthlyPrice}
            {smsPublic
              ? " · Email, Text, or Both in one campaign."
              : " · Clear email campaigns for small businesses."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-coral-solid text-white hover:bg-coral-hover">
              <Link href="/signup">Start free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink/20 bg-surface text-ink hover:bg-parchment"
            >
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink/70">No credit card · Cancel anytime</p>
          <Text20Hint />
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60">
            <li>Transparent limits</li>
            <li>Easy unsubscribe</li>
            <li>Sender verification</li>
            {smsPublic ? <li>Consent-built texting</li> : <li>No long-term contracts</li>}
          </ul>
        </div>
        <HeroProductComposition />
      </div>
    </section>
  );
}
