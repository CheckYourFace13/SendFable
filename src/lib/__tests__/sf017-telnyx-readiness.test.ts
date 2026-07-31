/**
 * SF-017 Telnyx webhook signature + replay + consent disclosure guards.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  TelnyxSmsProvider,
  verifyTelnyxEd25519,
} from "../sms/telnyx-provider";
import {
  buildSmsConsentDisclosure,
  buildSmsHelpReply,
  buildSmsStopReply,
  SMS_CONSENT_DISCLOSURE_VERSION,
} from "../sms/consent";
import {
  canEncryptSmsSensitiveData,
  decryptSmsSensitive,
  encryptSmsSensitive,
  redactEin,
} from "../sms/sensitive";
import { MOCK_PROVIDER_COSTS } from "../sms/mock-provider";

describe("SF-017 Telnyx Ed25519 webhook verification", () => {
  it("accepts a valid ed25519 signature and rejects tampering / stale timestamps", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pubRaw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
    const pubB64 = pubRaw.toString("base64");

    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ data: { event_type: "message.received", id: "evt_1" } });
    const sig = sign(null, Buffer.from(`${timestamp}|${body}`), privateKey).toString("base64");

    assert.equal(verifyTelnyxEd25519(body, timestamp, sig, pubB64), true);
    assert.equal(verifyTelnyxEd25519(body + "x", timestamp, sig, pubB64), false);

    const provider = new TelnyxSmsProvider();
    const prev = process.env.TELNYX_PUBLIC_KEY;
    process.env.TELNYX_PUBLIC_KEY = pubB64;
    try {
      const ok = provider.validateWebhook(body, {
        "telnyx-timestamp": timestamp,
        "telnyx-signature-ed25519": sig,
        "telnyx-signature-hmac": null,
      });
      assert.equal(ok.valid, true);

      const stale = provider.validateWebhook(body, {
        "telnyx-timestamp": String(Math.floor(Date.now() / 1000) - 10_000),
        "telnyx-signature-ed25519": sig,
        "telnyx-signature-hmac": null,
      });
      assert.equal(stale.valid, false);
      assert.match(stale.reason || "", /stale|invalid timestamp/i);
    } finally {
      if (prev === undefined) delete process.env.TELNYX_PUBLIC_KEY;
      else process.env.TELNYX_PUBLIC_KEY = prev;
    }
  });
});

describe("SF-017 consent disclosure", () => {
  it("names the end business and includes required disclosures", () => {
    const text = buildSmsConsentDisclosure({
      brandName: "Acme Bakery",
      privacyPolicyUrl: "https://sendfable.com/privacy",
      smsTermsUrl: "https://sendfable.com/terms",
    });
    assert.match(text, /Acme Bakery/);
    assert.match(text, /Message frequency varies/i);
    assert.match(text, /Message and data rates may apply/i);
    assert.match(text, /STOP/);
    assert.match(text, /HELP/);
    assert.match(text, /not a condition of purchase/i);
    assert.match(text, /Privacy Policy/);
    assert.match(text, /SMS Terms/);
    assert.match(text, /will not be sold/i);
    assert.ok(SMS_CONSENT_DISCLOSURE_VERSION.startsWith("sms-consent-"));
  });

  it("builds brand-specific HELP and STOP replies", () => {
    assert.match(buildSmsHelpReply({ brandName: "Acme", supportEmail: "hi@acme.test" }), /Acme/);
    assert.match(buildSmsStopReply("Acme"), /unsubscribed from Acme/i);
  });
});

describe("SF-017 sensitive EIN encryption", () => {
  it("encrypts and decrypts when key is set; redacts for logs", () => {
    const prev = process.env.SMS_SENSITIVE_DATA_KEY;
    process.env.SMS_SENSITIVE_DATA_KEY = Buffer.alloc(32, 7).toString("base64");
    try {
      assert.equal(canEncryptSmsSensitiveData(), true);
      const ct = encryptSmsSensitive("12-3456789");
      assert.ok(ct);
      assert.equal(decryptSmsSensitive(ct!), "12-3456789");
      assert.match(redactEin("12-3456789"), /6789$/);
      assert.ok(!redactEin("12-3456789").includes("12-345"));
    } finally {
      if (prev === undefined) delete process.env.SMS_SENSITIVE_DATA_KEY;
      else process.env.SMS_SENSITIVE_DATA_KEY = prev;
    }
  });
});

describe("SF-017 ISV cost assumptions", () => {
  it("assumes registration one-time near activation fee coverage", () => {
    // $99 activation = 99_000_000 micros; assumed one-time registry path < that
    assert.ok(MOCK_PROVIDER_COSTS.registrationOneTimeMicros < 99_000_000n);
    assert.equal(MOCK_PROVIDER_COSTS.campaignMonthlyMicros, 10_000_000n);
  });
});
