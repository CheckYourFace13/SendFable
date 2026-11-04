/**
 * Campaign content generation from watched-page changes.
 * Default: extractive (no AI cost). Optional low-cost LLM polish when configured.
 * NEVER invents prices, dates, offers, or claims not present in source text.
 * Reads like a short newsletter — never raw website-diff language.
 */

import { extractHeadings } from "@/lib/autopilot/extract";
import { isSeasonStatusJunk } from "@/lib/autopilot/content-rank";
import { AUTOPILOT_MAX_BODY_CHARS } from "@/lib/autopilot/types";

export type GeneratedCampaign = {
  subject: string;
  preheader: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  goal: "sale" | "announce" | "news";
  templateSlug: string | null;
  explanation: string;
  model: string;
  costMicros: number;
};

const SALE =
  /\b(sale|special|specials|discount|% off|promo|promotion|happy hour|limited time|offer)\b/i;
const EVENT =
  /\b(event|events|tickets?|register|registration|fundraiser|tonight|this weekend|live music|class|workshop|training)\b/i;
const PRODUCT =
  /\b(new\s+(beer|brew|release|product|menu|service|listing)|now available|just dropped|launch)\b/i;

function classifyGoal(text: string): GeneratedCampaign["goal"] {
  if (SALE.test(text)) return "sale";
  if (EVENT.test(text)) return "sale";
  if (PRODUCT.test(text)) return "announce";
  return "news";
}

function pickTemplate(goal: GeneratedCampaign["goal"], text: string): string | null {
  if (/\b(beer|brew|ipa|lager|tap)\b/i.test(text)) return "platform-brewery-release";
  if (/\b(menu|dinner|lunch|brunch|restaurant|chef)\b/i.test(text)) return "platform-restaurant-special";
  if (EVENT.test(text)) return "platform-event-invite";
  if (goal === "sale") return "platform-retail-sale";
  if (goal === "announce") return "platform-product-announce";
  return "platform-newsletter";
}

function pickCta(goal: GeneratedCampaign["goal"], text: string): string {
  if (EVENT.test(text)) return "Get details";
  if (SALE.test(text)) return "See the offer";
  if (PRODUCT.test(text)) return "See what's new";
  if (/\b(guide|tips?|how to|haul-?out|winter)\b/i.test(text)) return "Read the guide";
  return "Read the update";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphsFromAdded(addedText: string): string[] {
  const chunks = addedText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && !isSeasonStatusJunk(l));
  const out: string[] = [];
  let buf = "";
  for (const line of chunks) {
    if (buf.length + line.length > 220) {
      if (buf) out.push(buf);
      buf = line;
    } else {
      buf = buf ? `${buf} ${line}` : line;
    }
    if (out.length >= 4) break;
  }
  if (buf && out.length < 4) out.push(buf);
  return out;
}

function whyItMatters(text: string, workspaceName: string): string {
  if (/\b(haul-?out|winter storage|shrink wrap|off-season)\b/i.test(text)) {
    return "Worth a look before harbor yards fill up for the off-season.";
  }
  if (/\b(advisory|warning|weather|conditions)\b/i.test(text)) {
    return "Conditions change quickly — check the details before you head out.";
  }
  if (/\b(training|workshop|class|registration)\b/i.test(text)) {
    return "A practical update if you or your crew want to stay sharp.";
  }
  if (/\b(guide|tips?|how to)\b/i.test(text)) {
    return `A useful read from ${workspaceName}.`;
  }
  return `Here’s what ${workspaceName} wants you to know.`;
}

function cleanHeadline(raw: string): string {
  return raw
    .replace(/\bPublished season closed\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[·|]\s*$/g, "")
    .trim();
}

