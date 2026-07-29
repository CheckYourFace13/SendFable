import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, articleJsonLd, faqJsonLd } from "@/components/marketing/json-ld";

export function GuidePage({
  path,
  title,
  description,
  updated,
  lead,
  sections,
  faqs,
  related,
}: {
  path: string;
  title: string;
  description: string;
  updated: string;
  lead: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/resources" },
          { name: title, path },
        ])}
      />
      <JsonLd
        data={articleJsonLd({
          title,
          description,
          path,
          dateModified: updated,
          datePublished: updated,
        })}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: title, href: path, current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Guide</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-4 text-lg text-ink/75">{lead}</p>
      <p className="mt-2 text-sm text-ink/55">Updated {updated} · Reviewed by SendFable</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold text-ink">{s.heading}</h2>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{s.body}</p>
          </section>
        ))}
      </div>
      <ul className="mt-10 list-disc space-y-2 pl-5 text-sm">
        {related.map((r) => (
          <li key={r.href}>
            <Link className="text-coral hover:underline" href={r.href}>
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}

export function guideMetadata(path: string, title: string, description: string) {
  return marketingPageMeta({ path, title, description });
}
