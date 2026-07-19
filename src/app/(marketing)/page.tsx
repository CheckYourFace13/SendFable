import { Hero } from "@/components/marketing/home/hero";
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

export const metadata = {
  title: "Sendfable — Simple Email Marketing for Small Businesses",
  description:
    "Create beautiful emails, manage your audience and understand every campaign with a simpler email-marketing platform built for small businesses.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
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
