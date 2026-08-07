import { appUrl } from "@/lib/utils";
import type { Metadata } from "next";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

export function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const DEFAULT_OG_IMAGE = {
  url: "/brand/sendfable-social-card.jpg",
  width: 1200,
  height: 630,
  alt: "SendFable — Simple email marketing for small businesses. Start free.",
} as const;

/** Per-page metadata with canonical + OG — use on all public marketing pages. */
export function marketingPageMeta(opts: {
  title: string;
  description: string;
  path: string;
  /** Optional absolute or site-relative image path (defaults to social card JPG). */
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = appUrl(opts.path);
  const image = opts.image
    ? { ...DEFAULT_OG_IMAGE, url: opts.image }
    : DEFAULT_OG_IMAGE;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    ...(opts.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: "website",
      siteName: "Sendfable",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image.url],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sendfable",
    url: appUrl("/"),
    logo: appUrl("/brand/sendfable-mark.svg"),
    description:
      "Simple email marketing for small businesses. Add people, create an email, send it — with Amazon SES delivery managed for you.",
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
      "Email marketing for small businesses: contacts, campaigns, templates, and deliverability — without Mailchimp complexity.",
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
    name: SENDFABLE_FACTS.productName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: appUrl("/"),
    description: SENDFABLE_FACTS.positioning,
    offers: {
      "@type": "Offer",
      price: String(PLANS.FREE.monthlyPrice),
      priceCurrency: "USD",
      description: `Free plan available; paid plans from $${PLANS.STARTER.monthlyPrice}/mo`,
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
    dateModified: opts.dateModified ?? opts.datePublished ?? "2026-07-23",
    author: {
      "@type": "Organization",
      name: "Sendfable",
    },
    publisher: {
      "@type": "Organization",
      name: "Sendfable",
      url: appUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: appUrl("/brand/sendfable-mark.svg"),
      },
    },
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function howToJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    url: appUrl(opts.path),
    step: opts.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function definedTermSetJsonLd(
  terms: { name: string; description: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Email deliverability terms",
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.name,
      description: t.description,
    })),
  };
}
