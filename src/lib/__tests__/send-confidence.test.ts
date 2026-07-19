import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSendConfidence } from "../send-confidence";

const base = {
  campaign: {
    subject: "Hello friends",
    previewText: "A note",
    compiledHtml: "<p>Hi {{first_name|there}}</p><a href=\"https://example.com\">x</a><p>unsubscribe</p>",
    designJson: null,
    rawHtmlMode: false,
    senderIdentityId: "s1",
    testSentAt: new Date(),
    audienceType: "all",
  },
  sender: {
    status: "VERIFIED" as const,
    type: "ADDRESS" as const,
    rewriteRequired: false,
    value: "hi@example.com",
  },
  workspace: { mailingAddress: "123 Main St", name: "Demo" },
  owner: {
    emailVerified: new Date(),
    plan: "FREE" as const,
    monthlySendCount: 0,
    sendingHeldAt: null,
    flaggedAt: null,
  },
  audienceSize: 10,
  suppressedCount: 0,
  recentBounceRate: 0,
  recentComplaintRate: 0,
};

describe("computeSendConfidence", () => {
  it("allows a healthy campaign", () => {
    const r = computeSendConfidence(base);
    assert.equal(r.canSend, true);
    assert.ok(r.score >= 70);
  });

  it("blocks missing mailing address", () => {
    const r = computeSendConfidence({
      ...base,
      workspace: { mailingAddress: "", name: "Demo" },
    });
    assert.equal(r.canSend, false);
    assert.ok(r.checks.some((c) => c.id === "address" && c.blocksSend));
  });

  it("blocks empty audience", () => {
    const r = computeSendConfidence({ ...base, audienceSize: 0 });
    assert.equal(r.canSend, false);
  });
});
