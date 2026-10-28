import { acquisitionPhysicalAddress } from "@/lib/acquisition/flags";
import { PLANS } from "@/lib/plans";
import { categoryToTryType, trySiteChrome, type TryBusinessType } from "@/lib/try-signup/config";

export const UTILITY_EMAIL_CTA = "Try it on your website";

export type UtilityEmailCopy = {
  subject: string;
  headline: string;
  body: string[];
  audiencePrimary: string;
  audienceSecondary: string;
  formHeadline: string;
  buttonLabel: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function utilityEmailCopy(category?: string | null): UtilityEmailCopy {
  return copyForType(categoryToTryType(category));
}

function copyForType(type: TryBusinessType): UtilityEmailCopy {
  if (type === "band") {
    return {
      subject: "Put your fan signup on your website",
      headline: "Put a fan signup right on your website.",
      body: [
        "Fans join one audience. Venues can have another.",
        "Your contacts stay yours.",
      ],
      audiencePrimary: "Fans",
      audienceSecondary: "Venues",
      formHeadline: "Join the fan list",
      buttonLabel: "Join the fan list",
    };
  }
  if (type === "restaurant") {
    return {
      subject: "Turn website visitors into regulars",
      headline: "Put a signup right on your website.",
      body: [
        "Customers join one audience. Private events can have another.",
        "Your contacts stay yours.",
      ],
      audiencePrimary: "Customers",
      audienceSecondary: "Private Events",
      formHeadline: "Get the specials",
      buttonLabel: "Join",
    };
  }
  if (type === "brewery") {
    return {
      subject: "Build your taproom list",
      headline: "Put a taproom signup right on your website.",
      body: [
        "Taproom guests join one audience. Releases can have another.",
        "Your contacts stay yours.",
      ],
      audiencePrimary: "Taproom",
      audienceSecondary: "Beer Releases",
      formHeadline: "Get release notes",
      buttonLabel: "Join",
    };
  }
  if (type === "contractor") {
    return {
      subject: "Keep website leads in one place",
      headline: "Put a signup right on your website.",
      body: [
        "Customers join one audience. Leads can have another.",
        "Your contacts stay yours.",
      ],
      audiencePrimary: "Customers",
      audienceSecondary: "Leads",
      formHeadline: "Request a reminder",
      buttonLabel: "Join",
    };
  }
  return {
    subject: "Collect people from your website",
    headline: "Put a signup right on your website.",
    body: [
      "People join one audience. Another group can have its own.",
      "Your contacts stay yours.",
    ],
    audiencePrimary: "Customers",
    audienceSecondary: "Leads",
    formHeadline: "Join the list",
    buttonLabel: "Join",
  };
}

export function greeting(firstName?: string | null): string {
  const n = (firstName || "").trim();
  if (n && /^[A-Za-z][A-Za-z.'-]{0,39}$/.test(n)) return `Hi ${n},`;
  return "Hi,";
}

export function freePlanLine(): string {
  return `Free to start — up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month.`;
}

export function coreMarketingWordCount(copy: UtilityEmailCopy): number {
  const words = [copy.headline, ...copy.body, UTILITY_EMAIL_CTA, "Free to start.", "Nothing sends unless you schedule it."]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

/** Email-safe fictional website with an embedded signup box. */
export function signupToolPreviewHtml(
  copy: UtilityEmailCopy,
  businessName?: string | null,
  category?: string | null
): string {
  const chrome = trySiteChrome(categoryToTryType(category), businessName);
  const siteName = businessName?.trim() || chrome.siteName;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #d1d5db;border-radius:12px;background:#eef1f4;">
<tr><td style="padding:8px 10px;background:#e5e7eb;border-radius:12px 12px 0 0;">
  <span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:#f9a8a8;"></span>
  <span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:#fde68a;margin-left:4px;"></span>
  <span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:#86efac;margin-left:4px;"></span>
  <span style="font-size:11px;color:#6b7280;font-family:Inter,-apple-system,'Segoe UI',sans-serif;margin-left:8px;">yoursite.com</span>
</td></tr>
<tr><td style="padding:22px 20px 20px;background:#f8f4ea;">
  <p style="margin:0 0 4px;font-size:22px;line-height:1.25;color:#17213B;font-family:Georgia,'Times New Roman',serif;">${esc(
    siteName
  )}</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.45;color:#4b5563;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">${esc(
    chrome.tagline
  )}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;">
  <tr><td style="padding:16px;">
    <p style="margin:0 0 8px;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;font-size:14px;color:#9ca3af;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">email address</p>
    <p style="margin:0 0 10px;"><span style="display:inline-block;padding:10px 16px;background:#e11d48;color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">${esc(
      copy.buttonLabel
    )}</span></p>
    <p style="margin:0;font-size:11px;color:#6b7280;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">No spam. Unsubscribe anytime.</p>
  </td></tr>
  </table>
</td></tr>
</table>`;
}

export function renderUtilitySignupEmail(opts: {
  businessName: string;
  firstName?: string | null;
  category?: string | null;
  ctaUrl: string;
  unsubUrl: string;
}): { subject: string; html: string; text: string; copy: UtilityEmailCopy } {
  const copy = utilityEmailCopy(opts.category);
  const hello = greeting(opts.firstName);
  const chrome = trySiteChrome(categoryToTryType(opts.category), opts.businessName);
  const text = [
    hello,
    "",
    copy.headline,
    "",
    chrome.siteName,
    chrome.tagline,
    "email address",
    copy.buttonLabel,
    "No spam. Unsubscribe anytime.",
    "",
    ...copy.body,
    "",
    `${UTILITY_EMAIL_CTA}:`,
    opts.ctaUrl,
    "",
    "Free to start.",
    "",
    "Nothing sends unless you schedule it.",
    "",
    "Casey",
    "SendFable",
    "",
    `Unsubscribe: ${opts.unsubUrl}`,
    "",
    acquisitionPhysicalAddress(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8f4ea;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f4ea;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding-bottom:16px;text-align:left;">
  <span style="font-size:22px;font-weight:700;color:#17213B;letter-spacing:-0.03em;font-family:Georgia,'Times New Roman',serif;">SendFable</span>
</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;">
  <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#374151;">${esc(hello)}</p>
  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:#17213B;font-family:Georgia,'Times New Roman',serif;">${esc(
    copy.headline
  )}</h1>
  ${signupToolPreviewHtml(copy, opts.businessName, opts.category)}
  <p style="margin:18px 0 8px;font-size:15px;line-height:1.6;color:#374151;">${esc(copy.body[0] || "")}</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">${esc(copy.body[1] || "")}</p>
  <p style="margin:0;">
    <a href="${esc(opts.ctaUrl)}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#e11d48;">${esc(
      UTILITY_EMAIL_CTA
    )}</a>
  </p>
  <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">Free to start.</p>
  <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">Nothing sends unless you schedule it.</p>
</td></tr>
<tr><td style="padding-top:18px;">
  <p style="margin:0 0 6px;font-size:13px;color:#17213B;">SendFable</p>
  <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:#6b7280;"><a href="${esc(
    opts.unsubUrl
  )}" style="color:#6b7280;">Unsubscribe</a></p>
  <p style="margin:0;font-size:11px;line-height:1.45;color:#9ca3af;">${esc(
    acquisitionPhysicalAddress()
  )}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return { subject: copy.subject, html, text, copy };
}
