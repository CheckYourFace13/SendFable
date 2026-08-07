"use client";

/**
 * Optional GA4 loader. Renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset.
 * Extensible later for Google Ads / Meta via the same measurement container or GTM.
 */

import Script from "next/script";
import { getGaMeasurementId } from "@/lib/track";

export function AnalyticsScripts() {
  const id = getGaMeasurementId();
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="sf-ga4" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}', { anonymize_ip: true, send_page_view: true });
      `}</Script>
    </>
  );
}
