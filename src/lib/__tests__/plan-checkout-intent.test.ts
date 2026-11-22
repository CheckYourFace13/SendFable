import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  billingCheckoutPath,
  parsePlanCheckoutIntent,
  publicPlanCtaHref,
} from "@/lib/plan-checkout-intent";

describe("plan checkout intent", () => {
  it("parses paid plan + interval from query", () => {
    const intent = parsePlanCheckoutIntent(
      new URLSearchParams("plan=GROWTH&interval=year")
    );
    assert.deepEqual(intent, { plan: "GROWTH", interval: "year" });
  });

  it("parses TEXT20 promo code with plan intent", () => {
    const intent = parsePlanCheckoutIntent(
      new URLSearchParams("plan=STARTER&interval=month&code=TEXT20")
    );
    assert.deepEqual(intent, { plan: "STARTER", interval: "month", code: "TEXT20" });
  });

  it("ignores free / unknown plans", () => {
    assert.equal(parsePlanCheckoutIntent(new URLSearchParams("plan=FREE")), null);
    assert.equal(parsePlanCheckoutIntent(new URLSearchParams("plan=ENTERPRISE")), null);
  });

  it("builds pricing CTAs that preserve plan intent", () => {
    assert.equal(publicPlanCtaHref("FREE", false), "/signup");
    assert.equal(publicPlanCtaHref("STARTER", false), "/signup?plan=STARTER&interval=month");
    assert.equal(publicPlanCtaHref("PRO_PLUS", true), "/signup?plan=PRO_PLUS&interval=year");
    assert.equal(
      publicPlanCtaHref("STARTER", false, "TEXT20"),
      "/signup?plan=STARTER&interval=month&code=TEXT20"
    );
  });

  it("builds billing checkout path for auto-handoff", () => {
    assert.equal(
      billingCheckoutPath({ plan: "PRO", interval: "month" }),
      "/billing?plan=PRO&interval=month&checkout=1"
    );
    assert.equal(
      billingCheckoutPath({ plan: "STARTER", interval: "month", code: "TEXT20" }),
      "/billing?plan=STARTER&interval=month&checkout=1&code=TEXT20"
    );
  });
});
