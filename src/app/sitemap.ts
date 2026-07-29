import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";
import { listPublicCompetitors } from "@/data/competitors";

/** All public marketing/legal routes (excludes app, auth, and API). */
export const SITEMAP_PATHS = [
  "/",
  "/about",
  "/how-sendfable-works",
  "/pricing",
  "/features",
  "/deliverability",
  "/templates",
  "/migrate",
  "/security",
  "/status",
  "/integrations",
  "/email-marketing-guide",
  "/email-marketing-for-small-business",
  "/email-marketing-for-local-business",
  "/email-marketing-for-restaurants",
  "/email-marketing-for-breweries",
  "/email-marketing-for-retail",
  "/email-marketing-for-real-estate",
  "/email-marketing-for-nonprofits",
  "/email-marketing-for-events",
  "/email-marketing-without-crm",
  "/simple-email-marketing-software",
  "/best-email-marketing-software",
  "/best-email-marketing-for-small-business",
  "/best-affordable-email-marketing",
  "/resources",
  "/changelog",
  "/cheap-email-marketing",
  "/email-marketing-without-gmail",
  "/mailchimp-alternative",
  "/mailchimp-alternative-for-small-business",
  "/mailchimp-alternative-for-restaurants",
  "/mailchimp-alternative-for-nonprofits",
  "/mailchimp-alternative-for-local-business",
  "/mailchimp-pricing-alternative",
  "/switch-from-mailchimp",
  "/guides/export-contacts-from-mailchimp",
  "/guides/import-mailchimp-contacts-to-sendfable",
  "/guides/mailchimp-vs-sendfable-pricing",
  "/guides/best-mailchimp-alternative-for-small-businesses",
  "/guides/how-to-switch-from-mailchimp",
  "/alternatives/mailchimp",
  "/vs/mailchimp",
  "/compare",
  "/solutions/restaurants",
  "/solutions/breweries",
  "/solutions/real-estate",
  "/solutions/nonprofits",
  "/solutions/retail",
  "/solutions/contractors",
  "/solutions/salons",
  "/solutions/local-events",
  "/solutions/professional-services",
  "/migrate/mailchimp",
  "/partners",
  "/terms",
  "/privacy",
  "/cookies",
  "/acceptable-use",
  "/refund-policy",
  "/contact",
  "/feed.xml",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const comparePaths = listPublicCompetitors().map((c) => `/compare/${c.slug}`);
  const paths = [...SITEMAP_PATHS, ...comparePaths];
  return paths.map((path) => ({
    url: appUrl(path),
    lastModified: now,
    changeFrequency:
      path === "/"
        ? "weekly"
        : path === "/changelog" || path === "/feed.xml"
          ? "weekly"
          : "monthly",
    priority:
      path === "/"
        ? 1
        : path.startsWith("/solutions/") || path.startsWith("/compare/")
          ? 0.6
          : 0.7,
  }));
}
