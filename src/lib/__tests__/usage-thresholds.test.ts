/**
 * Usage threshold helpers for Free→Paid prompts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  crossedUsageThreshold,
  nextMonthlySendResetLabel,
  usagePercent,
  usagePromptCopy,
} from "../usage-thresholds";
import { PLANS } from "../plans";

describe("usage thresholds", () => {
  it("computes percent and crossed stages (no nudge under 80%)", () => {
    assert.equal(usagePercent(0, 1000), 0);
    assert.equal(usagePercent(800, 1000), 80);
    assert.equal(crossedUsageThreshold(790, 1000), null);
    assert.equal(crossedUsageThreshold(799, 1000), null);
    assert.equal(crossedUsageThreshold(800, 1000), 80);
    assert.equal(crossedUsageThreshold(900, 1000), 90);
    assert.equal(crossedUsageThreshold(1000, 1000), 100);
  });

  it("writes contextual Free-plan copy without manufactured urgency", () => {
    const subtle = usagePromptCopy({
      metric: "emails",
      used: 823,
      cap: PLANS.FREE.emailsPerMonth,
      planName: "Free",
    });
    assert.equal(subtle.tone, "subtle");
    assert.match(subtle.title, /823/);
    assert.match(subtle.body, new RegExp(PLANS.STARTER.emailsPerMonth.toLocaleString()));
    assert.ok(!/lose access|before it's too late|upgrade now/i.test(subtle.title + subtle.body));

    const contacts = usagePromptCopy({
      metric: "contacts",
      used: 400,
      cap: PLANS.FREE.contactCap,
      planName: "Free",
    });
    assert.equal(contacts.tone, "subtle");
    assert.match(contacts.title, /400/);
    assert.match(contacts.body, new RegExp(PLANS.STARTER.contactCap.toLocaleString()));

    const block = usagePromptCopy({
      metric: "emails",
      used: 1000,
      cap: 1000,
      planName: "Free",
      resetLabel: "September 1, 2026",
    });
    assert.equal(block.tone, "blocking");
    assert.match(block.body, /September 1, 2026/);
    assert.match(block.body, /stay put|contacts/i);
    assert.ok(!/disappear|deleted|lose your list/i.test(block.body));
  });

  it("labels next UTC month reset without inventing dates", () => {
    const label = nextMonthlySendResetLabel(new Date(Date.UTC(2026, 7, 7))); // Aug 7
    assert.match(label, /September/);
    assert.match(label, /1/);
    assert.match(label, /2026/);
  });
});
