import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
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
          "/resources",
          "/changelog",
          "/cheap-email-marketing",
          "/email-marketing-without-gmail",
          "/alternatives/",
          "/compare/",
          "/solutions/",
          "/vs/",
          "/terms",
          "/privacy",
          "/feed.xml",
          "/f/",
        ],
        disallow: [
          "/dashboard",
          "/campaigns",
          "/contacts",
          "/segments",
          "/tags",
          "/forms",
          "/billing",
          "/settings",
          "/onboarding",
          "/api/",
          "/unsubscribe/",
          "/invite/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: appUrl("/sitemap.xml"),
  };
}
