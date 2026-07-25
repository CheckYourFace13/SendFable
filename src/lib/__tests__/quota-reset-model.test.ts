import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ensureSendCountReset uses UTC calendar-month boundaries (not Stripe
 * billing-anniversary). Documented in PLAN_ALLOWANCE_EXPLANATION.
 */
describe("monthly send reset model", () => {
  it("quota module resets on UTC calendar month change", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/quota.ts"), "utf8");
    assert.match(src, /getUTCFullYear/);
    assert.match(src, /getUTCMonth/);
    assert.match(src, /monthlySendCount:\s*0/);
    assert.doesNotMatch(src, /billing.?anniversary|current_period_start/i);
  });

  it("customer-facing copy says calendar month", () => {
    const plans = readFileSync(join(process.cwd(), "src/lib/plans.ts"), "utf8");
    assert.match(plans, /reset each calendar month/i);
  });
});
