import { describe, it } from "node:test";
import assert from "node:assert/strict";

function shouldAcceptLead(input: { websiteTrap?: string; consent: boolean }): {
  ok: boolean;
  spam?: boolean;
} {
  if (!input.consent) return { ok: false };
  if (input.websiteTrap) return { ok: true, spam: true };
  return { ok: true, spam: false };
}

describe("early access spam gate", () => {
  it("rejects without consent", () => {
    assert.equal(shouldAcceptLead({ consent: false }).ok, false);
  });
  it("treats honeypot as silent success", () => {
    const r = shouldAcceptLead({ consent: true, websiteTrap: "http://spam" });
    assert.equal(r.ok, true);
    assert.equal(r.spam, true);
  });
  it("accepts clean consent", () => {
    const r = shouldAcceptLead({ consent: true });
    assert.equal(r.ok, true);
    assert.equal(r.spam, false);
  });
});
