import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PageHeader } from "@/components/app/page-header";
import {
  competitorFreshnessReport,
  PRICING_STALE_DAYS,
  FEATURES_STALE_DAYS,
} from "@/data/competitors";

export const dynamic = "force-dynamic";

export default async function AdminCompetitorsPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) redirect("/dashboard");

  const rows = competitorFreshnessReport();
  const stalePricing = rows.filter((r) => r.pricingStale);
  const staleFeatures = rows.filter((r) => r.featuresStale);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitor freshness"
        description={`Owner review queue. Pricing stale after ${PRICING_STALE_DAYS} days; features after ${FEATURES_STALE_DAYS} days. Do not auto-publish scrapes.`}
      />
      <p className="text-sm text-muted-foreground">
        Stale pricing: {stalePricing.length} · Stale features: {staleFeatures.length}.{" "}
        <Link className="text-coral underline" href="/admin">
          Back to admin
        </Link>
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-3 py-2">Competitor</th>
              <th className="px-3 py-2">Pricing checked</th>
              <th className="px-3 py-2">Features checked</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Public page</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">
                  {r.pricingLastChecked}
                  {r.pricingStale ? " · STALE" : ""}
                </td>
                <td className="px-3 py-2">
                  {r.featuresLastChecked}
                  {r.featuresStale ? " · STALE" : ""}
                </td>
                <td className="px-3 py-2">{r.reviewStatus}</td>
                <td className="px-3 py-2">
                  <Link className="text-coral underline" href={`/compare/${r.slug}`}>
                    /compare/{r.slug}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
