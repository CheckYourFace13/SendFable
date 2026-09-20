import Link from "next/link";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { isSmsPublicEnabled } from "@/lib/sms/flags";

export function FinalCta() {
  const smsPublic = isSmsPublicEnabled();
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-page sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 80% 20%, rgba(15,122,114,0.35), transparent), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(232,90,60,0.25), transparent)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="font-display text-display-lg text-page text-balance">
            {smsPublic
              ? "Send your next email or text without the extra software."
              : "Send your next email without the extra software."}
          </h2>
          <p className="mt-4 max-w-md text-lg text-page/70">
            Free {PLANS.FREE.contactCap.toLocaleString()} contacts · Starter $
            {PLANS.STARTER.monthlyPrice}/mo · No credit card to start.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-coral-solid text-white hover:bg-coral-hover"
          >
            <Link href="/signup">Start free</Link>
          </Button>
        </div>

        <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
          <div className="relative rounded-sm border-2 border-page/25 bg-page p-8 text-ink shadow-2xl">
            <NextImage
              src="/illustrations/page-turn.svg"
              alt=""
              width={160}
              height={120}
              className="mx-auto h-auto w-40"
            />
            <p className="mt-6 text-center font-display text-xl text-ink">
              Clear campaigns. Honest pricing.
            </p>
            <div className="mx-auto mt-4 h-1 w-12 rounded bg-coral" />
          </div>
        </div>
      </div>
    </section>
  );
}
