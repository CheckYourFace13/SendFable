import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";

/** All public marketing/legal routes (excludes app, auth, and API). */
export const SITEMAP_PATHS = [
  "/",
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
  "/resources",
  "/changelog",
  "/cheap-email-marketing",
  "/email-marketing-without-gmail",
  "/alternatives/mailchimp",
  "/vs/mailchimp",
  "/compare/mailchimp",
  "/compare/constant-contact",
  "/compare/brevo",
  "/compare/mailerlite",
  "/compare/kit",
  "/compare/beehiiv",
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
  "/terms",
  "/privacy",
  "/feed.xml",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return SITEMAP_PATHS.map((path) => ({
    url: appUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : path === "/changelog" || path === "/feed.xml" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/solutions/") || path.startsWith("/compare/") ? 0.6 : 0.7,
  }));
}