/** Extractive generator — only uses text present in `addedText`. */
export function generateExtractive(opts: {
  addedText: string;
  sourceUrl: string;
  workspaceName: string;
  reason: string;
}): GeneratedCampaign | null {
  const { addedText, sourceUrl, workspaceName } = opts;
  const cleaned = addedText.trim();
  if (cleaned.length < 24) return null;
  if (isSeasonStatusJunk(cleaned) && cleaned.length < 280) return null;

  const headings = extractHeadings(cleaned).map(cleanHeadline).filter((h) => h.length >= 6);
  const headline = (headings[0] || cleanHeadline(cleaned.split("\n")[0] || "")).slice(0, 90).trim();
  if (headline.length < 6) return null;
  if (isSeasonStatusJunk(headline)) return null;

  const goal = classifyGoal(cleaned);
  const paras = paragraphsFromAdded(cleaned).filter((p) => !isSeasonStatusJunk(p));
  if (!paras.length) return null;

  const intro = `Hi {{first_name|there}},`;
  const lead = paras[0].slice(0, 400);
  const detail = paras.slice(1, 3).map((p) => p.slice(0, 400));
  const care = whyItMatters(cleaned, workspaceName);

  let body =
    `<p>${escapeHtml(intro)}</p>` +
    `<p>${escapeHtml(lead)}</p>` +
    detail.map((p) => `<p>${escapeHtml(p)}</p>`).join("") +
    `<p>${escapeHtml(care)}</p>` +
    `<p>Read the full update on the site.</p>`;
  if (body.length > AUTOPILOT_MAX_BODY_CHARS) {
    body = body.slice(0, AUTOPILOT_MAX_BODY_CHARS);
  }

  const subject = headline.length <= 70 ? headline : `${headline.slice(0, 67)}…`;
  const preheader = (paras[0] || care).slice(0, 110);

  return {
    subject,
    preheader,
    headline,
    bodyHtml: body,
    ctaLabel: pickCta(goal, cleaned),
    ctaHref: sourceUrl,
    goal,
    templateSlug: pickTemplate(goal, cleaned),
    explanation: headline.slice(0, 120),
    model: "extractive-v2",
    costMicros: 0,
  };
}

type LlmJson = {
  subject?: string;
  preheader?: string;
  headline?: string;
  bodyParagraphs?: string[];
  ctaLabel?: string;
};

/**
 * Optional LLM polish. Strict: only rewrite using provided facts; no invention.
 * Returns null if API unavailable or response unsafe.
 */
export async function generateWithOptionalLlm(opts: {
  addedText: string;
  sourceUrl: string;
  workspaceName: string;
  reason: string;
}): Promise<GeneratedCampaign | null> {
  const base = generateExtractive(opts);
  if (!base) return null;

  const apiKey = process.env.AUTOPILOT_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.AUTOPILOT_LLM_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
  const model = process.env.AUTOPILOT_LLM_MODEL || "gpt-4o-mini";
  if (!apiKey || process.env.AUTOPILOT_LLM_ENABLED === "false") {
    return base;
  }

  const facts = opts.addedText.slice(0, 3500);
  const prompt = `You write short newsletter email drafts for small businesses.
Use ONLY facts explicitly present in FACTS below. Do not invent prices, dates, discounts, inventory, or claims.
Structure: useful subject, strong headline, short intro, main update, why the reader should care.
Never use raw website-diff language like "New content found" or "Published season closed" as the story.
If facts are insufficient or only season-status/boilerplate, return {"insufficient":true}.
Return JSON: {"subject":"...","preheader":"...","headline":"...","bodyParagraphs":["..."],"ctaLabel":"..."}
FACTS:\n${facts}\nSOURCE:${opts.sourceUrl}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return only valid JSON. Never invent facts." },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return base;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return base;
    const parsed = JSON.parse(content) as LlmJson & { insufficient?: boolean };
    if (parsed.insufficient) return null;

    // Validate every sentence fragment appears (loosely) in facts — reject invention
    const factsLower = facts.toLowerCase();
    const candidates = [
      ...(parsed.bodyParagraphs || []),
      parsed.headline || "",
      parsed.subject || "",
    ].filter(Boolean);
    for (const c of candidates) {
      const words = c
        .toLowerCase()
        .replace(/[^a-z0-9\s$%]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4);
      const novel = words.filter((w) => !factsLower.includes(w));
      if (novel.length > Math.max(3, Math.floor(words.length * 0.45))) {
        return base; // too much novel wording — keep extractive
      }
    }

    const paras = (parsed.bodyParagraphs || []).slice(0, 4);
    if (!paras.length) return base;
    if (isSeasonStatusJunk(parsed.headline || "") || isSeasonStatusJunk(parsed.subject || "")) {
      return base;
    }

    const bodyHtml =
      `<p>Hi {{first_name|there}},</p>` +
      paras.map((p) => `<p>${escapeHtml(p.slice(0, 400))}</p>`).join("") +
      `<p>Read the full update on the site.</p>`;

    const tokens = json.usage?.total_tokens ?? 800;
    const costMicros = Math.round((tokens / 1_000_000) * 400_000);

    return {
      ...base,
      subject: (parsed.subject || base.subject).slice(0, 90),
      preheader: (parsed.preheader || base.preheader).slice(0, 140),
      headline: (parsed.headline || base.headline).slice(0, 90),
      bodyHtml,
      ctaLabel: (parsed.ctaLabel || base.ctaLabel).slice(0, 40),
      explanation: (parsed.headline || base.headline).slice(0, 120),
      model,
      costMicros,
    };
  } catch {
    return base;
  }
}
