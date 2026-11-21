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

  it("ignores free / unknown plans", () => {
    assert.equal(parsePlanCheckoutIntent(new URLSearchParams("plan=FREE")), null);
    assert.equal(parsePlanCheckoutIntent(new URLSearchParams("plan=ENTERPRISE")), null);
  });

  it("builds pricing CTAs that preserve plan intent", () => {
    assert.equal(publicPlanCtaHref("FREE", false), "/signup");
    assert.equal(publicPlanCtaHref("STARTER", false), "/signup?plan=STARTER&interval=month");
    assert.equal(publicPlanCtaHref("PRO_PLUS", true), "/signup?plan=PRO_PLUS&interval=year");
  });

  it("builds billing checkout path for auto-handoff", () => {
    assert.equal(
      billingCheckoutPath({ plan: "PRO", interval: "month" }),
      "/billing?plan=PRO&interval=month&checkout=1"
    );
  });
});
