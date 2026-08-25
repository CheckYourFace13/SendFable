import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACQUISITION_FLAG_DEFAULTS,
  acquisitionDailyNewLimit,
  acquisitionDailyTotalLimit,
  acquisitionFlag,
  acquisitionMinScore,
} from "@/lib/acquisition/flags";
import { scoreProspect, SCORE_WEIGHTS } from "@/lib/acquisition/scoring";
import {
  isValidEmailSyntax,
  normalizeDomain,
  normalizeWebsite,
  isLikelyPersonalConsumerEmail,
} from "@/lib/acquisition/normalize";
import {
  buildInitialEmail,
  claimFromEvidence,
  openerLooksFabricated,
} from "@/lib/acquisition/personalize";
import { bodyHasUnsubscribe } from "@/lib/acquisition/quality-gate";
import {
  defaultProspectTimeZone,
  isWithinSendWindow,
  FOLLOW_UP_1_DAYS,
  FOLLOW_UP_2_DAYS,
} from "@/lib/acquisition/schedule";
import { analyzeHtml } from "@/lib/acquisition/discovery/enrich";
import { ACQUISITION_SEED_CATALOG } from "@/lib/acquisition/discovery/seed-catalog";
import { PLANS } from "@/lib/plans";
import { normalizeBusinessKey } from "@/lib/acquisition/normalize";

describe("acquisition flags", () => {
  it("defaults all gates to false", () => {
    assert.equal(ACQUISITION_FLAG_DEFAULTS.SENDFABLE_ACQUISITION_ENABLED, false);
    assert.equal(ACQUISITION_FLAG_DEFAULTS.SENDFABLE_ACQUISITION_DISCOVERY_ENABLED, false);
    assert.equal(ACQUISITION_FLAG_DEFAULTS.SENDFABLE_ACQUISITION_SENDING_ENABLED, false);
    assert.equal(ACQUISITION_FLAG_DEFAULTS.SENDFABLE_ACQUISITION_AUTO_APPROVE, false);
    assert.equal(ACQUISITION_FLAG_DEFAULTS.SENDFABLE_ACQUISITION_AUTO_RAMP, false);
  });

  it("defaults min score to 70 and stage-1 caps when overrides unset", () => {
    const prevM = process.env.SENDFABLE_ACQUISITION_MIN_SCORE;
    const prevN = process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT;
    const prevT = process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT;
    const prevS = process.env.SENDFABLE_ACQUISITION_RAMP_STAGE;
    delete process.env.SENDFABLE_ACQUISITION_MIN_SCORE;
    delete process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT;
    delete process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT;
    delete process.env.SENDFABLE_ACQUISITION_RAMP_STAGE;
    assert.equal(acquisitionMinScore(), 70);
    assert.equal(acquisitionDailyNewLimit(1), 5);
    assert.equal(acquisitionDailyTotalLimit(1), 10);
    if (prevM !== undefined) process.env.SENDFABLE_ACQUISITION_MIN_SCORE = prevM;
    if (prevN !== undefined) process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT = prevN;
    if (prevT !== undefined) process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT = prevT;
    if (prevS !== undefined) process.env.SENDFABLE_ACQUISITION_RAMP_STAGE = prevS;
  });

  it("flag helper respects explicit false", () => {
    const prev = process.env.SENDFABLE_ACQUISITION_ENABLED;
    process.env.SENDFABLE_ACQUISITION_ENABLED = "false";
    assert.equal(acquisitionFlag("SENDFABLE_ACQUISITION_ENABLED"), false);
    if (prev === undefined) delete process.env.SENDFABLE_ACQUISITION_ENABLED;
    else process.env.SENDFABLE_ACQUISITION_ENABLED = prev;
  });
});

describe("acquisition normalize + dedupe keys", () => {
  it("normalizes domains", () => {
    assert.equal(normalizeDomain("https://WWW.Example.COM/path"), "example.com");
    assert.equal(normalizeWebsite("example.com"), "https://example.com");
  });

  it("validates email syntax", () => {
    assert.equal(isValidEmailSyntax("info@brew.example"), true);
    assert.equal(isValidEmailSyntax("not-an-email"), false);
    assert.equal(isValidEmailSyntax("a@b.c"), false);
  });

  it("detects consumer emails", () => {
    assert.equal(isLikelyPersonalConsumerEmail("owner@gmail.com"), true);
    assert.equal(isLikelyPersonalConsumerEmail("hello@localbrew.com"), false);
  });

  it("business keys collide for same name+domain", () => {
    assert.equal(
      normalizeBusinessKey("Half Acre!", "https://www.halfacrebeer.com"),
      normalizeBusinessKey("half acre", "halfacrebeer.com")
    );
  });
});

