/**
 * Read-only Scribe quality preview against the live BoatingChicago site.
 * Does NOT write to the DB and does NOT send a campaign.
 *
 * Usage: npx tsx scripts/scribe-boatingchicago-preview.ts
 */
import { extractHtmlHeadings, htmlToVisibleText } from "../src/lib/autopilot/extract";
import { assessChange } from "../src/lib/autopilot/change-filter";
import {
  factsFromCandidate,
  rankCampaignContent,
} from "../src/lib/autopilot/content-rank";
import { generateExtractive } from "../src/lib/autopilot/generate";
import { selectScribeCampaignImage } from "../src/lib/autopilot/campaign-image";

const URLS = [
  "https://boatingchicago.com",
  "https://boatingchicago.com/news",
];

async function fetchText(url: string): Promise<{ url: string; html: string; text: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SendFable-ScribePreview/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const html = await res.text();
  return { url: res.url || url, html, text: htmlToVisibleText(html) };
}

async function main() {
  console.log("=== SCRIBE BOATINGCHICAGO PREVIEW (no send) ===");
  const pages = [];
  for (const u of URLS) {
    pages.push(await fetchText(u));
  }

  // Simulate a prior snapshot that lacked current news stories but had season-status noise.
  const prev =
    "Your Guide to Boating Chicago\nSeason dates May 1 – October 31, 2026 · Published season closed\nChicago Harbors Mooring Season\nExplore Boating";
  const home = pages[0];
  const news = pages[1] || pages[0];
  const primary = news;
  const pageText = `${home.text}\n\n${news.text}`;

  const assessment = assessChange(prev, pageText);
  console.log("change.meaningful=", assessment.meaningful, "reason=", assessment.reason);

  const ranked = rankCampaignContent({
    pageText,
    addedText: assessment.addedText || news.text.slice(0, 4000),
    htmlHeadings: extractHtmlHeadings(primary.html),
    now: new Date(),
  });

  if (!ranked.ok) {
    console.log("RESULT=NO_STRONG_UPDATE");
    console.log("detail=", ranked.detail);
    console.log("rejected=", JSON.stringify(ranked.rejected, null, 2));
    return;
  }

  const facts = factsFromCandidate(ranked.candidate);
  const generated = generateExtractive({
    addedText: facts,
    sourceUrl: primary.url,
    workspaceName: "BoatingChicago",
    reason: ranked.reason,
  });
  const image = selectScribeCampaignImage({
    html: primary.html,
    pageUrl: primary.url,
    title: ranked.candidate.title,
    body: ranked.candidate.body,
  });

  console.log("RESULT=CANDIDATE");
  console.log("selectedSourceUrl=", primary.url);
  console.log("selectedTitle=", ranked.candidate.title);
  console.log("whyRanked=", ranked.candidate.reasons.join(", "));
  console.log("score=", ranked.candidate.score);
  console.log("subject=", generated?.subject || "(none)");
  console.log("headline=", generated?.headline || "(none)");
  console.log("preview=", (generated?.preheader || ranked.candidate.body).slice(0, 180));
  console.log("cta=", generated?.ctaHref || primary.url);
  console.log(
    "image=",
    image.imageUrl || "NONE",
    "type=",
    image.imageSourceType
  );
  console.log(
    "avoidsSeasonClosed=",
    !/Published season closed|Season dates May 1/i.test(
      `${ranked.candidate.title} ${generated?.subject || ""}`
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
