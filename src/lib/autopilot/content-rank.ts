/**
 * Rank website change candidates for Scribe campaign quality.
 * Diff detection alone is never enough — only campaign-worthy updates become drafts.
 */

export type RankedCandidate = {
  title: string;
  body: string;
  sourceHint: string;
  score: number;
  reasons: string[];
  ephemeral: boolean;
};

export type ContentRankResult =
  | {
      ok: true;
      candidate: RankedCandidate;
      reason: string;
    }
  | {
      ok: false;
      reason: "no_strong_campaign";
      detail: string;
      rejected: Array<{ title: string; score: number; reasons: string[] }>;
    };

const EXCLUDE =
  /\b(cookie|privacy policy|terms of (use|service)|all rights reserved|powered by|skip to content|subscribe to our newsletter|follow us on|instagram|facebook|twitter|tiktok|affiliate|sponsored)\b/i;

const SEASON_STATUS =
  /\b(published season closed|season (is )?closed|mooring season|official boating season|season dates?\b|harbor season)\b/i;

const EPHEMERAL =
  /\b(small craft advisory|marine (warning|watch|alert)|gale warning|weather (now|alert|advisory)|live conditions|current conditions|boating conditions|conditions summary|wind\s+\d+\s*mph|waves?\s*[~≈]?\s*\d|conditions:\s*caution|active advisory|buoy|nearshore update|observed wind|today on the water)\b/i;

const NAV_NOISE =
  /\b(home|about|contact|menu|cart|log ?in|sign ?in|search|navigation)\b/i;

const SUBSTANCE =
  /\b(guide|how to|tips?|update|news|story|report|summary|training|workshop|award|curriculum|research|meeting|registration|haul-?out|winter storage|shrink wrap|off-season|marina|harbor|fishing|sturgeon|climate|shipwreck|conservation|event|special|class|workshop|release|announc)\b/i;

const STRONG_HEADLINE =
  /\b(case of|climate summary|training|award|registration|haul-?out|winter storage|sturgeon|educators?|proposals?|spotter|shipwreck)\b/i;

const GENERIC_SITE_TAGLINE =
  /\b(your guide to|welcome to|explore (boating|our|resources)|plan a day|destinations?,\s*lakes|winterization hub|live from noaa|read at\b|full weather|boating weather\s*&\s*alerts|southern lake michigan|boating news$|recent updates|featured|topics|latest boating news)\b/i;

const NAV_CRUMB = /\s*(?:→|›|»|\||•)\s*/;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function isDateOnly(line: string): boolean {
  return /^(?:\d{4}-\d{2}-\d{2}|\w+ \d{1,2},?\s+\d{4}|may\s+\d|october\s+\d)(?:\s*[–—-]\s*(?:\d{4}-\d{2}-\d{2}|\w+ \d{1,2},?\s+\d{4}|may\s+\d|october\s+\d))?$/i.test(
    line
  );
}

function isTiny(line: string): boolean {
  return line.length < 18;
}

