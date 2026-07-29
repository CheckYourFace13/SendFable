import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COMPETITORS,
  listPublicCompetitors,
  competitorFreshnessReport,
  COMPARISON_DISCLAIMER,
  isPricingStale,
} from "@/data/competitors";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";
import { competitorPricing } from "@/data/competitor-pricing";

describe("competitor catalog (SF-002)", () => {
  it("requires lastChecked and sources on every public competitor", () => {
    for (const c of listPublicCompetitors()) {
      assert.ok(c.pricingLastChecked.match(/^\d{4}-\d{2}-\d{2}$/));
      assert.ok(c.featuresLastChecked.match(/^\d{4}-\d{2}-\d{2}$/));
      assert.ok(c.sources.length >= 1);
      assert.ok(c.tiers.length >= 1);
      assert.ok(c.shortAnswer.length > 40);
      assert.ok(c.whoSendfableIsFor.length > 20);
      assert.ok(c.whoCompetitorIsFor.length > 20);
    }
  });

  it("includes required competitor set as public comparisons", () => {
    const required = [
      "mailchimp",
      "mailerlite",
      "brevo",
      "omnisend",
      "getresponse",
      "moosend",
      "activecampaign",
      "emailoctopus",
      "engagebay",
      "zoho-campaigns",
      "hubspot",
      "mailjet",
      "kit",
      "beehiiv",
      "benchmark-email",
      "aweber",
    ];
    for (const slug of required) {
      assert.ok(COMPETITORS[slug], missing(slug));
      assert.equal(COMPETITORS[slug]!.publicComparisonEnabled, true);
    }
  });

  it("surfaces comparison disclaimer language", () => {
    assert.match(COMPARISON_DISCLAIMER, /change/i);
    assert.match(COMPARISON_DISCLAIMER, /approximate|verify/i);
  });

  it("freshness report covers public competitors", () => {
    const report = competitorFreshnessReport();
    assert.equal(report.length, listPublicCompetitors().length);
  });

  it("compatibility shim still resolves mailchimp pricing", () => {
    const p = competitorPricing("mailchimp");
    assert.equal(p.name, "Mailchimp");
    assert.ok(p.lastChecked);
  });

  it("does not mark freshly checked pricing stale", () => {
    const mc = COMPETITORS.mailchimp!;
    assert.equal(isPricingStale(mc, new Date(`${mc.pricingLastChecked}T12:00:00Z`)), false);
  });
});

describe("sendfable facts (SF-004)", () => {
  it("keeps plan facts aligned with plans.ts", () => {
    assert.equal(SENDFABLE_FACTS.plans.find((p) => p.key === "STARTER")?.monthlyPrice, PLANS.STARTER.monthlyPrice);
    assert.equal(SENDFABLE_FACTS.plans.find((p) => p.key === "GROWTH")?.monthlyPrice, PLANS.GROWTH.monthlyPrice);
    assert.equal(SENDFABLE_FACTS.plans.find((p) => p.key === "PRO")?.monthlyPrice, PLANS.PRO.monthlyPrice);
    assert.equal(SENDFABLE_FACTS.plans.find((p) => p.key === "PRO_PLUS")?.monthlyPrice, PLANS.PRO_PLUS.monthlyPrice);
  });

  it("states SMS is not publicly available", () => {
    assert.equal(SENDFABLE_FACTS.smsStatus.publiclyAvailable, false);
    assert.match(SENDFABLE_FACTS.smsStatus.publicAnswer, /not publicly available/i);
  });

  it("includes core AEO FAQs", () => {
    const qs = SENDFABLE_FACTS.faqs.map((f) => f.q.toLowerCase());
    assert.ok(qs.some((q) => q.includes("what is sendfable")));
    assert.ok(qs.some((q) => q.includes("amazon ses") || q.includes("ses")));
    assert.ok(qs.some((q) => q.includes("sms")));
  });
});

function missing(slug: string) {
  return `missing competitor ${slug}`;
}
