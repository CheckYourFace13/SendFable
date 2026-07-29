import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  billableInboundSegments,
  crossedInboundThresholds,
  inboundOverageChargeMicros,
  isBundleEligible,
  outboundChargeMicros,
  resolveSmsPricing,
  type SmsPlanKey,
} from "../sms/pricing";

describe("SMS pricing catalog", () => {
  it("stores Text Entry at $19.99 / $0.05 / 100 inbound", () => {
    const p = SMS_PLANS.TEXT_ENTRY;
    assert.equal(p.monthlyPriceCents, 1999);
    assert.equal(p.outboundSegmentPriceMicros, 50_000);
    assert.equal(p.includedInboundSegments, 100);
    assert.equal(p.inboundOveragePriceMicros, 25_000);
    assert.equal(p.bundleEligible, false);
    assert.equal(p.bundledMonthlyPriceCents, null);
  });

  it("stores Text Essentials at $49.99 / $0.035 / 300 inbound / $44.99 bundled", () => {
    const p = SMS_PLANS.TEXT_ESSENTIALS;
    assert.equal(p.monthlyPriceCents, 4999);
    assert.equal(p.outboundSegmentPriceMicros, 35_000);
    assert.equal(p.includedInboundSegments, 300);
    assert.equal(p.bundledMonthlyPriceCents, 4499);
  });

  it("stores Text Advantage at $99.99 / $0.025 / 750 inbound / $89.99 bundled", () => {
    const p = SMS_PLANS.TEXT_ADVANTAGE;
    assert.equal(p.monthlyPriceCents, 9999);
    assert.equal(p.outboundSegmentPriceMicros, 25_000);
    assert.equal(p.includedInboundSegments, 750);
    assert.equal(p.bundledMonthlyPriceCents, 8999);
  });

  it("uses a $99 activation fee", () => {
    assert.equal(SMS_ACTIVATION_FEE_CENTS, 9900);
  });

  it("never uses floating-point for outbound charges", () => {
    // 7 segments × $0.035 = $0.245 → 245_000 micros
    assert.equal(outboundChargeMicros("TEXT_ESSENTIALS", 7), 245_000n);
    assert.equal(outboundChargeMicros("TEXT_ENTRY", 3), 150_000n);
    assert.equal(outboundChargeMicros("TEXT_ADVANTAGE", 10), 250_000n);
  });
});

