/**
 * Render a private SendFable campaign preview from extracted public facts.
 * This HTML is shown only to the business contact. It is never a customer send.
 */

import { compileEmailFragment, type EmailDesign } from "@/lib/email-compiler";
import {
  campaignSubjectFromHeadline,
  type MarketingFacts,
} from "@/lib/acquisition/website-demo/extract";

export const DEMO_NEVER_SENDS_TO_CUSTOMER_LIST = true;

export const PREVIEW_LABEL = "Example SendFable campaign created from your website";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function factsToDesign(facts: MarketingFacts, businessName: string): EmailDesign {
  const blocks: EmailDesign["blocks"] = [
    {
      id: "biz",
      type: "text",
      props: {
        html: `<p style="margin:0;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;">${esc(businessName)}</p>`,
      },
    },
  ];
  if (facts.imageUrl) {
    blocks.push({
      id: "hero",
      type: "image",
      props: {
        src: facts.imageUrl,
        alt: facts.imageAlt || facts.headline,
        href: facts.ctaHref,
        width: 536,
      },
    });
  }
  blocks.push({
    id: "headline",
    type: "heading",
    props: { text: esc(facts.headline), level: 1, align: "left", color: "#111827" },
  });

  const meta = [facts.dateText, facts.timeText, facts.priceText].filter(Boolean).join(" · ");
  if (meta) {
    blocks.push({
      id: "meta",
      type: "text",
      props: {
        html: `<p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${esc(meta)}</p>`,
      },
    });
  }
  if (facts.description) {
    blocks.push({
      id: "body",
      type: "text",
      props: { html: `<p style="margin:0;">${esc(facts.description)}</p>` },
    });
  }
  blocks.push({
    id: "cta",
    type: "button",
    props: {
      label: facts.ctaLabel,
      href: facts.ctaHref,
      backgroundColor: "#4F46E5",
      textColor: "#ffffff",
      align: "left",
    },
  });

  return {
    version: 1,
    blocks,
    settings: { backgroundColor: "#ffffff", contentWidth: 560 },
  };
}

export function renderCampaignPreview(facts: MarketingFacts, businessName: string): {
  subject: string;
  html: string;
} {
  const subject = campaignSubjectFromHeadline(facts.headline);
  const card = compileEmailFragment(factsToDesign(facts, businessName), {
    omitComplianceFooter: true,
    businessName,
  });
  const html = `<p style="margin:0 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">${PREVIEW_LABEL}</p>
<p style="margin:0 0 10px;font-size:13px;color:#374151;"><strong>Subject:</strong> ${esc(subject)}</p>
${card}
<p style="margin:10px 0 0;font-size:13px;color:#4b5563;">Source: your public page at <a href="${esc(facts.pageUrl)}">${esc(facts.pageUrl)}</a></p>`;
  return { subject, html };
}
