import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  STRIPE_BILLING_DISABLED_MESSAGE,
  canCreateCheckoutSession,
  isStripeBillingEnabled,
  isStripeOwnerTestEnabled,
} from "../stripe-billing-gate";
import {
  planFromPriceId,
  priceIdFor,
  assertStripeAccountAllowed,
  assertStripeLiveMode,
} from "../stripe";

describe("stripe-billing-gate", () => {
  const keys = [
    "STRIPE_BILLING_ENABLED",
    "STRIPE_OWNER_TEST_ENABLED",
    "STRIPE_PRICE_STARTER_MONTHLY",
    "STRIPE_PRICE_STARTER_ANNUAL",
    "STRIPE_PRICE_STARTER_YEARLY",
    "STRIPE_PRICE_GROWTH_ANNUAL",
    "STRIPE_PRICE_GROWTH_YEARLY",
    "STRIPE_EXPECTED_ACCOUNT_ID",
    "NODE_ENV",
  ] as const;
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) prev[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of keys) {
      if (k === "NODE_ENV") {
        const env = process.env as { NODE_ENV?: string };
        if (prev[k] === undefined) delete env.NODE_ENV;
        else env.NODE_ENV = prev[k];
        continue;
      }
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  it("defaults billing disabled when missing", () => {
    delete process.env.STRIPE_BILLING_ENABLED;
    delete process.env.STRIPE_OWNER_TEST_ENABLED;
    assert.equal(isStripeBillingEnabled(), false);
    assert.equal(isStripeOwnerTestEnabled(), false);
    assert.equal(canCreateCheckoutSession("chris@iscreamstudio.com"), false);
    assert.equal(canCreateCheckoutSession("other@example.com"), false);
  });

  it("allows checkout when STRIPE_BILLING_ENABLED=true", () => {
    process.env.STRIPE_BILLING_ENABLED = "true";
    process.env.STRIPE_OWNER_TEST_ENABLED = "false";
    assert.equal(isStripeBillingEnabled(), true);
    assert.equal(canCreateCheckoutSession("anyone@example.com"), true);
  });

  it("allows only owner when STRIPE_OWNER_TEST_ENABLED=true", () => {
    process.env.STRIPE_BILLING_ENABLED = "false";
    process.env.STRIPE_OWNER_TEST_ENABLED = "true";
    assert.equal(canCreateCheckoutSession("chris@iscreamstudio.com"), true);
    assert.equal(canCreateCheckoutSession("Chris@IsCreamStudio.com"), true);
    assert.equal(canCreateCheckoutSession("other@example.com"), false);
    assert.equal(STRIPE_BILLING_DISABLED_MESSAGE, "Billing is not activated yet.");
  });

  it("resolves ANNUAL price env and maps plan", () => {
    process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_m";
    process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_a";
    delete process.env.STRIPE_PRICE_STARTER_YEARLY;
    assert.equal(priceIdFor("STARTER", "month"), "price_m");
    assert.equal(priceIdFor("STARTER", "year"), "price_a");
    assert.deepEqual(planFromPriceId("price_a"), { plan: "STARTER", interval: "year" });
  });

  it("falls back to YEARLY alias", () => {
    delete process.env.STRIPE_PRICE_GROWTH_ANNUAL;
    process.env.STRIPE_PRICE_GROWTH_YEARLY = "price_gy";
    assert.equal(priceIdFor("GROWTH", "year"), "price_gy");
  });

  it("rejects wrong Connect account id", () => {
    process.env.STRIPE_EXPECTED_ACCOUNT_ID = "acct_sendfable";
    assert.throws(() => assertStripeAccountAllowed("acct_rental"), /mismatch/);
    assert.doesNotThrow(() => assertStripeAccountAllowed(undefined));
    assert.doesNotThrow(() => assertStripeAccountAllowed("acct_sendfable"));
  });

  it("rejects non-live events in production", () => {
    const env = process.env as { NODE_ENV?: string };
    env.NODE_ENV = "production";
    assert.throws(() => assertStripeLiveMode(false), /livemode/);
    assert.doesNotThrow(() => assertStripeLiveMode(true));
  });
});
