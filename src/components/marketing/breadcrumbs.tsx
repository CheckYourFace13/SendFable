import Link from "next/link";
import { JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";

export type Crumb = {
  label: string;
  href: string;
  /** When true, render as plain text (current page) */
  current?: boolean;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(items.map((item) => ({ name: item.label, path: item.href })))}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {item.current ? (
                <span className="text-foreground">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
