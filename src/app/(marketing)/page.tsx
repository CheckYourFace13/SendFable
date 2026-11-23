import { applyManagedMetadata } from "@/lib/gravyblock-managed";
import { Hero } from "@/components/marketing/home/hero";
import { ChannelTrio } from "@/components/marketing/home/channel-trio";
import { ThreeSteps } from "@/components/marketing/home/three-steps";
import { MarketingAutopilotHome } from "@/components/marketing/home/marketing-autopilot";
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
import { VideoSection } from "@/components/marketing/youtube-embed";
import {
  JsonLd,
  marketingPageMeta,
  softwareApplicationJsonLd,
  videoObjectJsonLd,
} from "@/components/marketing/json-ld";
import { OFFICIAL_VIDEOS } from "@/data/official-videos";
import { PLANS } from "@/lib/plans";

const baseMetadata = marketingPageMeta({
  title: "SendFable — Email marketing without the headache",
  description: `Email marketing for small businesses. Free ${PLANS.FREE.contactCap} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month. Starter $${PLANS.STARTER.monthlyPrice}/mo. No credit card.`,
  path: "/",
});


export async function generateMetadata() {
  return applyManagedMetadata("/", baseMetadata);
}
export default function HomePage() {
  const overview = OFFICIAL_VIDEOS.overview;
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd
        data={videoObjectJsonLd({
          name: overview.title,
          description: overview.description,
          youtubeId: overview.youtubeId,
          watchUrl: overview.watchUrl,
          pagePath: "/",
          uploadDate: overview.uploadDate,
        })}
      />
      <Hero />
      <VideoSection
        videoId="overview"
        heading="See how SendFable works"
        support="A short tour of email and text marketing without the marketing-software headache."
      />
      <ChannelTrio />
      <ThreeSteps />
      <MarketingAutopilotHome />
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
