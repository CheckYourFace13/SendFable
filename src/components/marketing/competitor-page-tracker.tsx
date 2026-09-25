"use client";

import { useEffect } from "react";
import { trackClientEvent } from "@/components/marketing/marketing-analytics";

export function CompetitorPageTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackClientEvent("competitor_page_view", { competitor: slug });
    if (slug === "mailchimp") {
      trackClientEvent("mailchimp_page_view", { competitor: slug });
    }
  }, [slug]);
  return null;
}
