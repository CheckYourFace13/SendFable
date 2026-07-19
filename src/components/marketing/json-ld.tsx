import { appUrl } from "@/lib/utils";

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

export function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sendfable",
    url: appUrl("/"),
    logo: appUrl("/logo.png"),
    description:
      "Email marketing platform with Amazon SES delivery, any-email signup, and straightforward pricing.",
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sendfable",
    url: appUrl("/"),
    description:
      "Every email tells your story — Sendfable sends thousands that read like you wrote each one.",
    publisher: {
      "@type": "Organization",
      name: "Sendfable",
      url: appUrl("/"),
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sendfable",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: appUrl("/"),
    description:
      "Email marketing with drag-and-drop campaigns, audience tools, and Amazon SES delivery.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available; paid plans from Starter upward",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: appUrl(item.path),
    })),
  };
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: appUrl(opts.path),
    mainEntityOfPage: appUrl(opts.path),
    datePublished: opts.datePublished ?? "2026-07-18",
    dateModified: opts.dateModified ?? opts.datePublished ?? "2026-07-18",
    author: {
      "@type": "Organization",
      name: "Sendfable",
    },
    publisher: {
      "@type": "Organization",
      name: "Sendfable",
      url: appUrl("/"),
    },
  };
}
