import { PLANS } from "@/lib/plans";
import { categoryToTryType, type TryBusinessType } from "@/lib/try-signup/config";

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
  const type = categoryToTryType(category);
  return copyForType(type);
}

function copyForType(type: TryBusinessType): UtilityEmailCopy {
  if (type === "band") {
    return {
      subject: "Put your fan signup on your website",
      headline: "Build your fan list from your own website.",
      body: [
        "Add a signup to your site for fans, keep venues in a separate audience, and export your contacts anytime.",
        "When you post a new show, Scribe can prepare the campaign. You choose when it sends.",
      ],
      audiencePrimary: "Fans",
      audienceSecondary: "Venues",
      formHeadline: "Join the list",
      buttonLabel: "Join the list",
    };
  }
  if (type === "restaurant") {
    return {
      subject: "Turn website visitors into regulars",
      headline: "Collect regulars from your own website.",
      body: [
        "Add a signup to your site for customers, keep private-event inquiries in a separate audience, and export your contacts anytime.",
        "When you post a special, Scribe can prepare the campaign. You choose when it sends.",
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
      headline: "Build your taproom list from your website.",
      body: [
        "Add a signup to your site for the taproom, keep releases in a separate audience, and export your contacts anytime.",
        "When a new beer or event appears, Scribe can prepare the campaign. You choose when it sends.",
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
      headline: "Keep website leads in one place.",
      body: [
        "Add a signup to your site for customers, keep leads in a separate audience, and export your contacts anytime.",
        "When you post an update, Scribe can prepare the campaign. You choose when it sends.",
      ],
      audiencePrimary: "Customers",
      audienceSecondary: "Leads",
      formHeadline: "Request a reminder",
      buttonLabel: "Join",
    };
  }
  return {
    subject: "Collect people from your website",
    headline: "Collect people from your own website.",
    body: [
      "Add a signup to your site, keep groups in separate audiences, and export your contacts anytime.",
      "When your website changes, Scribe can prepare the campaign. You choose when it sends.",
    ],
    audiencePrimary: "Customers",
    audienceSecondary: "Leads",
    formHeadline: "Join the list",
    buttonLabel: "Join",
  };
}

export function greeting(firstName?: string | null, businessName?: string | null): string {
  const n = (firstName || "").trim();
  if (n && /^[A-Za-z][A-Za-z.'-]{0,39}$/.test(n)) return `Hi ${n},`;
  const biz = (businessName || "").trim();
  if (biz) return `Hi ${biz},`;
  return "Hi there,";
}

export function freePlanLine(): string {
  return `Free to start — up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month.`;
}

export function coreMarketingWordCount(copy: UtilityEmailCopy): number {
  const words = [copy.headline, ...copy.body, "Build your signup tool", freePlanLine()]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

/** Email-safe recreation of the public Signup Tool preview card. */
export function signupToolPreviewHtml(copy: UtilityEmailCopy): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
<tr><td style="padding:18px 18px 16px;">
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">Inline preview</p>
  <p style="margin:0 0 4px;font-size:22px;line-height:1.3;color:#17213B;font-family:Georgia,'Times New Roman',serif;">${esc(
    copy.formHeadline
  )}</p>
  <p style="margin:0 0 14px;font-size:14px;color:#4b5563;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">Your ${esc(
    copy.audiencePrimary
  )} list</p>
  <p style="margin:0 0 6px;font-size:13px;color:#17213B;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">Email</p>
  <p style="margin:0 0 14px;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;background:#f8f4ea;font-size:14px;color:#9ca3af;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">you@example.com</p>
  <p style="margin:0 0 16px;"><span style="display:inline-block;padding:10px 16px;background:#e11d48;color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">${esc(
    copy.buttonLabel
  )}</span></p>
  <p style="margin:0;font-size:12px;color:#4b5563;font-family:Inter,-apple-system,'Segoe UI',sans-serif;">
    <span style="display:inline-block;margin-right:8px;padding:4px 8px;border:1px solid #d1d5db;border-radius:999px;">${esc(
      copy.audiencePrimary
    )} audience</span>
    <span style="display:inline-block;padding:4px 8px;border:1px solid #d1d5db;border-radius:999px;">${esc(
      copy.audienceSecondary
    )} audience</span>
  </p>
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
  const hello = greeting(opts.firstName, opts.businessName);
  const free = freePlanLine();
  const text = [
    hello,
    "",
    copy.headline,
    "",
    ...copy.body,
    "",
    `${copy.formHeadline}`,
    `Your ${copy.audiencePrimary} list`,
    "Email: you@example.com",
    copy.buttonLabel,
    `${copy.audiencePrimary} audience · ${copy.audienceSecondary} audience`,
    "",
    "Build your signup tool:",
    opts.ctaUrl,
    "",
    free,
    "",
    "Casey",
    "SendFable",
    "",
    `Unsubscribe: ${opts.unsubUrl}`,
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
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151;">${esc(hello)}</p>
  <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:600;color:#17213B;font-family:Georgia,'Times New Roman',serif;">${esc(
    copy.headline
  )}</h1>
  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${esc(copy.body[0] || "")}</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">${esc(copy.body[1] || "")}</p>
  ${signupToolPreviewHtml(copy)}
  <p style="margin:22px 0 0;">
    <a href="${esc(opts.ctaUrl)}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#e11d48;">Build your signup tool</a>
  </p>
  <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">${esc(free)}</p>
</td></tr>
<tr><td style="padding-top:18px;">
  <p style="margin:0 0 6px;font-size:13px;color:#17213B;">SendFable</p>
  <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:#6b7280;"><a href="${esc(
    opts.unsubUrl
  )}" style="color:#6b7280;">Unsubscribe</a></p>
  <p style="margin:0;font-size:11px;line-height:1.45;color:#9ca3af;">Legal: iScream Studio INC</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return { subject: copy.subject, html, text, copy };
}