describe("SMS bundle discount", () => {
  const qualifying = ["GROWTH", "PRO", "PRO_PLUS"] as const;
  const nonqualifying = ["FREE", "STARTER"] as const;

  for (const email of qualifying) {
    it(`Growth/Pro/Pro Plus (${email}) + Essentials → $44.99`, () => {
      const r = resolveSmsPricing("TEXT_ESSENTIALS", { plan: email, active: true });
      assert.equal(r.appliedMonthlyPriceCents, 4499);
      assert.equal(r.bundleDiscountPercent, 10);
      assert.equal(r.bundleEligibilitySource, `email-plan:${email}`);
      // Usage rates never discounted
      assert.equal(r.outboundSegmentPriceMicros, 35_000);
      assert.equal(r.inboundOveragePriceMicros, 25_000);
      assert.equal(r.activationFeeCents, 9900);
    });

    it(`${email} + Advantage → $89.99`, () => {
      const r = resolveSmsPricing("TEXT_ADVANTAGE", { plan: email, active: true });
      assert.equal(r.appliedMonthlyPriceCents, 8999);
      assert.equal(r.bundleDiscountPercent, 10);
    });
  }

  for (const email of nonqualifying) {
    it(`${email} + Essentials does NOT discount`, () => {
      const r = resolveSmsPricing("TEXT_ESSENTIALS", { plan: email, active: true });
      assert.equal(r.appliedMonthlyPriceCents, 4999);
      assert.equal(r.bundleDiscountPercent, 0);
      assert.equal(r.bundleEligibilitySource, null);
    });

    it(`${email} + Advantage does NOT discount`, () => {
      const r = resolveSmsPricing("TEXT_ADVANTAGE", { plan: email, active: true });
      assert.equal(r.appliedMonthlyPriceCents, 9999);
    });
  }

  for (const email of [...qualifying, ...nonqualifying]) {
    it(`Text Entry never receives a bundle discount with ${email}`, () => {
      assert.equal(isBundleEligible("TEXT_ENTRY", { plan: email, active: true }), false);
      const r = resolveSmsPricing("TEXT_ENTRY", { plan: email, active: true });
      assert.equal(r.appliedMonthlyPriceCents, 1999);
      assert.equal(r.bundleDiscountPercent, 0);
    });
  }

  it("paused/unpaid/cancelled email plan does not qualify", () => {
    assert.equal(isBundleEligible("TEXT_ESSENTIALS", { plan: "GROWTH", active: false }), false);
    const r = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "GROWTH", active: false });
    assert.equal(r.appliedMonthlyPriceCents, 4999);
  });

  it("annual email subscriptions still qualify when active", () => {
    // Interval is irrelevant — only plan + active status matter.
    assert.equal(isBundleEligible("TEXT_ADVANTAGE", { plan: "PRO_PLUS", active: true }), true);
  });

  it("email upgrade applies the discount", () => {
    const before = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "STARTER", active: true });
    const after = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "GROWTH", active: true });
    assert.equal(before.appliedMonthlyPriceCents, 4999);
    assert.equal(after.appliedMonthlyPriceCents, 4499);
  });

  it("email downgrade / cancellation removes the discount only", () => {
    const before = resolveSmsPricing("TEXT_ADVANTAGE", { plan: "PRO", active: true });
    const after = resolveSmsPricing("TEXT_ADVANTAGE", { plan: "FREE", active: true });
    assert.equal(before.appliedMonthlyPriceCents, 8999);
    assert.equal(after.appliedMonthlyPriceCents, 9999);
    // Usage rates unchanged either way
    assert.equal(before.outboundSegmentPriceMicros, after.outboundSegmentPriceMicros);
  });

  it("email payment failure removes eligibility", () => {
    assert.equal(isBundleEligible("TEXT_ESSENTIALS", { plan: "PRO", active: false }), false);
  });

  it("SMS plan change keeps discount rules for the new plan", () => {
    const email = { plan: "GROWTH" as const, active: true };
    assert.equal(resolveSmsPricing("TEXT_ENTRY", email).appliedMonthlyPriceCents, 1999);
    assert.equal(resolveSmsPricing("TEXT_ESSENTIALS", email).appliedMonthlyPriceCents, 4499);
    assert.equal(resolveSmsPricing("TEXT_ADVANTAGE", email).appliedMonthlyPriceCents, 8999);
  });
});

describe("SMS inbound allowance", () => {
  it("charges nothing until the included allowance is exceeded", () => {
    assert.equal(billableInboundSegments("TEXT_ENTRY", 100), 0);
    assert.equal(inboundOverageChargeMicros("TEXT_ENTRY", 100), 0n);
  });

  it("bills the first overage segment at $0.025", () => {
    assert.equal(billableInboundSegments("TEXT_ENTRY", 101), 1);
    assert.equal(inboundOverageChargeMicros("TEXT_ENTRY", 101), 25_000n);
  });

  it("handles multi-segment inbound past the boundary", () => {
    // Essentials includes 300; 305 inbound → 5 overage × $0.025
    assert.equal(billableInboundSegments("TEXT_ESSENTIALS", 305), 5);
    assert.equal(inboundOverageChargeMicros("TEXT_ESSENTIALS", 305), 125_000n);
  });

  it("fires 75/90/100% inbound alerts", () => {
    // Text Entry = 100 included
    assert.deepEqual(crossedInboundThresholds("TEXT_ENTRY", 74), []);
    assert.deepEqual(crossedInboundThresholds("TEXT_ENTRY", 75), [75]);
    assert.deepEqual(crossedInboundThresholds("TEXT_ENTRY", 90), [75, 90]);
    assert.deepEqual(crossedInboundThresholds("TEXT_ENTRY", 100), [75, 90, 100]);
  });

  // Exhaustive plan outbound rates
  const plans: SmsPlanKey[] = ["TEXT_ENTRY", "TEXT_ESSENTIALS", "TEXT_ADVANTAGE"];
  for (const plan of plans) {
    it(`${plan} outbound rate is integer micros`, () => {
      assert.equal(Number.isInteger(SMS_PLANS[plan].outboundSegmentPriceMicros), true);
      assert.equal(outboundChargeMicros(plan, 0), 0n);
    });
  }
});