/** Split added/page text into candidate blocks (title + nearby body). */
export function extractCandidates(text: string): RankedCandidate[] {
  const lines = text
    .split(/\n+/)
    .flatMap((raw) =>
      cleanLine(raw)
        .split(NAV_CRUMB)
        .map(cleanLine)
        .filter(Boolean)
    )
    .filter((l) => l.length > 0 && !EXCLUDE.test(l));

  const out: RankedCandidate[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTiny(line) || isDateOnly(line)) continue;
    if (GENERIC_SITE_TAGLINE.test(line)) continue;
    // Prefer title-like lines (not ending in period, moderate length)
    const titleLike =
      line.length >= 18 &&
      line.length <= 140 &&
      !/[.!?]$/.test(line) &&
      !/^caution\b/i.test(line);
    if (!titleLike && line.length < 40) continue;

    const bodyParts: string[] = [];
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j];
      if (isDateOnly(next)) continue;
      if (next.length < 12) continue;
      if (GENERIC_SITE_TAGLINE.test(next)) continue;
      bodyParts.push(next);
      if (bodyParts.join(" ").length > 320) break;
    }
    const body = bodyParts.join(" ").slice(0, 500);
    const blob = `${line} ${body}`;
    out.push({
      title: line.slice(0, 120),
      body,
      sourceHint: line.slice(0, 80),
      score: 0,
      reasons: [],
      ephemeral: EPHEMERAL.test(blob),
    });
  }

  // Dedupe by normalized title
  const seen = new Set<string>();
  return out.filter((c) => {
    const key = c.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scoreCandidate(
  candidate: RankedCandidate,
  opts?: { now?: Date; addedText?: string }
): RankedCandidate {
  const now = opts?.now ?? new Date();
  const blob = `${candidate.title} ${candidate.body}`;
  let score = 0;
  const reasons: string[] = [];

  // Hard exclusions / heavy penalties
  if (EXCLUDE.test(blob) || NAV_NOISE.test(candidate.title)) {
    return { ...candidate, score: -100, reasons: ["boilerplate_or_nav"], ephemeral: candidate.ephemeral };
  }
  if (SEASON_STATUS.test(blob) && !/\b(haul-?out|winter storage|shrink wrap|off-season guide)\b/i.test(blob)) {
    return { ...candidate, score: -80, reasons: ["season_status_calendar"], ephemeral: false };
  }
  if (/\bpublished season closed\b/i.test(blob)) {
    return { ...candidate, score: -100, reasons: ["published_season_closed"], ephemeral: false };
  }
  if (GENERIC_SITE_TAGLINE.test(candidate.title)) {
    return { ...candidate, score: -40, reasons: ["generic_site_tagline"], ephemeral: false };
  }
  if (isDateOnly(candidate.title) || /^20\d{2}-\d{2}-\d{2}/.test(candidate.title)) {
    return { ...candidate, score: -90, reasons: ["date_only_title"], ephemeral: candidate.ephemeral };
  }

  // Newness / presence in the actual diff
  if (opts?.addedText) {
    const added = opts.addedText.toLowerCase();
    const titleHit = candidate.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .some((w) => added.includes(w));
    if (titleHit) {
      score += 18;
      reasons.push("present_in_diff");
    } else {
      score -= 8;
      reasons.push("not_in_diff");
    }
  }

  // Substance & usefulness
  if (SUBSTANCE.test(blob)) {
    score += 16;
    reasons.push("substance");
  }
  if (STRONG_HEADLINE.test(candidate.title)) {
    score += 12;
    reasons.push("strong_headline");
  }
  // Prefer concrete story/article titles over nav labels / conditions blurbs
  if (
    /\b(case of|climate summary|october 20\d{2}|training|award|sturgeon|educators?|proposals?|shipwreck|curriculum|haul-?out|winter storage)\b/i.test(
      candidate.title
    )
  ) {
    score += 14;
    reasons.push("story_title");
  }
  if (
    /^(upcoming|storage|menu|home|news|weather now|boatingchicago weather)\b/i.test(
      candidate.title
    ) ||
    /\bweather\s*·/i.test(candidate.title)
  ) {
    score -= 18;
    reasons.push("section_label");
  }
  if (candidate.body.length >= 80) {
    score += 10;
    reasons.push("supporting_body");
  } else if (candidate.body.length >= 30) {
    score += 4;
  } else {
    score -= 6;
    reasons.push("thin_body");
  }
  if (candidate.title.length >= 28 && candidate.title.length <= 90) {
    score += 6;
    reasons.push("good_title_length");
  }

  // Recency signals in text (month/year near now)
  const year = now.getUTCFullYear();
  if (new RegExp(String(year)).test(blob) || new RegExp(String(year - 0)).test(blob)) {
    score += 4;
    reasons.push("current_year");
  }
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const thisMonth = monthNames[now.getUTCMonth()];
  const prevMonth = monthNames[(now.getUTCMonth() + 11) % 12];
  if (blob.toLowerCase().includes(thisMonth) || blob.toLowerCase().includes(prevMonth)) {
    score += 6;
    reasons.push("recent_month");
  }

  // Ephemeral: driven by the title (body often sits next to a weather widget).
  let ephemeral = EPHEMERAL.test(candidate.title);
  if (!ephemeral && EPHEMERAL.test(blob) && candidate.title.length < 40) {
    ephemeral = true;
  }
  if (ephemeral) {
    score -= 35;
    reasons.push("ephemeral_weather_or_advisory");
  }

  // Shelf life — expired / closed language
  if (/\b(closed|ended|expired|cancelled|canceled)\b/i.test(blob) && !/\bhaul-?out|winter\b/i.test(blob)) {
    score -= 20;
    reasons.push("expired_or_closed");
  }

  // Audience relevance for local/business sites
  if (/\b(chicago|lake michigan|harbor|marina|boating|boat(er|ing)?)\b/i.test(blob)) {
    score += 8;
    reasons.push("audience_relevance");
  }

  return { ...candidate, score, reasons, ephemeral };
}

const MIN_SCORE = 22;

/**
 * Pick the best campaign-worthy candidate from page/diff text.
 * Returns no_strong_campaign when nothing clears the bar.
 */
export function rankCampaignContent(opts: {
  pageText: string;
  addedText: string;
  htmlHeadings?: string[];
  now?: Date;
}): ContentRankResult {
  const headingBlock = (opts.htmlHeadings || []).join("\n");
  const poolText = [opts.addedText, headingBlock, opts.pageText]
    .filter(Boolean)
    .join("\n");
  const raw = extractCandidates(poolText);
  const scored = raw
    .map((c) => scoreCandidate(c, { now: opts.now, addedText: opts.addedText }))
    .sort((a, b) => b.score - a.score);

  const durable = scored.filter((c) => !c.ephemeral && c.score >= MIN_SCORE);
  const pick = durable[0] || scored.find((c) => c.score >= MIN_SCORE + 15); // ephemeral only if exceptionally strong + no durable

  if (!pick || pick.score < MIN_SCORE) {
    return {
      ok: false,
      reason: "no_strong_campaign",
      detail: "No strong campaign-worthy update found this cycle.",
      rejected: scored.slice(0, 8).map((c) => ({
        title: c.title,
        score: c.score,
        reasons: c.reasons,
      })),
    };
  }

  // Prefer candidate that overlaps the diff when scores are close
  let chosen = pick;
  if (opts.addedText && durable.length > 1) {
    const inDiff = durable.find(
      (c) =>
        c.score >= pick.score - 8 &&
        c.reasons.includes("present_in_diff")
    );
    if (inDiff) chosen = inDiff;
  }

  return {
    ok: true,
    candidate: chosen,
    reason: chosen.reasons.includes("present_in_diff")
      ? "ranked_diff_candidate"
      : "ranked_page_candidate",
  };
}

/** Build the fact pack passed to the extractive/LLM generator. */
export function factsFromCandidate(candidate: RankedCandidate): string {
  const lines = [candidate.title];
  if (candidate.body) lines.push(candidate.body);
  return lines.join("\n");
}

export function isSeasonStatusJunk(text: string): boolean {
  return (
    /\bpublished season closed\b/i.test(text) ||
    (SEASON_STATUS.test(text) && !/\b(haul-?out|winter storage|shrink wrap)\b/i.test(text))
  );
}
