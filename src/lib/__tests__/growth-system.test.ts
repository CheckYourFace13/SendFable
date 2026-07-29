import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_EVENTS,
  FUNNEL_STAGES,
  normalizeEventName,
  trackEvent,
  analyticsEnabled,
  isBotUserAgent,
  scrubProps,
} from "@/lib/analytics";
import { SF008_DRAFTS, allEditorialItems } from "@/data/editorial-drafts";
import { CONTENT_STATUSES, NURTURE_SEQUENCES } from "@/data/content-pipeline";
import {
  referralCreditsEnabled,
  referralCreditCents,
  maybeAwardReferralPaidCredit,
} from "@/lib/referrals";
import { indexNowEnabled, submitIndexNow, isPublicIndexableUrl } from "@/lib/indexnow";
import { nurtureGeneralEnabled, maskEmail } from "@/lib/nurture";

describe("SF-007 analytics contract", () => {
  it("defines required public/activation/revenue events", () => {
    for (const e of [
      "homepage_view",
      "pricing_view",
      "comparison_view",
      "signup_complete",
      "first_campaign_sent",
      "checkout_completed",
      "referral_attributed",
    ]) {
      assert.ok((ANALYTICS_EVENTS as readonly string[]).includes(e));
    }
  });

  it("maps legacy event names", () => {
    assert.equal(normalizeEventName("pricing_viewed"), "pricing_view");
    assert.equal(normalizeEventName("signup_started"), "signup_start");
    assert.equal(normalizeEventName("not_a_real_event"), null);
  });

  it("funnel stages cover organic to paid", () => {
    assert.equal(FUNNEL_STAGES[0].id, "organic_landing");
    assert.equal(FUNNEL_STAGES[FUNNEL_STAGES.length - 1].id, "paid_conversion");
  });

  it("trackEvent is a no-op when analytics disabled", () => {
    assert.equal(analyticsEnabled(), false);
    trackEvent("homepage_view", { email: "should-not-matter@x.com" });
  });
});

describe("SF-008 editorial batch", () => {
  it("has exactly 12 SF-008 drafts with two published", () => {
    assert.equal(SF008_DRAFTS.length, 12);
    const published = SF008_DRAFTS.filter((d) => d.status === "PUBLISHED");
    assert.equal(published.length, 2);
    for (const d of SF008_DRAFTS) {
      assert.ok(d.directAnswer.length > 40);
      assert.ok(d.faqs.length >= 1);
      assert.ok(d.internalLinkSuggestions.length >= 1);
      assert.ok(d.sources.length >= 1);
      assert.ok(d.sections.length >= 1);
    }
  });

  it("includes REVISION_NEEDED in workflow statuses", () => {
    assert.ok((CONTENT_STATUSES as readonly string[]).includes("REVISION_NEEDED"));
    assert.ok((CONTENT_STATUSES as readonly string[]).includes("APPROVED"));
  });

  it("keeps nurture inactive", () => {
    for (const s of NURTURE_SEQUENCES) {
      assert.notEqual(s.status, "ACTIVE");
      assert.equal(s.testModeOnly, true);
    }
  });

  it("merges calendar for admin", () => {
    assert.ok(allEditorialItems().length >= 14);
  });
});

describe("SF-009 referral credits gate", () => {
  it("keeps monetary credits off by default", () => {
    assert.equal(referralCreditsEnabled(), false);
    assert.equal(referralCreditCents(), 1000);
  });

  it("paid credit helper refuses when disabled", async () => {
    const r = await maybeAwardReferralPaidCredit("any");
    assert.equal(r.awarded, false);
    assert.match(r.reason, /REFERRAL_CREDITS_ENABLED/);
  });
});

describe("SF-012 analytics privacy helpers", () => {
  it("detects bots and scrubs PII-shaped props", () => {
    assert.equal(isBotUserAgent("Googlebot/2.1"), true);
    assert.equal(isBotUserAgent("Mozilla/5.0 Chrome/120"), false);
    const clean = scrubProps({ email: "a@b.com", count: 2, subject: "hi", plan: "GROWTH" });
    assert.equal(clean.email, undefined);
    assert.equal(clean.subject, undefined);
    assert.equal(clean.count, 2);
    assert.equal(clean.plan, "GROWTH");
  });

  it("blocks private IndexNow paths", () => {
    assert.equal(isPublicIndexableUrl("/admin"), false);
    assert.equal(isPublicIndexableUrl("/billing"), false);
    assert.equal(isPublicIndexableUrl("/pricing"), true);
  });
});

describe("SF-007 IndexNow", () => {
  it("is disabled without key", () => {
    assert.equal(indexNowEnabled(), false);
  });

  it("skips submit without key", async () => {
    const r = await submitIndexNow(["https://sendfable.com/"]);
    assert.equal(r.ok, false);
    assert.equal(r.skipped, "INDEXNOW_KEY unset");
  });
});

describe("SF-014 nurture gates", () => {
  it("keeps general nurture off and masks emails", () => {
    assert.equal(nurtureGeneralEnabled(), false);
    assert.equal(maskEmail("chris@example.com"), "ch***@example.com");
  });
});
