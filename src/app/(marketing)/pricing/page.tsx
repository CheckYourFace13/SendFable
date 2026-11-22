import Link from "next/link";
import { applyManagedMetadata } from "@/lib/gravyblock-managed";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PricingPreview } from "@/components/marketing/home/pricing-preview";
import { SmsPricingSection } from "@/components/marketing/sms-pricing";
import { Faq } from "@/components/marketing/faq";
import { Button } from "@/components/ui/button";
import { JsonLd, marketingPageMeta, videoObjectJsonLd } from "@/components/marketing/json-ld";
import { YoutubeEmbed } from "@/components/marketing/youtube-embed";
import { OFFICIAL_VIDEOS } from "@/data/official-videos";
import { PLANS } from "@/lib/plans";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";
import { AUTOPILOT_CREATION_PACKS } from "@/lib/autopilot/commercial";
import { SMS_ACTIVATION_FEE_CENTS, SMS_PLANS, formatCentsUsd, formatMicrosUsd } from "@/lib/sms/pricing";

const baseMetadata = marketingPageMeta({
  title: "Pricing — Free to Pro Plus",
  description: `Simple SendFable plans: Free (${PLANS.FREE.contactCap} contacts), Starter $${PLANS.STARTER.monthlyPrice}/mo, Growth $${PLANS.GROWTH.monthlyPrice}/mo, Pro $${PLANS.PRO.monthlyPrice}/mo, Pro Plus $${PLANS.PRO_PLUS.monthlyPrice}/mo. Clear limits. Annual saves two months.`,
  path: "/pricing",
});


export async function generateMetadata() {
  return applyManagedMetadata("/pricing", baseMetadata);
}
export default function PricingPage() {
  const pricingVideo = OFFICIAL_VIDEOS.pricing;
  return (
    <div className="editorial-bg">
      <JsonLd
        data={videoObjectJsonLd({
          name: pricingVideo.title,
          description: pricingVideo.description,
          youtubeId: pricingVideo.youtubeId,
          watchUrl: pricingVideo.watchUrl,
          pagePath: "/pricing",
        })}
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Pricing", href: "/pricing", current: true },
          ]}
        />
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Honest limits
          </p>
          <h1 className="mt-3 font-display text-display-lg text-ink">
            Pricing that stays readable
          </h1>
          <p className="mt-4 text-lg text-charcoal/75">
            Start free. Upgrade when your list grows. Competitor prices change — see the dated{" "}
            <a href="/email-marketing-pricing-comparison" className="text-coral underline-offset-2 hover:underline">
              email marketing pricing comparison
            </a>
            .
          </p>
        </div>

        <div className="mt-12">
          <PricingPreview embedded showFullLink={false} />
        </div>

        <section className="mx-auto mt-16 max-w-3xl text-center">
          <h2 className="font-display text-3xl text-ink">See how quickly you can start</h2>
          <p className="mt-3 text-charcoal/75">
            Free includes up to {PLANS.FREE.contactCap.toLocaleString()} contacts and{" "}
            {PLANS.FREE.emailsPerMonth.toLocaleString()} emails a month. No credit card required.
            Plan prices above are current — use those, not any figure spoken in the video.
          </p>
          <div className="mt-8 text-left">
            <YoutubeEmbed videoId="pricing" />
          </div>
          <div className="mt-6">
            <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </section>

        {/* Text messaging plans — server-flag gated; renders nothing while
            SENDFABLE_SMS_PUBLIC_ENABLED=false */}
        <SmsPricingSection />

        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="font-display text-3xl text-ink">Pricing questions</h2>
          <div className="mt-4">
            <Faq
              items={[
                {
                  q: "What counts as a contact?",
                  a: `A contact is a person stored in your workspace. Free includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts. The cap counts people on the list, and sending becomes read-only if you go over it until you remove contacts or upgrade.`,
                },
                {
                  q: "What counts as an email send?",
                  a: `One email to one recipient counts as one send. Free includes ${PLANS.FREE.emailsPerMonth.toLocaleString()} sends a month. Paid plans raise that allotment. Text messages are not email sends.`,
                },
                {
                  q: "Is Scribe included?",
                  a: `Scribe drafts a campaign from a page you choose. Nothing sends until you choose Send now or schedule it. Free can try it for 3 months, with 1 creation a month. Starter includes ${autopilotMaxDraftsPerMonth("STARTER")} a month, Growth ${autopilotMaxDraftsPerMonth("GROWTH")}, Pro ${autopilotMaxDraftsPerMonth("PRO")}, and Pro Plus ${autopilotMaxDraftsPerMonth("PRO_PLUS")}.`,
                },
                {
                  q: "Can I buy more Scribe creations?",
                  a: `Yes. Extra creations are ${AUTOPILOT_CREATION_PACKS.map((pack) => `${pack.label} for $${pack.cents / 100}`).join(", ")}. Buying a pack does not change your email plan.`,
                },
                {
                  q: "How does SMS pricing work?",
                  a: `Text messaging is a separate paid add-on. There is a ${formatCentsUsd(SMS_ACTIVATION_FEE_CENTS)} activation fee, then a monthly text plan starting at ${formatCentsUsd(SMS_PLANS.TEXT_ENTRY.monthlyPriceCents)} plus ${formatMicrosUsd(BigInt(SMS_PLANS.TEXT_ENTRY.outboundSegmentPriceMicros))} per outbound segment on Text Entry. A campaign can be Email, Text, or Both.`,
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes. Cancel from Billing. Cancellation stops renewal at the end of the period you already paid for. Canceling is not the same as a refund.",
                },
              ]}
            />
          </div>
        </section>

        <MarketingCta
          title="Your audience is ready."
          body="Give them something worth reading — start on Free, upgrade when you need more room."
          primaryLabel="Start writing free"
        />
      </div>
    </div>
  );
}
