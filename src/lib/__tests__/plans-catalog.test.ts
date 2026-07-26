import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANNUAL_SAVINGS_LABEL,
  PAID_PLAN_ORDER,
  PLAN_ALLOWANCE_EXPLANATION,
  PLAN_ORDER,
  PLAN_STRIPE_CENTS,
  PLANS,
  annualEffectiveMonthly,
  annualIsTwoMonthsFree,
  sendfablePlanFor,
  upToContacts,
  upToEmails,
} from "@/lib/plans";

describe("five-plan catalog 2026-07", () => {
  it("orders Free → Starter → Growth → Pro → Pro Plus", () => {
    assert.deepEqual(PLAN_ORDER, ["FREE", "STARTER", "GROWTH", "PRO", "PRO_PLUS"]);
    assert.deepEqual([...PAID_PLAN_ORDER], ["STARTER", "GROWTH", "PRO", "PRO_PLUS"]);
  });

  it("matches approved prices and limits", () => {
    assert.deepEqual(
      {
        c: PLANS.FREE.contactCap,
        e: PLANS.FREE.emailsPerMonth,
        m: PLANS.FREE.monthlyPrice,
        y: PLANS.FREE.yearlyPrice,
      },
      { c: 500, e: 1_000, m: 0, y: 0 }
    );
    assert.deepEqual(
      {
        c: PLANS.STARTER.contactCap,
        e: PLANS.STARTER.emailsPerMonth,
        m: PLANS.STARTER.monthlyPrice,
        y: PLANS.STARTER.yearlyPrice,
      },
      { c: 2_500, e: 10_000, m: 12, y: 120 }
    );
    assert.deepEqual(
      {
        c: PLANS.GROWTH.contactCap,
        e: PLANS.GROWTH.emailsPerMonth,
        m: PLANS.GROWTH.monthlyPrice,
        y: PLANS.GROWTH.yearlyPrice,
      },
      { c: 10_000, e: 40_000, m: 29, y: 290 }
    );
    assert.deepEqual(
      {
        c: PLANS.PRO.contactCap,
        e: PLANS.PRO.emailsPerMonth,
        m: PLANS.PRO.monthlyPrice,
        y: PLANS.PRO.yearlyPrice,
        seats: PLANS.PRO.seats,
      },
      { c: 20_000, e: 80_000, m: 69, y: 690, seats: 5 }
    );
    assert.deepEqual(
      {
        c: PLANS.PRO_PLUS.contactCap,
        e: PLANS.PRO_PLUS.emailsPerMonth,
        m: PLANS.PRO_PLUS.monthlyPrice,
        y: PLANS.PRO_PLUS.yearlyPrice,
        seats: PLANS.PRO_PLUS.seats,
      },
      { c: 40_000, e: 200_000, m: 99, y: 990, seats: 10 }
    );
  });

  it("campaign-footer badge is boolean; only Free requires branding", () => {
    for (const plan of PLAN_ORDER) {
      assert.equal(typeof PLANS[plan].badge, "boolean");
    }
    assert.equal(PLANS.FREE.badge, true);
    assert.equal(PLANS.STARTER.badge, false);
    assert.equal(PLANS.GROWTH.badge, false);
    assert.equal(PLANS.PRO.badge, false);
    assert.equal(PLANS.PRO_PLUS.badge, false);
    // Regression: Pro Plus seats (10) must never be reported as a badge value
    assert.equal(PLANS.PRO_PLUS.seats, 10);
    assert.notEqual(String(PLANS.PRO_PLUS.badge), "Up to 10");
    assert.notEqual(PLANS.PRO_PLUS.badge as unknown, 10);
  });

  it("annual billing equals two months free", () => {
    for (const plan of PAID_PLAN_ORDER) {
      assert.equal(annualIsTwoMonthsFree(plan), true);
      assert.equal(PLANS[plan].yearlyPrice, PLANS[plan].monthlyPrice * 10);
      // Effective monthly on annual = yearly/12 (e.g. $12/mo → $120/yr → $10/mo billed yearly)
      assert.equal(annualEffectiveMonthly(plan), Math.round(PLANS[plan].yearlyPrice / 12));
    }
    assert.match(ANNUAL_SAVINGS_LABEL, /Two months free/i);
  });

  it("Stripe cents match dollar catalog", () => {
    assert.deepEqual(PLAN_STRIPE_CENTS.STARTER, { monthly: 1_200, annual: 12_000 });
    assert.deepEqual(PLAN_STRIPE_CENTS.GROWTH, { monthly: 2_900, annual: 29_000 });
    assert.deepEqual(PLAN_STRIPE_CENTS.PRO, { monthly: 6_900, annual: 69_000 });
    assert.deepEqual(PLAN_STRIPE_CENTS.PRO_PLUS, { monthly: 9_900, annual: 99_000 });
  });

  it("uses Up to wording helpers", () => {
    assert.equal(upToContacts("GROWTH"), "Up to 10,000 contacts");
    assert.equal(upToEmails("GROWTH"), "Up to 40,000 emails/month");
    assert.match(PLAN_ALLOWANCE_EXPLANATION, /calendar month/i);
    assert.match(PLAN_ALLOWANCE_EXPLANATION, /do not roll over/i);
  });

  it("recommends plan by contact volume including Pro Plus", () => {
    assert.equal(sendfablePlanFor(400).plan, "FREE");
    assert.equal(sendfablePlanFor(2_000).plan, "STARTER");
    assert.equal(sendfablePlanFor(8_000).plan, "GROWTH");
    assert.equal(sendfablePlanFor(15_000).plan, "PRO");
    assert.equal(sendfablePlanFor(35_000).plan, "PRO_PLUS");
  });

  it("rejects stale public price/limit values", () => {
    const staleMonthly = [9, 19, 49];
    const staleYearly = [90, 190, 490];
    const staleEmails = [2_000, 15_000, 60_000];
    const staleContacts = [30_000];
    for (const plan of PLAN_ORDER) {
      assert.equal(staleMonthly.includes(PLANS[plan].monthlyPrice), false);
      assert.equal(staleYearly.includes(PLANS[plan].yearlyPrice), false);
      if (plan === "FREE") {
        assert.notEqual(PLANS.FREE.emailsPerMonth, 2_000);
      } else {
        assert.equal(staleEmails.includes(PLANS[plan].emailsPerMonth), false);
      }
      assert.equal(staleContacts.includes(PLANS[plan].contactCap), false);
    }
  });
});
