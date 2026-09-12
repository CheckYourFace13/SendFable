/**
 * Contact intake identifier + eligibility helpers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateIntakeIdentifiers } from "../sms/contact-intake";
import { contactEligibleForChannel } from "../campaign-channel";
import { applyOptIn, applyOptOut, canSendMarketingSms, isStopMessage, isHelpMessage } from "../sms/consent";

describe("contact intake identifiers", () => {
  it("accepts email-only", () => {
    const r = validateIntakeIdentifiers("John@Example.COM", null);
    assert.equal(r.ok, true);
    assert.equal(r.email, "john@example.com");
    assert.equal(r.phoneE164, null);
  });

  it("accepts phone-only", () => {
    const r = validateIntakeIdentifiers(null, "3125551212");
    assert.equal(r.ok, true);
    assert.equal(r.email, null);
    assert.equal(r.phoneE164, "+13125551212");
  });

  it("accepts email + phone", () => {
    const r = validateIntakeIdentifiers("a@b.co", "(312) 555-1212");
    assert.equal(r.ok, true);
    assert.equal(r.email, "a@b.co");
    assert.equal(r.phoneE164, "+13125551212");
  });

  it("rejects empty identifiers", () => {
    const r = validateIntakeIdentifiers("", "");
    assert.equal(r.ok, false);
  });

  it("rejects invalid email when no phone", () => {
    const r = validateIntakeIdentifiers("not-an-email", null);
    assert.equal(r.ok, false);
  });
});

describe("channel exclusion matrix", () => {
  it("excludes email-only from SMS and phone-only from email", () => {
    const emailOnly = {
      email: "a@example.com",
      phoneE164: null,
      emailSubscribed: true,
      smsSubscribed: false,
    };
    const phoneOnly = {
      email: null,
      phoneE164: "+13125551212",
      emailSubscribed: false,
      smsSubscribed: true,
    };
    assert.deepEqual(contactEligibleForChannel(emailOnly, "SMS"), { email: false, sms: false });
    assert.deepEqual(contactEligibleForChannel(phoneOnly, "EMAIL"), { email: false, sms: false });
    assert.deepEqual(contactEligibleForChannel(phoneOnly, "SMS"), { email: false, sms: true });
    assert.deepEqual(contactEligibleForChannel(emailOnly, "BOTH"), { email: true, sms: false });
  });
});

describe("SMS consent independence", () => {
  it("does not allow marketing SMS without SUBSCRIBED", () => {
    assert.equal(canSendMarketingSms("PENDING_CONSENT", false).allowed, false);
    assert.equal(canSendMarketingSms("SUBSCRIBED", true).allowed, false);
    assert.equal(canSendMarketingSms("SUBSCRIBED", false).allowed, true);
  });

  it("STOP keywords are recognized", () => {
    for (const k of ["STOP", "stop", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]) {
      assert.equal(isStopMessage(k), true);
    }
    assert.equal(isHelpMessage("HELP"), true);
  });

  it("opt-out always wins; re-opt-in needs documented consent", () => {
    assert.equal(applyOptOut().nextStatus, "OPTED_OUT");
    const blocked = applyOptIn({
      currentStatus: "OPTED_OUT",
      source: "import:batch",
      disclosureVersion: null,
      suppressed: true,
      documentedNewOptIn: false,
    });
    assert.equal(blocked.accepted, false);
    const allowed = applyOptIn({
      currentStatus: "OPTED_OUT",
      source: "manual:detail",
      disclosureVersion: null,
      suppressed: true,
      documentedNewOptIn: true,
    });
    assert.equal(allowed.accepted, true);
    assert.equal(allowed.clearSuppression, true);
  });
});
