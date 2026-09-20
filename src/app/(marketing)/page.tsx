import { Hero } from "@/components/marketing/home/hero";
import { ChannelTrio } from "@/components/marketing/home/channel-trio";
import { ThreeSteps } from "@/components/marketing/home/three-steps";
import { GoalPicker } from "@/components/marketing/home/goal-picker";
import { BuilderShowcase } from "@/components/marketing/home/builder-showcase";
import { Simplicity } from "@/components/marketing/home/simplicity";
import { IndustryStories } from "@/components/marketing/home/industry-stories";
import { ResultsDemo } from "@/components/marketing/home/results-demo";
import { TemplateGallery } from "@/components/marketing/home/template-gallery";
import { DeliverabilityStory } from "@/components/marketing/home/deliverability-story";
import { PricingPreview } from "@/components/marketing/home/pricing-preview";
import { HomeFaq } from "@/components/marketing/home/home-faq";
import { FinalCta } from "@/components/marketing/home/final-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "SendFable — Email and text marketing without the headache",
  description: `Email marketing for small businesses. Free ${PLANS.FREE.contactCap} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month. Starter $${PLANS.STARTER.monthlyPrice}/mo. No credit card.`,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <ChannelTrio />
      <ThreeSteps />
      <GoalPicker />
      <BuilderShowcase />
      <Simplicity />
      <IndustryStories />
      <ResultsDemo />
      <TemplateGallery />
      <DeliverabilityStory />
      <PricingPreview />
      <HomeFaq />
      <FinalCta />
    </>
  );
}