describe("acquisition scoring", () => {
  it("scores high-fit newsletter prospect above 65", () => {
    const s = scoreProspect({
      newsletterPresent: true,
      eventsPromotionsPresent: true,
      repeatCustomerBusiness: true,
      publicBusinessEmail: true,
      activeWebsite: true,
      clearLocalSmallBusiness: true,
    });
    assert.ok(s >= 65);
    assert.equal(
      s,
      SCORE_WEIGHTS.newsletterPresent +
        SCORE_WEIGHTS.eventsPromotionsPresent +
        SCORE_WEIGHTS.repeatCustomerBusiness +
        SCORE_WEIGHTS.publicBusinessEmail +
        SCORE_WEIGHTS.activeWebsite +
        SCORE_WEIGHTS.clearLocalSmallBusiness
    );
  });

  it("applies hard penalties", () => {
    const s = scoreProspect({
      newsletterPresent: true,
      unsubscribedOrComplaintOrCustomer: true,
    });
    assert.equal(s, 0);
  });
});

describe("acquisition personalization + compliance", () => {
  it("builds initial email with free plan from PLANS and unsubscribe", () => {
    const built = buildInitialEmail(
      {
        businessName: "Test Brewery",
        claim: "I saw you promote weekly events on your site.",
        evidence: "upcoming events calendar",
        sourceUrl: "https://test.example",
      },
      { unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=x" }
    );
    assert.match(built.subject, /Test Brewery/);
    assert.match(built.bodyText, new RegExp(String(PLANS.FREE.contactCap)));
    assert.match(built.bodyText, /unsubscribe|no thanks/i);
    assert.ok(bodyHasUnsubscribe(built.bodyText));
    assert.ok(!openerLooksFabricated(built.opener));
  });

  it("rejects fabricated openers", () => {
    assert.equal(openerLooksFabricated("I know you use Mailchimp today"), true);
    assert.equal(openerLooksFabricated("I saw you promote weekly events"), false);
  });

  it("requires evidence for claims", () => {
    const c = claimFromEvidence({ newsletterPresent: true, evidenceSnippet: "Join our newsletter" });
    assert.ok(c);
    assert.match(c!.claim, /newsletter/i);
  });

  it("returns null without solid evidence", () => {
    assert.equal(claimFromEvidence({ category: "restaurant" }), null);
  });
});

describe("acquisition schedule", () => {
  it("maps state to timezone", () => {
    assert.equal(defaultProspectTimeZone("CA"), "America/Los_Angeles");
    assert.equal(defaultProspectTimeZone("NY"), "America/New_York");
    assert.equal(defaultProspectTimeZone("TX"), "America/Chicago");
  });

  it("blocks weekends in Chicago", () => {
    // 2026-08-23 was a Sunday
    const sun = new Date("2026-08-23T16:00:00Z");
    const r = isWithinSendWindow(sun, "America/Chicago");
    assert.equal(r.ok, false);
  });

  it("follow-up cadence constants", () => {
    assert.equal(FOLLOW_UP_1_DAYS, 4);
    assert.equal(FOLLOW_UP_2_DAYS, 10);
  });
});

describe("acquisition enrich analyzer", () => {
  it("extracts mailto and competitor + newsletter signals", () => {
    const html = `
      <html><body>
        <a href="mailto:hello@localbrew.test">Email us</a>
        <form action="https://localbrew.us7.list-manage.com/subscribe">Join our newsletter</form>
        <p>Upcoming events and weekly specials this Friday</p>
      </body></html>`;
    const a = analyzeHtml(html, "https://localbrew.test");
    assert.ok(a.emails.includes("hello@localbrew.test"));
    assert.equal(a.newsletterPresent, true);
    assert.equal(a.eventsPromotionsPresent, true);
    assert.equal(a.competitorPlatform, "Mailchimp");
    assert.equal(a.bestEmail, "hello@localbrew.test");
  });
});

describe("acquisition seed catalog", () => {
  it("has at least 20 real seed businesses", () => {
    const real = ACQUISITION_SEED_CATALOG.filter((s) => !s.website.includes("example.com"));
    assert.ok(real.length >= 20);
  });
});

describe("acquisition daily caps logic (pure)", () => {
  it("stage caps match autonomy plan", () => {
    const prevN = process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT;
    const prevT = process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT;
    delete process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT;
    delete process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT;
    assert.equal(acquisitionDailyNewLimit(1), 5);
    assert.equal(acquisitionDailyTotalLimit(1), 10);
    assert.equal(acquisitionDailyNewLimit(4), 30);
    assert.equal(acquisitionDailyTotalLimit(4), 50);
    if (prevN !== undefined) process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT = prevN;
    if (prevT !== undefined) process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT = prevT;
  });
});

describe("acquisition autonomy gates", () => {
  it("requires email domain to match website", async () => {
    const { emailMatchesWebsiteDomain, isUsBusinessState } = await import(
      "@/lib/acquisition/quality-gate"
    );
    assert.equal(emailMatchesWebsiteDomain("info@halfacrebeer.com", "halfacrebeer.com"), true);
    assert.equal(emailMatchesWebsiteDomain("owner@gmail.com", "halfacrebeer.com"), false);
    assert.equal(isUsBusinessState("IL"), true);
    assert.equal(isUsBusinessState("Ontario"), false);
  });

  it("ramp and pause helpers enforce sample and thresholds", async () => {
    const { canRampGiven, shouldHardPause, shouldReduceStage } = await import(
      "@/lib/acquisition/ramp"
    );
    assert.equal(
      canRampGiven({
        autoRamp: true,
        stage: 1,
        businessDaysInStage: 3,
        sent: 40,
        bounceRate: 0.01,
        complaintRate: 0,
        unsubRate: 0.01,
      }).eligible,
      true
    );
    assert.equal(
      canRampGiven({
        autoRamp: true,
        stage: 1,
        businessDaysInStage: 1,
        sent: 40,
        bounceRate: 0,
        complaintRate: 0,
        unsubRate: 0,
      }).eligible,
      false
    );
    assert.equal(
      shouldHardPause({ sent: 50, bounceRate: 0.06, complaintRate: 0, unsubRate: 0 }).pause,
      true
    );
    assert.equal(
      shouldReduceStage({ sent: 50, bounceRate: 0.03, unsubRate: 0 }),
      true
    );
  });

  it("classifies reply bodies", async () => {
    const { classifyReplyBody } = await import("@/lib/acquisition/reply-imap");
    assert.equal(classifyReplyBody("Please unsubscribe me"), "UNSUBSCRIBE");
    assert.equal(classifyReplyBody("Sounds good — tell me more"), "POSITIVE");
    assert.equal(classifyReplyBody("Not interested"), "NOT_INTERESTED");
    assert.equal(classifyReplyBody("What does pricing look like?"), "QUESTION");
  });

  it("recognizes Casey acquisition replies inside support@ inbox", async () => {
    const { isCaseyAcquisitionInbound, extractRecipientEmails } = await import(
      "@/lib/acquisition/reply-imap"
    );
    const raw = [
      "Delivered-To: support@sendfable.com",
      "X-Original-To: casey@sendfable.com",
      "To: Casey at SendFable <casey@sendfable.com>",
      "From: owner@localbrew.test",
      "Subject: Re: Quick question about Local Brew",
      "",
      "Interested — tell me more",
    ].join("\r\n");
    const recipients = extractRecipientEmails(raw);
    assert.ok(recipients.includes("casey@sendfable.com"));
    assert.equal(
      isCaseyAcquisitionInbound({
        toRecipients: recipients,
        subject: "Re: Quick question about Local Brew",
        fromEmail: "owner@localbrew.test",
      }),
      true
    );
    assert.equal(
      isCaseyAcquisitionInbound({
        toRecipients: ["support@sendfable.com"],
        subject: "Website is down",
        fromEmail: "stranger@example.com",
      }),
      false
    );
  });
});
