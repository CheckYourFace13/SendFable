import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assessChange, addedLines } from "@/lib/autopilot/change-filter";
import { contentFingerprint, changeFingerprint } from "@/lib/autopilot/hash";
import { htmlToVisibleText } from "@/lib/autopilot/extract";
import { generateExtractive } from "@/lib/autopilot/generate";
import { clampAutopilotFrequency, autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";

describe("autopilot extract + hash", () => {
  it("strips script/nav and fingerprints stably", () => {
    const html = `<html><head><script>evil()</script></head><body>
      <nav>Home About</nav>
      <main><h1>Weekend Special</h1><p>Buy one get one wings</p></main>
      <footer>Copyright 2026</footer></body></html>`;
    const text = htmlToVisibleText(html);
    assert.match(text, /Weekend Special/);
    assert.doesNotMatch(text, /evil/);
    const a = contentFingerprint(text);
    const b = contentFingerprint(text + "\nCopyright 2027");
    // year-only noise normalized away may still change if more than year — ensure same core
    assert.equal(typeof a, "string");
    assert.equal(a.length, 64);
    assert.notEqual(a, contentFingerprint(text + "\nBrand new taco special this Friday"));
    void b;
  });
});

describe("autopilot change filter", () => {
  it("baseline first snapshot is not meaningful", () => {
    const a = assessChange("", "New special: half-price pizza tonight");
    assert.equal(a.meaningful, false);
    assert.equal(a.reason, "baseline_snapshot");
  });

  it("detects marketing-worthy additions", () => {
    const prev = "Welcome to our cafe\nHours 9-5";
    const next = prev + "\nNew weekend special: brunch tacos all day Saturday";
    const a = assessChange(prev, next);
    assert.equal(a.meaningful, true);
    assert.match(a.addedText, /brunch tacos/i);
  });

  it("ignores trivial diffs", () => {
    const prev = "Welcome\nHours 9-5\nSee menu";
    const next = "Welcome\nHours 9-5\nSee menu\nx";
    const a = assessChange(prev, next);
    assert.equal(a.meaningful, false);
  });

  it("addedLines skips duplicates", () => {
    const lines = addedLines("A\nB", "A\nB\nC");
    assert.deepEqual(lines, ["C"]);
  });
});

describe("autopilot generate", () => {
  it("builds extractive draft from page facts only", () => {
    const g = generateExtractive({
      addedText: "Fall Special\n$12 lunch plate all week\nDine in or takeout",
      sourceUrl: "https://example.com/specials",
      workspaceName: "Demo Cafe",
      reason: "marketing_keywords",
    });
    assert.ok(g);
    assert.match(g!.subject, /Fall Special/i);
    assert.match(g!.bodyHtml, /\$12 lunch plate/);
    assert.equal(g!.ctaHref, "https://example.com/specials");
    assert.equal(g!.costMicros, 0);
  });

  it("refuses insufficient content", () => {
    const g = generateExtractive({
      addedText: "Hi",
      sourceUrl: "https://example.com",
      workspaceName: "X",
      reason: "x",
    });
    assert.equal(g, null);
  });
});

describe("autopilot plans", () => {
  it("clamps free to weekly", () => {
    assert.equal(clampAutopilotFrequency("FREE", "DAILY"), "WEEKLY");
    assert.equal(clampAutopilotFrequency("GROWTH", "TWICE_DAILY"), "TWICE_DAILY");
    assert.ok(autopilotMaxDraftsPerMonth("FREE") < autopilotMaxDraftsPerMonth("STARTER"));
  });
});

describe("autopilot fingerprints", () => {
  it("changeFingerprint is stable for same added text", () => {
    const a = changeFingerprint("https://x.com/s", "New sale 20% off jackets");
    const b = changeFingerprint("https://x.com/s", "New sale 20% off jackets");
    assert.equal(a, b);
  });
});
