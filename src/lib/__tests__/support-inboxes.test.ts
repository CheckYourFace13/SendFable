import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SUPPORT_INBOXES, inboxForTopic } from "../support-inboxes";

describe("support inboxes", () => {
  it("maps topics to live Sendfable mailboxes", () => {
    assert.equal(inboxForTopic("general"), "support@sendfable.com");
    assert.equal(inboxForTopic("billing"), "support@sendfable.com");
    assert.equal(inboxForTopic("privacy"), "privacy@sendfable.com");
    assert.equal(inboxForTopic("abuse"), "abuse@sendfable.com");
    assert.equal(inboxForTopic("security"), "security@sendfable.com");
    assert.equal(inboxForTopic("legal"), "legal@sendfable.com");
  });

  it("falls back to support for unknown topics", () => {
    assert.equal(inboxForTopic("unknown"), SUPPORT_INBOXES.general);
  });
});
