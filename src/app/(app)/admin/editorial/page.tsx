import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { redirect } from "next/navigation";
import { allEditorialItems } from "@/data/editorial-drafts";
import { NURTURE_SEQUENCES, RELEASE_CADENCE } from "@/data/content-pipeline";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminEditorialPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) redirect("/dashboard");

  const items = allEditorialItems();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Editorial dashboard"
        description="Review drafts, fact-check status, and release cadence. Nothing auto-publishes."
      />

      <section className="rounded-xl border bg-white p-5 text-sm">
        <h2 className="font-semibold">Recommended cadence</h2>
        <p className="mt-2 text-muted-foreground">
          {RELEASE_CADENCE.strongArticlesPerWeek} strong articles / week ·{" "}
          {RELEASE_CADENCE.comparisonRefreshPerWeek} comparison refresh / week ·{" "}
          {RELEASE_CADENCE.productUseCasePerWeek} product/use-case / week · major comparison review{" "}
          {RELEASE_CADENCE.majorComparisonReview}
        </p>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Topic</th>
              <th className="p-3">Target query</th>
              <th className="p-3">Intent</th>
              <th className="p-3">Cluster</th>
              <th className="p-3">Status</th>
              <th className="p-3">Fact-check</th>
              <th className="p-3">Pricing fresh</th>
              <th className="p-3">Propose</th>
              <th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-medium">{item.title}</div>
                  {item.targetPath && (
                    <div className="text-xs text-muted-foreground">{item.targetPath}</div>
                  )}
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {item.internalLinkSuggestions.slice(0, 3).map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-3">{item.targetQuery}</td>
                <td className="p-3">{item.searchIntent}</td>
                <td className="p-3">{item.cluster}</td>
                <td className="p-3">
                  <Badge variant="secondary">{item.status}</Badge>
                </td>
                <td className="p-3">{item.factCheckStatus}</td>
                <td className="p-3">{item.competitorPricingFresh ? "yes" : "review"}</td>
                <td className="p-3">{item.proposedPublish || "—"}</td>
                <td className="p-3">{item.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Nurture sequences (inactive)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {NURTURE_SEQUENCES.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
              <span className="font-medium">{s.name}</span>
              <Badge variant="secondary">{s.status}</Badge>
              <span className="text-muted-foreground">
                {s.emails.length} emails · consent {s.consentRequired ? "required" : "product"} ·
                test-only {s.testModeOnly ? "yes" : "no"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          No general nurture sends until owner approval. See docs/SF-008_SOCIAL_CALENDAR.md and
          nurture specs.
        </p>
      </section>

      <Link className="text-sm text-coral underline" href="/admin">
        Back to admin
      </Link>
    </div>
  );
}
