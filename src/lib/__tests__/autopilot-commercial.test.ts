import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";
import {
  AUTOPILOT_CREATION_PACKS,
  brandingRequiredFor,
  chooseCreation,
  countUsage,
  currentTrialPeriod,
  monthStartUtc,
  promoFromCode,
  sendBadgeForAutopilotDraft,
  weekStartUtc,
  type CreationUsage,
} from "@/lib/autopilot/commercial";
import { parseAutopilotSchedule } from "@/lib/autopilot/schedule";
import { extractEmailBrand } from "@/lib/autopilot/brand";
import { createSimpleDesign } from "@/lib/simple-design";
import { compileEmailHtml } from "@/lib/email-compiler";
import { pickImage } from "@/lib/acquisition/website-demo/extract";

function src(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const none: CreationUsage = {
  planThisMonth: 0,
  trialThisPeriod: 0,
  promoThisMonth: 0,
  promoThisWeek: 0,
};

const now = new Date("2026-10-10T15:00:00Z");

describe("autopilot creation allowances", () => {
  it("gives Free no permanent creations and steps paid plans up", () => {
    assert.equal(autopilotMaxDraftsPerMonth("FREE"), 0);
    assert.equal(autopilotMaxDraftsPerMonth("STARTER"), 4);
    assert.equal(autopilotMaxDraftsPerMonth("GROWTH"), 8);
    assert.equal(autopilotMaxDraftsPerMonth("PRO"), 16);
    assert.equal(autopilotMaxDraftsPerMonth("PRO_PLUS"), 30);
    assert.deepEqual(
      AUTOPILOT_CREATION_PACKS.map((pack) => [pack.credits, pack.cents]),
      [
        [5, 1900],
        [10, 3500],
        [25, 7500],
      ]
    );
  });

  it("blocks a Free workspace before the trial is started", () => {
    assert.equal(
      chooseCreation({
        now,
        isOwnerInternal: false,
        plan: "FREE",
        planShowsBadge: true,
        trialStartedAt: null,
        creditBalance: 0,
        promo: "NONE",
        used: none,
      }),
      null
    );
  });

  it("allows one trial creation per month and does not roll unused months forward", () => {
    const started = new Date("2026-08-15T00:00:00Z");
    const first = chooseCreation({
      now: new Date("2026-08-20T15:00:00Z"),
      isOwnerInternal: false,
      plan: "FREE",
      planShowsBadge: true,
      trialStartedAt: started,
      creditBalance: 0,
      promo: "NONE",
      used: none,
    });
    assert.equal(first?.source, "TRIAL");
    assert.equal(first?.brandingRequired, true);

    const used = chooseCreation({
      now: new Date("2026-08-20T15:00:00Z"),
      isOwnerInternal: false,
      plan: "FREE",
      planShowsBadge: false,
      trialStartedAt: started,
      creditBalance: 0,
      promo: "NONE",
      used: { ...none, trialThisPeriod: 1 },
    });
    assert.equal(used, null);

    const nextMonth = new Date("2026-09-20T15:00:00Z");
    const again = chooseCreation({
      now: nextMonth,
      isOwnerInternal: false,
      plan: "FREE",
      planShowsBadge: false,
      trialStartedAt: started,
      creditBalance: 0,
      promo: "NONE",
      used: { ...none, trialThisPeriod: 0 },
    });
    assert.equal(again?.source, "TRIAL");

    const drafts = [
      { creationSource: "TRIAL", createdAt: new Date("2026-08-20T00:00:00Z") },
    ];
    const counted = countUsage(drafts, nextMonth, started);
    assert.equal(counted.trialThisPeriod, 0);
  });

  it("ends the trial after three months", () => {
    const started = new Date("2026-01-15T00:00:00Z");
    assert.ok(currentTrialPeriod(started, new Date("2026-01-20T00:00:00Z")));
    assert.ok(currentTrialPeriod(started, new Date("2026-03-14T00:00:00Z")));
    assert.equal(currentTrialPeriod(started, new Date("2026-04-15T00:00:00Z")), null);
    assert.equal(
      chooseCreation({
        now: new Date("2026-04-15T00:00:00Z"),
        isOwnerInternal: false,
        plan: "FREE",
        planShowsBadge: true,
        trialStartedAt: started,
        creditBalance: 0,
        promo: "NONE",
        used: none,
      }),
      null
    );
  });

  it("uses paid plan allowance and purchased credits before a promo", () => {
    const starter = chooseCreation({
      now,
      isOwnerInternal: false,
      plan: "STARTER",
      planShowsBadge: false,
      trialStartedAt: null,
      creditBalance: 5,
      promo: "MONTHLY",
      used: { ...none, planThisMonth: 3 },
    });
    assert.equal(starter?.source, "PLAN_INCLUDED");
    assert.equal(starter?.brandingRequired, false);

    const credit = chooseCreation({
      now,
      isOwnerInternal: false,
      plan: "STARTER",
      planShowsBadge: false,
      trialStartedAt: null,
      creditBalance: 5,
      promo: "MONTHLY",
      used: { ...none, planThisMonth: 4 },
    });
    assert.equal(credit?.source, "PAID_CREDIT");
    assert.equal(credit?.brandingRequired, false);

    const promo = chooseCreation({
      now,
      isOwnerInternal: false,
      plan: "STARTER",
      planShowsBadge: false,
      trialStartedAt: null,
      creditBalance: 0,
      promo: "MONTHLY",
      used: { ...none, planThisMonth: 4 },
    });
    assert.equal(promo?.source, "PROMO_MONTHLY");
    assert.equal(promo?.brandingRequired, true);
  });

  it("limits monthly and weekly promos without rollover", () => {
    assert.equal(promoFromCode("autopilot1month"), "MONTHLY");
    assert.equal(promoFromCode("AUTOPILOT1WEEK"), "WEEKLY");
    assert.equal(promoFromCode("FREEBIE"), null);

    const blocked = chooseCreation({
      now,
      isOwnerInternal: false,
      plan: "FREE",
      planShowsBadge: true,
      trialStartedAt: null,
      creditBalance: 0,
      promo: "WEEKLY",
      used: { ...none, promoThisWeek: 1 },
    });
    assert.equal(blocked, null);

    const lastWeek = new Date(weekStartUtc(now).getTime() - 86_400_000);
    const usage = countUsage(
      [{ creationSource: "PROMO_WEEKLY", createdAt: lastWeek }],
      now,
      null
    );
    assert.equal(usage.promoThisWeek, 0);
    const monthUsage = countUsage(
      [{ creationSource: "PROMO_MONTHLY", createdAt: new Date(monthStartUtc(now).getTime() - 86_400_000) }],
      now,
      null
    );
    assert.equal(monthUsage.promoThisMonth, 0);
  });

  it("keeps owner internal unlimited and promotional", () => {
    const choice = chooseCreation({
      now,
      isOwnerInternal: true,
      plan: "FREE",
      planShowsBadge: false,
      trialStartedAt: null,
      creditBalance: 0,
      promo: "NONE",
      used: { planThisMonth: 100, trialThisPeriod: 5, promoThisMonth: 5, promoThisWeek: 5 },
    });
    assert.equal(choice?.source, "OWNER_INTERNAL");
    assert.equal(choice?.brandingRequired, true);
  });
});

describe("autopilot footer branding", () => {
  it("requires the SendFable footer for trial, promos, and owner internal", () => {
    for (const source of ["TRIAL", "PROMO_MONTHLY", "PROMO_WEEKLY", "OWNER_INTERNAL"] as const) {
      assert.equal(brandingRequiredFor(source, false), true);
    }
    assert.equal(brandingRequiredFor("PLAN_INCLUDED", false), false);
    assert.equal(brandingRequiredFor("PAID_CREDIT", false), false);
    assert.equal(brandingRequiredFor("PAID_CREDIT", true), true);
  });

  it("keeps a promo footer after the workspace plan changes", () => {
    assert.equal(sendBadgeForAutopilotDraft({ brandingRequired: true }, false), true);
    assert.equal(sendBadgeForAutopilotDraft({ brandingRequired: false }, true), false);
    assert.equal(sendBadgeForAutopilotDraft(null, false), false);
    assert.equal(sendBadgeForAutopilotDraft(null, true), true);
  });

  it("renders the customer brand in the campaign and SendFable only in the footer", () => {
    const drinkHtml = `<html><head>
      <meta name="theme-color" content="#1b4d3e">
      <link rel="apple-touch-icon" href="/drinkknird-logo.png">
      <style>body { font-family: Georgia, serif; background: #f7f3eb; }</style>
      </head><body><h1 style="color:#c4a35a">DrinkKnird</h1></body></html>`;
    const boatHtml = `<html><head>
      <meta name="theme-color" content="#0b3a6a">
      <link rel="apple-touch-icon" href="/boating-logo.png">
      <style>body { font-family: Inter, sans-serif; background: #e8f1fb; }</style>
      </head><body><button style="border-radius:0">Book</button></body></html>`;
    const drink = extractEmailBrand(drinkHtml, "https://drinkknird.com/", "DrinkKnird");
    const boat = extractEmailBrand(boatHtml, "https://boatingchicago.com/", "BoatingChicago");
    assert.notEqual(drink.primaryColor, boat.primaryColor);
    assert.notEqual(drink.logoUrl, boat.logoUrl);
    assert.equal(drink.fontLabel, "Classic");
    assert.equal(boat.buttonStyle, "square");

    const html = compileEmailHtml(
      createSimpleDesign({
        headline: "Autumn pour",
        messageHtml: "<p>New on the menu.</p>",
        buttonLabel: "See the pour",
        buttonHref: "https://drinkknird.com/specials",
        logoUrl: drink.logoUrl,
        logoAlt: "DrinkKnird",
        primaryColor: drink.primaryColor,
        accentColor: drink.accentColor,
        fontFamily: drink.fontFamily,
        buttonRadius: drink.buttonStyle,
        omitPlaceholderImage: true,
        imageUrl: "https://drinkknird.com/autumn-pour.jpg",
        imageAlt: "Autumn pour",
      }),
      { businessName: "DrinkKnird", showSendfableBadge: true }
    );
    assert.match(html, /DrinkKnird/);
    assert.match(html, new RegExp(drink.primaryColor, "i"));
    assert.match(html, /autumn-pour\.jpg/);
    assert.match(html, /See the pour/);
    assert.match(html, /Powered by/);
    assert.match(html, /We turn your content into emails ready to send/);
    assert.match(html, /footer_badge/);
    const badgeAt = html.toLowerCase().indexOf("powered by");
    const headlineAt = html.indexOf("Autumn pour");
    assert.ok(headlineAt >= 0 && badgeAt > headlineAt);
  });
});

describe("autopilot scheduling", () => {
  it("requires a future date, time, and timezone and has no send-now default", () => {
    const missingDate = parseAutopilotSchedule({});
    assert.equal(missingDate.ok, false);
    if (!missingDate.ok) assert.match(missingDate.error, /Date is required/);
    const missingTime = parseAutopilotSchedule({ date: "2026-12-01", time: "", timezone: "UTC" });
    assert.equal(missingTime.ok, false);
    if (!missingTime.ok) assert.match(missingTime.error, /Time is required/);
    const missingZone = parseAutopilotSchedule({ date: "2026-12-01", time: "15:00", timezone: "" });
    assert.equal(missingZone.ok, false);
    if (!missingZone.ok) assert.match(missingZone.error, /Timezone is required/);
    const sendNow = parseAutopilotSchedule({ date: "2026-12-01", time: "now", timezone: "UTC" });
    assert.equal(sendNow.ok, false);
    if (!sendNow.ok) assert.match(sendNow.error, /Time is required/);
    const past = parseAutopilotSchedule({
      date: "2020-01-01",
      time: "09:00",
      timezone: "UTC",
      now: new Date("2026-10-10T00:00:00Z"),
    });
    assert.equal(past.ok, false);
    const scheduled = parseAutopilotSchedule({
      date: "2026-12-01",
      time: "15:00",
      timezone: "America/Chicago",
      now: new Date("2026-10-10T00:00:00Z"),
    });
    assert.equal(scheduled.ok, true);
    if (scheduled.ok) assert.equal(scheduled.at.toISOString(), "2026-12-01T21:00:00.000Z");
  });

  it("does not launch from approval, the worker tick, or an empty response", () => {
    const approval = src("src/lib/autopilot/approval.ts");
    const tick = src("src/lib/autopilot/tick.ts");
    const queue = src("src/app/(app)/scribe/page.tsx");
    assert.doesNotMatch(approval, /launchCampaign/);
    assert.match(approval, /schedule_required/);
    assert.match(approval, /parseAutopilotSchedule/);
    assert.doesNotMatch(tick, /launchCampaign/);
    assert.match(tick, /check === "ok"/);
    assert.match(tick, /no_creation_entitlement/);
    assert.doesNotMatch(tick, /expireStale/);
    assert.match(queue, /Approve &amp; Schedule/);
    assert.match(queue, /SCHEDULE CAMPAIGN/);
    assert.match(queue, /Cancel schedule/);
    assert.doesNotMatch(queue, /Send this campaign now/);
    assert.match(src("src/app/api/autopilot/drafts/[id]/route.ts"), /ctx\.workspace\.id/);
    assert.match(src("src/app/api/autopilot/trial/route.ts"), /ctx\.workspace\.id/);
    assert.match(src("src/lib/campaign-send.ts"), /sendBadgeForCampaign/);
  });
});

describe("autopilot image relevance and manual email", () => {
  it("uses an image only when it matches the specific item", () => {
    const page = "https://drinkknird.com/specials";
    const unrelated = pickImage(
      [{ src: "https://drinkknird.com/logo.png", alt: "logo", width: 600, height: 200 }],
      "Autumn pour",
      page
    );
    assert.equal(unrelated, null);
    const matched = pickImage(
      [{ src: "https://drinkknird.com/autumn-pour.jpg", alt: "Autumn pour", width: 800, height: 500 }],
      "Autumn pour",
      page
    );
    assert.equal(matched?.src, "https://drinkknird.com/autumn-pour.jpg");
    const offsite = pickImage(
      [{ src: "https://cdn.example/autumn-pour.jpg", alt: "Autumn pour", width: 800, height: 500 }],
      "Autumn pour",
      page
    );
    assert.equal(offsite, null);
  });

  it("leaves the manual simple campaign design unchanged", () => {
    const manual = createSimpleDesign();
    const image = manual.blocks.find((block) => block.type === "image" && block.props.alt === "Featured image");
    assert.equal(image?.props.src, "");
    const button = manual.blocks.find((block) => block.type === "button");
    assert.equal(button?.props.backgroundColor, "#4F46E5");
    const html = compileEmailHtml(manual, {
      businessName: "Manual Co",
      showSendfableBadge: false,
    });
    assert.match(html, /Manual Co/);
    assert.doesNotMatch(html, /We turn your content into emails ready to send/);
  });
});
