import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import {
  LIST_SIZE_PAGES,
  allMatrixRows,
  estimateMonthlyAt,
  matrixDisclaimer,
  PRICING_MATRIX_VERIFIED,
} from "@/data/competitors/pricing-matrix";
import { PLANS, sendfablePlanFor } from "@/lib/plans";

export function generateStaticParams() {
  return LIST_SIZE_PAGES.map((n) => ({ size: `${n}-contacts` }));
}

function parseSize(size: string): number | null {
  const m = /^(\d+)-contacts$/.exec(size);
  if (!m) return null;
  const n = Number(m[1]);
  return (LIST_SIZE_PAGES as readonly number[]).includes(n) ? n : null;
}

export function generateMetadata({ params }: { params: { size: string } }) {
  const n = parseSize(params.size);
  if (!n) return { title: "Email marketing cost" };
  const year = new Date().getFullYear();
  return marketingPageMeta({
    title: `Email Marketing Cost for ${n.toLocaleString()} Contacts (${year})`,
    description: `What does email marketing software cost for ${n.toLocaleString()} contacts? Compare SendFable with Mailchimp and other tools using dated public pricing.`,
    path: `/email-marketing-cost/${n}-contacts`,
  });
}

export default function EmailMarketingCostBySizePage({
  params,
}: {
  params: { size: string };
}) {
  const contacts = parseSize(params.size);
  if (!contacts) notFound();

  const sf = sendfablePlanFor(contacts);
  const path = `/email-marketing-cost/${contacts}-contacts`;
  const rows = allMatrixRows();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Email marketing cost", path: "/email-marketing-cost" },
          { name: `${contacts.toLocaleString()} contacts`, path },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Email marketing cost", href: "/email-marketing-cost" },
          { label: `${contacts.toLocaleString()} contacts`, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Email marketing cost for {contacts.toLocaleString()} contacts
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable’s{" "}
        {sf.plan === "FREE" ? "Free" : PLANS[sf.plan].name} plan is{" "}
        <strong>${sf.price}/mo</strong> at this list size (published caps as of{" "}
        {PRICING_MATRIX_VERIFIED}). Competitor figures below are dated snapshots — verify before
        purchasing.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-ink/10">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-parchment text-ink/70">
            <tr>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Est. monthly</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const est = estimateMonthlyAt(r, contacts);
              return (
                <tr key={r.id} className="border-t border-ink/5">
                  <td className="px-3 py-2 font-medium">
                    {r.compareHref ? (
                      <Link href={r.compareHref} className="text-coral hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="px-3 py-2">{est.label}</td>
                  <td className="px-3 py-2">
                    <a
                      href={r.pricingUrl}
                      className="underline text-ink/60"
                      rel="nofollow noopener"
                      target="_blank"
                    >
                      Official
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink/55">{matrixDisclaimer()}</p>

      <p className="mt-8 text-sm">
        <Link className="text-coral hover:underline" href="/email-marketing-pricing-comparison">
          Full pricing comparison hub
        </Link>
        {" · "}
        <Link className="text-coral hover:underline" href="/pricing">
          SendFable pricing
        </Link>
      </p>
      <MarketingCta />
    </div>
  );
}
