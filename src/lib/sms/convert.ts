/**
 * Deterministic Email ⇄ Text conversion. No external AI API required.
 *
 * Hard rule: conversions only rearrange content that ALREADY EXISTS in the
 * source (subject, preview, headings, visible copy, CTA, dates, business
 * name). They never fabricate offers, deadlines, discounts, events or prices.
 * Output is always a DRAFT — nothing generated here can auto-send.
 */

import { calculateSegments, GSM7_SINGLE_SEGMENT_LIMIT } from "@/lib/sms/segments";

// ─── Email → Text ─────────────────────────────────────────────────────────────

export interface EmailToTextInput {
  subject: string | null;
  previewText: string | null;
  compiledHtml: string | null;
  businessName: string;
  /** Primary CTA URL if known (first tracked link) */
  ctaUrl?: string | null;
  ctaLabel?: string | null;
}

export interface EmailToTextResult {
  body: string;
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  /** True when we could not fit a single segment */
  multiSegment: boolean;
}

/** Strip HTML to visible text (deterministic, dependency-free). */
export function htmlToVisibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** First heading (h1–h3) text from compiled HTML, if any. */
export function firstHeading(html: string): string | null {
  const m = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!m) return null;
  const text = htmlToVisibleText(m[1]);
  return text || null;
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/**
 * Build an SMS draft from an email campaign. Prefers one GSM-7 segment where
 * practical: business name + strongest existing line + CTA URL.
 */
export function emailToText(input: EmailToTextInput): EmailToTextResult {
  const heading = input.compiledHtml ? firstHeading(input.compiledHtml) : null;
  const headline = (heading || input.subject || input.previewText || "").trim();

  const parts: string[] = [];
  if (input.businessName.trim()) parts.push(`${input.businessName.trim()}:`);
  if (headline) parts.push(headline);
  else if (input.compiledHtml) {
    const body = htmlToVisibleText(input.compiledHtml);
    const firstLine = body.split("\n").find((l) => l.trim().length > 0) ?? "";
    if (firstLine) parts.push(truncateAtWord(firstLine.trim(), 120));
  }

  const cta = input.ctaUrl?.trim();
  const ctaLabel = input.ctaLabel?.trim();
  const ctaPart = cta ? (ctaLabel ? `${ctaLabel}: ${cta}` : cta) : "";

  let body = parts.join(" ").trim();

  // Fit within one segment where practical (leave room for the CTA).
  const budget = GSM7_SINGLE_SEGMENT_LIMIT - (ctaPart ? ctaPart.length + 1 : 0);
  if (body.length > budget && budget > 20) {
    body = truncateAtWord(body, budget);
  }
  if (ctaPart) body = `${body} ${ctaPart}`.trim();

  const info = calculateSegments(body);
  return {
    body,
    encoding: info.encoding,
    segments: info.segments,
    multiSegment: info.segments > 1,
  };
}

// ─── Text → Email ─────────────────────────────────────────────────────────────

export interface TextToEmailInput {
  smsBody: string;
  businessName: string;
}

export interface TextToEmailResult {
  suggestedSubject: string;
  previewText: string;
  headline: string;
  bodyText: string;
  ctaUrl: string | null;
  ctaLabel: string;
}

const URL_RE = /https?:\/\/[^\s]+/i;

/**
 * Expand an SMS draft into email building blocks. The campaign editor applies
 * the workspace's existing brand styling and standard footer on top.
 */
export function textToEmail(input: TextToEmailInput): TextToEmailResult {
  const raw = input.smsBody.trim();
  const urlMatch = raw.match(URL_RE);
  const ctaUrl = urlMatch ? urlMatch[0].replace(/[).,!?]+$/, "") : null;
  let text = raw.replace(URL_RE, "").replace(/\s+/g, " ").trim();

  // Drop a leading "Business:" prefix if it mirrors the business name.
  const prefix = `${input.businessName.trim()}:`;
  if (prefix.length > 1 && text.toLowerCase().startsWith(prefix.toLowerCase())) {
    text = text.slice(prefix.length).trim();
  }

  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const headline = truncateAtWord(sentences[0] ?? text, 80).replace(/[.!?…]+$/, "");
  const subject = truncateAtWord(headline, 60);
  const preview = truncateAtWord(sentences.slice(1).join(" ") || headline, 90);

  return {
    suggestedSubject: subject || `News from ${input.businessName}`,
    previewText: preview,
    headline: headline || `News from ${input.businessName}`,
    bodyText: text,
    ctaUrl,
    ctaLabel: ctaUrl ? "Learn more" : "",
  };
}
