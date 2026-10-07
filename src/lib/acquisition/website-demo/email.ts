/**
 * Casey email that shows one business its own website turned into a campaign preview.
 * Sent only to that business contact (or an owner preview inbox). Never to their customers.
 */

import { PLANS } from "@/lib/plans";
import { renderCampaignPreview, PREVIEW_LABEL } from "@/lib/acquisition/website-demo/preview";
import type { MarketingFacts } from "@/lib/acquisition/website-demo/extract";
import { DEMO_NEVER_SENDS_TO_CUSTOMER_LIST } from "@/lib/acquisition/website-demo/preview";

export { DEMO_NEVER_SENDS_TO_CUSTOMER_LIST, PREVIEW_LABEL };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function greeting(firstName?: string | null, businessName?: string | null): string {
  const n = (firstName || "").trim();
  if (n && /^[A-Za-z][A-Za-z.'-]{0,39}$/.test(n)) return `Hi ${n},`;
  const biz = (businessName || "").trim();
  if (biz) return `Hi ${biz},`;
  return "Hi there,";
}

export function websiteDemoSubject(businessName: string): string {
  const biz = businessName.trim() || "your business";
  return `We made this from ${biz}'s website`;
}

export function buildWebsiteDemoEmail(input: {
  businessName: string;
  firstName?: string | null;
  facts: MarketingFacts;
  unsubUrl: string;
  ctaUrl: string;
}): { subject: string; html: string; text: string; campaignSubject: string } {
  if (!DEMO_NEVER_SENDS_TO_CUSTOMER_LIST) {
    throw new Error("website_demo_customer_send_forbidden");
  }
  const biz = input.businessName.trim() || "your business";
  const preview = renderCampaignPreview(input.facts, biz);
  const hello = greeting(input.firstName, biz);
  const free = `Free for up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month. No credit card.`;
  const text = [
    hello,
    "",
    "I wanted to show you something instead of just telling you about it.",
    "",
    `We used the public information on ${biz}'s website to show you what SendFable could create. We did not write a generic sample. SendFable took the special, event, or product already on your website and turned it into a ready-to-send email.`,
    "",
    PREVIEW_LABEL,
    `Subject: ${preview.subject}`,
    input.facts.headline,
    [input.facts.dateText, input.facts.timeText, input.facts.priceText].filter(Boolean).join(" · "),
    input.facts.description || "",
    input.facts.imageUrl ? `Image: ${input.facts.imageUrl}` : "",
    `${input.facts.ctaLabel}: ${input.facts.ctaHref}`,
    "",
    `Source: your public page at ${input.facts.pageUrl}`,
    "",
    "When you're a SendFable customer, it can keep watching that page and prepare the next one automatically.",
    "",
    "You get the finished draft and choose: Send it, Edit it, or Skip it. Nothing goes to your customers unless you approve it. Nothing sends until you approve it.",
    "",
    "SendFable can also collect new customers through forms and handle Email, Text, or Both.",
    "",
    "See how it works:",
    input.ctaUrl,
    "",
    "— Casey",
    "SendFable",
    "",
    free,
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${input.unsubUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Georgia,serif;color:#111827;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${esc(hello)}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">I wanted to show you something instead of just telling you about it.</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.5;">We used the public information on ${esc(biz)}'s website to show you what SendFable could create. We didn't write a generic sample. SendFable took the special, event, or product already on your website and turned it into a ready-to-send email.</p>
${preview.html}
<p style="margin:18px 0 12px;font-size:16px;line-height:1.5;">When you're a SendFable customer, it can keep watching that page and prepare the next one automatically.</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">You get the finished draft and choose: <strong>Send it</strong>, <strong>Edit it</strong>, or <strong>Skip it</strong>. Nothing goes to your customers unless you approve it. Nothing sends until you approve it.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">SendFable can also collect new customers through forms and handle Email, Text, or Both.</p>
<p style="margin:0 0 8px;font-size:16px;">See how it works:</p>
<p style="margin:0 0 18px;"><a href="${esc(input.ctaUrl)}" style="color:#4F46E5;">${esc(input.ctaUrl)}</a></p>
<p style="margin:0 0 4px;font-size:16px;">— Casey<br>SendFable</p>
<p style="margin:16px 0;font-size:14px;color:#4b5563;">${esc(free)}</p>
<p style="margin:0;font-size:12px;color:#6b7280;">If you'd rather not hear from me again, reply "no thanks" or <a href="${esc(input.unsubUrl)}">unsubscribe</a>.</p>
</div></body></html>`;

  return {
    subject: websiteDemoSubject(biz),
    html,
    text,
    campaignSubject: preview.subject,
  };
}
