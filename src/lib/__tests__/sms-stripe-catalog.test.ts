/**
 * SF-016 guards: catalog lookup keys, live-mode confirm, no-charge surface.
 * Pure unit tests — no Stripe network calls.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SMS_STRIPE_LOOKUP_KEYS, SMS_STRIPE_METER_EVENTS } from "../sms/stripe";
import { SMS_FLAG_DEFAULTS, smsFlagSnapshot } from "../sms/flags";
import {
  SMS_ACTIVATION_FEE_CENTS,
  inboundOverageChargeMicros,
  microsToCentsFloor,
  outboundChargeMicros,
  resolveSmsPricing,
} from "../sms/pricing";

const setupSrc = readFileSync(join(process.cwd(), "scripts/stripe-sms-setup.ts"), "utf8");

describe("SF-016 Stripe SMS catalog script guards", () => {
  it("defaults to dry-run (no confirm = no writes)", () => {
    assert.match(setupSrc, /DRY RUN BY DEFAULT/);
    assert.match(setupSrc, /--confirm-live-sms-catalog/);
    assert.match(setupSrc, /--preflight-live/);
  });

  it("refuses checkout, subscriptions, invoices, charges, meter events", () => {
    for (const forbidden of [
      "checkout.sessions.create",
      "subscriptions.create",
      "invoices.create",
      "invoiceItems.create",
      "charges.create",
      "paymentIntents.create",
      "customers.create",
      "meterEvents.create",
      "billing.meterEvents.create",
    ]) {
      assert.equal(setupSrc.includes(forbidden), false, `must not call ${forbidden}`);
    }
  });

  it("creates products as active=false", () => {
    assert.match(setupSrc, /active:\s*false/);
  });

  it("live catalog mode does not require SMS billing flag", () => {
    assert.match(setupSrc, /live-catalog/);
    assert.match(setupSrc, /must remain false during catalog-only/);
  });

  it("uses stable v1 lookup keys matching app constants", () => {
    for (const key of Object.values(SMS_STRIPE_LOOKUP_KEYS)) {
      assert.ok(setupSrc.includes(key), `script missing lookup ${key}`);
      assert.ok(key.startsWith("sendfable_sms_"));
      assert.ok(key.endsWith("_v1"));
    }
  });

  it("defines four billing meter event names", () => {
    assert.equal(Object.keys(SMS_STRIPE_METER_EVENTS).length, 4);
    for (const ev of Object.values(SMS_STRIPE_METER_EVENTS)) {
      assert.ok(setupSrc.includes(ev), `script missing meter event ${ev}`);
    }
  });
});

describe("SF-016 SMS flags remain dark", () => {
  it("all customer-facing SMS flags default false", () => {
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_PUBLIC_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_BILLING_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_REGISTRATION_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_LIVE_SENDING_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_INBOUND_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_REPLY_ENABLED, false);
  });

  it("snapshot without env overrides stays dark", () => {
    const snap = smsFlagSnapshot();
    assert.equal(snap.SENDFABLE_SMS_PUBLIC_ENABLED, false);
    assert.equal(snap.SENDFABLE_SMS_BILLING_ENABLED, false);
  });
});

describe("SF-016 local invoice simulation totals", () => {
  it("1 Text Entry + 100 outbound = $24.99", () => {
    const fixed = resolveSmsPricing("TEXT_ENTRY", { plan: "FREE", active: true }).appliedMonthlyPriceCents;
    const usage = microsToCentsFloor(outboundChargeMicros("TEXT_ENTRY", 100));
    assert.equal(fixed + usage, 2499);
  });

  it("2 Text Essentials + 1000 outbound = $84.99", () => {
    const fixed = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "STARTER", active: true })
      .appliedMonthlyPriceCents;
    const usage = microsToCentsFloor(outboundChargeMicros("TEXT_ESSENTIALS", 1000));
    assert.equal(fixed + usage, 8499);
  });

  it("3 Text Essentials bundled Growth = $44.99", () => {
    assert.equal(
      resolveSmsPricing("TEXT_ESSENTIALS", { plan: "GROWTH", active: true }).appliedMonthlyPriceCents,
      4499
    );
  });

  it("4 Text Advantage + 5000 outbound = $224.99", () => {
    const fixed = resolveSmsPricing("TEXT_ADVANTAGE", { plan: "STARTER", active: true })
      .appliedMonthlyPriceCents;
    const usage = microsToCentsFloor(outboundChargeMicros("TEXT_ADVANTAGE", 5000));
    assert.equal(fixed + usage, 22499);
  });

  it("5 Text Advantage bundled Pro = $89.99", () => {
    assert.equal(
      resolveSmsPricing("TEXT_ADVANTAGE", { plan: "PRO", active: true }).appliedMonthlyPriceCents,
      8999
    );
  });

  it("6 inbound within allowance = $0 overage", () => {
    assert.equal(microsToCentsFloor(inboundOverageChargeMicros("TEXT_ENTRY", 100)), 0);
  });

  it("7 one inbound over = $0.02", () => {
    assert.equal(microsToCentsFloor(inboundOverageChargeMicros("TEXT_ENTRY", 101)), 2);
  });

  it("8 activation fee = $99.00", () => {
    assert.equal(SMS_ACTIVATION_FEE_CENTS, 9900);
  });

  it("11 bundle removal returns Essentials to $49.99", () => {
    assert.equal(
      resolveSmsPricing("TEXT_ESSENTIALS", { plan: "GROWTH", active: false }).appliedMonthlyPriceCents,
      4999
    );
  });
});
