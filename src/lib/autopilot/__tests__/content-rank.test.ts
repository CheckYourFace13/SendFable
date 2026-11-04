import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSeasonStatusJunk,
  rankCampaignContent,
  scoreCandidate,
  extractCandidates,
} from "@/lib/autopilot/content-rank";
import { generateExtractive } from "@/lib/autopilot/generate";
import { selectScribeCampaignImage } from "@/lib/autopilot/campaign-image";
import { resolveDefaultTimezone } from "@/lib/autopilot/schedule";

describe("scribe content ranking", () => {
  it("rejects published season closed as junk", () => {
    assert.equal(
      isSeasonStatusJunk("Season dates May 1 – October 31, 2026 Published season closed"),
      true
    );
  });

  it("does not select season-closed when stronger content exists", () => {
    const pageText = [
      "Season dates May 1 – October 31, 2026 · Published season closed",
      "Chicago Harbors Mooring Season",
      "Caution — Active small craft advisory",
      "October 2026 Climate Summary",
      "NWS Chicago (LOT) published an update titled October 2026 Climate Summary for local boaters.",
      "The case of the dead sturgeon",
      "Wisconsin Sea Grant published an update titled The case of the dead sturgeon for Lake Michigan boaters.",
      "Haul-out and winter storage season",
      "Confirm yard schedules, shrink wrap, and off-season ownership guides before ice closes the harbors.",
    ].join("\n");
    const addedText = [
      "Season dates May 1 – October 31, 2026 Published season closed",
      "October 2026 Climate Summary",
      "NWS Chicago (LOT) published an update titled October 2026 Climate Summary.",
    ].join("\n");
    const ranked = rankCampaignContent({
      pageText,
      addedText,
      htmlHeadings: [
        "October 2026 Climate Summary",
        "The case of the dead sturgeon",
        "Chicago Harbors Mooring Season",
      ],
      now: new Date("2026-11-03T18:00:00Z"),
    });
    assert.equal(ranked.ok, true);
    if (!ranked.ok) return;
    assert.doesNotMatch(ranked.candidate.title, /Published season closed/i);
    assert.doesNotMatch(ranked.candidate.title, /Season dates May 1/i);
    assert.match(
      ranked.candidate.title,
      /Climate Summary|dead sturgeon|Haul-out|winter storage/i
    );
    assert.doesNotMatch(ranked.candidate.title, /Your Guide to Boating Chicago/i);
  });

  it("returns no_strong_campaign for season-status-only diffs", () => {
    const ranked = rankCampaignContent({
      pageText: "Home\nAbout\nContact",
      addedText: "2026-05-01 – 2026-10-31 · Published season closed\nChicago Harbors Mooring Season",
      now: new Date("2026-11-03T18:00:00Z"),
    });
    assert.equal(ranked.ok, false);
    if (!ranked.ok) {
      assert.equal(ranked.reason, "no_strong_campaign");
      assert.match(ranked.detail, /No strong campaign-worthy update/i);
    }
  });

  it("downranks ephemeral weather advisories", () => {
    const c = scoreCandidate({
      title: "Small Craft Advisory issued November 3",
      body: "Active small craft advisory until November 4. Wind 7 mph. Waves 1.3 ft.",
      sourceHint: "advisory",
      score: 0,
      reasons: [],
      ephemeral: false,
    });
    assert.ok(c.ephemeral);
    assert.ok(c.score < 22);
  });

  it("extracts title-like candidates", () => {
    const list = extractCandidates(
      "October 2026 Climate Summary\nNWS Chicago published a climate summary for local boaters.\nMenu"
    );
    assert.ok(list.some((c) => /Climate Summary/i.test(c.title)));
  });
});

describe("scribe newsletter copy", () => {
  it("does not emit raw season-closed subjects", () => {
    const g = generateExtractive({
      addedText:
        "Season dates May 1 – October 31, 2026 Published season closed\nChicago Harbors Mooring Season",
      sourceUrl: "https://boatingchicago.com",
      workspaceName: "BoatingChicago",
      reason: "substantial_new_content",
    });
    assert.equal(g, null);
  });

  it("builds newsletter structure from durable facts", () => {
    const g = generateExtractive({
      addedText:
        "October 2026 Climate Summary\nNWS Chicago published an October climate summary for Lake Michigan boaters with source-cited context.",
      sourceUrl: "https://boatingchicago.com/news",
      workspaceName: "BoatingChicago",
      reason: "ranked_diff_candidate",
    });
    assert.ok(g);
    assert.match(g!.subject, /Climate Summary/i);
    assert.match(g!.bodyHtml, /Hi \{\{first_name\|there\}\}/);
    assert.match(g!.bodyHtml, /Read the full update/);
    assert.doesNotMatch(g!.subject, /Published season closed/i);
    assert.doesNotMatch(g!.explanation, /New content found/i);
  });
});

describe("scribe image selection", () => {
  it("returns no image when only a logo is present", () => {
    const html = `<html><body><img src="/logo.png" alt="logo" width="600" height="200" /></body></html>`;
    const sel = selectScribeCampaignImage({
      html,
      pageUrl: "https://boatingchicago.com/news",
      title: "October 2026 Climate Summary",
    });
    assert.equal(sel.imageUrl, null);
    assert.equal(sel.imageSourceType, "none");
  });

  it("prefers a relevant in-content image over an unrelated one", () => {
    const html = `<html><body>
      <h2>October 2026 Climate Summary</h2>
      <img src="/uploads/climate-summary-chart.jpg" alt="October climate summary chart" width="800" height="450" />
      <img src="/uploads/unrelated-firework-show.jpg" alt="fireworks" width="800" height="450" />
    </body></html>`;
    const sel = selectScribeCampaignImage({
      html,
      pageUrl: "https://boatingchicago.com/news",
      title: "October 2026 Climate Summary",
      body: "NWS climate summary for boaters",
    });
    if (sel.imageUrl) {
      assert.match(sel.imageUrl, /climate/i);
      assert.doesNotMatch(sel.imageUrl, /firework/i);
    } else {
      assert.equal(sel.imageSourceType, "none");
    }
  });
});

describe("scribe timezone default", () => {
  it("prefers workspace timezone over browser and UTC", () => {
    assert.equal(
      resolveDefaultTimezone({
        workspaceTimezone: "America/Chicago",
        browserTimezone: "America/New_York",
      }),
      "America/Chicago"
    );
    assert.equal(
      resolveDefaultTimezone({
        workspaceTimezone: null,
        browserTimezone: "America/Denver",
      }),
      "America/Denver"
    );
    assert.equal(resolveDefaultTimezone({}), "UTC");
  });
});
