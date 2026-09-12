/**
 * Channel routing + contact eligibility matrix.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  contactEligibleForChannel,
  needsEmailLeg,
  needsSmsLeg,
} from "../campaign-channel";
import { businessEmailLocalScore } from "../acquisition/normalize";
import { ENTERPRISE_DOMAIN_BLOCKLIST } from "../acquisition/discovery/overpass";

describe("campaign channel routing", () => {
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
  const both = {
    email: "a@example.com",
    phoneE164: "+13125551212",
    emailSubscribed: true,
    smsSubscribed: true,
  };

  it("EMAIL campaign includes email contacts only", () => {
    assert.deepEqual(contactEligibleForChannel(emailOnly, "EMAIL"), {
      email: true,
      sms: false,
    });
    assert.deepEqual(contactEligibleForChannel(phoneOnly, "EMAIL"), {
      email: false,
      sms: false,
    });
    assert.deepEqual(contactEligibleForChannel(both, "EMAIL"), {
      email: true,
      sms: false,
    });
  });

  it("SMS campaign includes SMS-consented phones only", () => {
    assert.deepEqual(contactEligibleForChannel(emailOnly, "SMS"), {
      email: false,
      sms: false,
    });
    assert.deepEqual(contactEligibleForChannel(phoneOnly, "SMS"), {
      email: false,
      sms: true,
    });
    assert.deepEqual(contactEligibleForChannel(both, "SMS"), {
      email: false,
      sms: true,
    });
  });

  it("BOTH campaign can include each channel independently", () => {
    assert.deepEqual(contactEligibleForChannel(both, "BOTH"), {
      email: true,
      sms: true,
    });
    assert.deepEqual(contactEligibleForChannel(emailOnly, "BOTH"), {
      email: true,
      sms: false,
    });
    assert.deepEqual(contactEligibleForChannel(phoneOnly, "BOTH"), {
      email: false,
      sms: true,
    });
  });

  it("needsEmailLeg / needsSmsLeg", () => {
    assert.equal(needsEmailLeg("EMAIL"), true);
    assert.equal(needsSmsLeg("EMAIL"), false);
    assert.equal(needsEmailLeg("SMS"), false);
    assert.equal(needsSmsLeg("SMS"), true);
    assert.equal(needsEmailLeg("BOTH"), true);
    assert.equal(needsSmsLeg("BOTH"), true);
  });
});

describe("acquisition email preference", () => {
  it("ranks role inboxes above info@", () => {
    assert.ok(businessEmailLocalScore("hello") > businessEmailLocalScore("info"));
    assert.ok(businessEmailLocalScore("owner") > businessEmailLocalScore("info"));
  });

  it("blocks known national chains", () => {
    assert.equal(ENTERPRISE_DOMAIN_BLOCKLIST.has("firstwatch.com"), true);
    assert.equal(ENTERPRISE_DOMAIN_BLOCKLIST.has("starbucks.com"), true);
  });
});
