import { notFound } from "next/navigation";
import { ComparePageFromRecord } from "@/components/marketing/compare-page";
import { getCompetitor, listPublicCompetitors } from "@/data/competitors";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export function generateStaticParams() {
  return listPublicCompetitors().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = getCompetitor(params.slug);
  if (!c || !c.publicComparisonEnabled) {
    return { title: "Comparison" };
  }
  return marketingPageMeta({
    title: `SendFable vs ${c.name}`,
    description: `${c.shortAnswer} Last checked ${c.pricingLastChecked}.`,
    path: `/compare/${c.slug}`,
  });
}

export default function CompareSlugPage({ params }: { params: { slug: string } }) {
  const c = getCompetitor(params.slug);
  if (!c || !c.publicComparisonEnabled) notFound();
  return <ComparePageFromRecord competitor={c} />;
}
