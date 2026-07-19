import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Mirror of the production rule: bounced/complained cannot return to subscribed. */
function canSetSubscribed(current: string, next: string): boolean {
  if (next === "SUBSCRIBED" && (current === "BOUNCED" || current === "COMPLAINED")) {
    return false;
  }
  return true;
}

describe("contact status guard", () => {
  it("blocks bounce → subscribed", () => {
    assert.equal(canSetSubscribed("BOUNCED", "SUBSCRIBED"), false);
  });
  it("blocks complaint → subscribed", () => {
    assert.equal(canSetSubscribed("COMPLAINED", "SUBSCRIBED"), false);
  });
  it("allows subscribed → unsubscribed", () => {
    assert.equal(canSetSubscribed("SUBSCRIBED", "UNSUBSCRIBED"), true);
  });
});
