import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyOptIn,
  applyOptOut,
  canSendMarketingSms,
  isHelpMessage,
  isStopMessage,
} from "../sms/consent";
import { normalizeUsPhone, redactPhone, isPhoneHeader } from "../sms/phone";
import { emailToText, textToEmail, htmlToVisibleText } from "../sms/convert";
import { splitInboundSegments } from "../sms/usage";
import { MockSmsProvider } from "../sms/mock-provider";
import { buildMarginRow, DEFAULT_MARGIN_CONFIG, estimateStripeCostMicros } from "../sms/margin";
import { smsFlag, SMS_FLAG_DEFAULTS } from "../sms/flags";
import { usdStringToMicros } from "../sms/telnyx-provider";

describe("SMS STOP / HELP keywords", () => {
  for (const kw of ["STOP", "stop", "Stop.", " STOP ", "stopall", "UNSUBSCRIBE", "cancel", "end", "quit"]) {
    it(`recognizes opt-out keyword: ${JSON.stringify(kw)}`, () => {
      assert.equal(isStopMessage(kw), true);
    });
  }
  for (const kw of ["HELP", "help", "Help!", "INFO"]) {
    it(`recognizes help keyword: ${JSON.stringify(kw)}`, () => {
      assert.equal(isHelpMessage(kw), true);
    });
  }
  it("does not treat ordinary replies as STOP/HELP", () => {
    assert.equal(isStopMessage("please stop by tomorrow"), false);
    assert.equal(isHelpMessage("can you help me with my order"), false);
  });
});

describe("SMS consent transitions", () => {
  it("requires documented consent to subscribe", () => {
    const r = applyOptIn({
      currentStatus: "NOT_PROVIDED",
      source: "",
      disclosureVersion: null,
      suppressed: false,
      documentedNewOptIn: false,
    });
    assert.equal(r.accepted, false);
  });

  it("subscribes with documented consent", () => {
    const r = applyOptIn({
      currentStatus: "NOT_PROVIDED",
      source: "form:join",
      disclosureVersion: "v1",
      suppressed: false,
      documentedNewOptIn: true,
    });
    assert.equal(r.accepted, true);
    assert.equal(r.nextStatus, "SUBSCRIBED");
  });

  it("keeps a reimported opted-out number opted out", () => {
    const r = applyOptIn({
      currentStatus: "OPTED_OUT",
      source: "import:batch1",
      disclosureVersion: null,
      suppressed: true,
      documentedNewOptIn: false,
    });
    assert.equal(r.accepted, false);
    assert.equal(r.nextStatus, "OPTED_OUT");
    assert.equal(r.clearSuppression, false);
  });

  it("allows a documented NEW opt-in to clear STOP suppression", () => {
    const r = applyOptIn({
      currentStatus: "OPTED_OUT",
      source: "form:rejoin",
      disclosureVersion: "v1",
      suppressed: true,
      documentedNewOptIn: true,
    });
    assert.equal(r.accepted, true);
    assert.equal(r.nextStatus, "SUBSCRIBED");
    assert.equal(r.clearSuppression, true);
  });

  it("STOP always wins", () => {
    assert.deepEqual(applyOptOut(), { nextStatus: "OPTED_OUT", addSuppression: true });
  });

  it("blocks marketing without SUBSCRIBED + unsuppressed", () => {
    assert.equal(canSendMarketingSms("SUBSCRIBED", false).allowed, true);
    assert.equal(canSendMarketingSms("SUBSCRIBED", true).allowed, false);
    assert.equal(canSendMarketingSms("PENDING_CONSENT", false).allowed, false);
    assert.equal(canSendMarketingSms("NOT_PROVIDED", false).allowed, false);
  });
});

describe("Phone normalization", () => {
  it("accepts US formats and rejects invalid / non-US", () => {
    assert.equal(normalizeUsPhone("(312) 555-0123")?.e164, "+13125550123");
    assert.equal(normalizeUsPhone("3125550123")?.e164, "+13125550123");
    assert.equal(normalizeUsPhone("+13125550123")?.e164, "+13125550123");
    assert.equal(normalizeUsPhone("not-a-number"), null);
    assert.equal(normalizeUsPhone("+442071838750"), null); // UK — phase 1 US only
    assert.equal(normalizeUsPhone(""), null);
  });

  it("redacts full phone numbers from logs", () => {
    const r = redactPhone("+13125550123");
    assert.ok(r.startsWith("+1"));
    assert.ok(r.endsWith("23"));
    assert.ok(!r.includes("312555"));
  });

  it("auto-detects common phone CSV headers", () => {
    assert.equal(isPhoneHeader("Phone"), true);
    assert.equal(isPhoneHeader("mobile_number"), true);
    assert.equal(isPhoneHeader("Cell Phone"), true);
    assert.equal(isPhoneHeader("email"), false);
  });
});

describe("Inbound allowance split (pure)", () => {
  it("splits across the included boundary for Text Entry (100)", () => {
    // 98 used, 5 incoming → 2 included, 3 overage
    const r = splitInboundSegments("TEXT_ENTRY", 98, 5);
    assert.equal(r.included, 2);
    assert.equal(r.overage, 3);
    assert.equal(r.overageChargeMicros, 75_000n);
  });

  it("charges nothing when entirely within the allowance", () => {
    const r = splitInboundSegments("TEXT_ESSENTIALS", 10, 5);
    assert.equal(r.included, 5);
    assert.equal(r.overage, 0);
    assert.equal(r.overageChargeMicros, 0n);
  });
});

describe("Email ⇄ Text conversion (deterministic, never fabricates)", () => {
  it("builds a text draft from existing email content only", () => {
    const draft = emailToText({
      subject: "Saturday tasting",
      previewText: "Join us this weekend",
      compiledHtml: "<h1>Saturday tasting</h1><p>Doors open at 4pm.</p>",
      businessName: "Rivera Wines",
      ctaUrl: "https://example.com/tasting",
    });
    assert.ok(draft.body.includes("Rivera Wines"));
    assert.ok(draft.body.includes("Saturday tasting") || draft.body.includes("tasting"));
    assert.ok(draft.body.includes("https://example.com/tasting"));
    // Must not invent a discount / deadline that wasn't in the source
    assert.ok(!/\$\d+/.test(draft.body.replace(/https?:\/\/\S+/g, "")));
  });

  it("expands a text draft into email building blocks", () => {
    const draft = textToEmail({
      smsBody: "Rivera Wines: Saturday tasting. Doors open at 4pm. https://example.com/tasting",
      businessName: "Rivera Wines",
    });
    assert.ok(draft.suggestedSubject.length > 0);
    assert.equal(draft.ctaUrl, "https://example.com/tasting");
    assert.ok(draft.headline.toLowerCase().includes("tasting"));
  });

  it("strips HTML to visible text without inventing content", () => {
    assert.equal(htmlToVisibleText("<p>Hello <b>world</b></p>").trim(), "Hello world");
  });
});

describe("MockSmsProvider", () => {
  it("never calls a network, writes outbox, redacts phones, is deterministic", async () => {
    const mock = new MockSmsProvider({ writeToDisk: false });
    const a = await mock.sendMessage({
      workspaceId: "ws1",
      from: "+13125550100",
      to: "+13125550123",
      body: "Hello",
      idempotencyKey: "idem-1",
    });
    const b = await mock.sendMessage({
      workspaceId: "ws1",
      from: "+13125550100",
      to: "+13125550123",
      body: "Hello",
      idempotencyKey: "idem-1",
    });
    assert.equal(a.providerMessageId, b.providerMessageId); // same idempotency key
    assert.equal(a.status, "accepted");
    assert.equal(mock.sent.length, 2);
    assert.ok(mock.sent[0].toRedacted.includes("*"));
    assert.ok(!mock.sent[0].toRedacted.includes("55501"));
  });

  it("simulates failure for configured suffixes without network", async () => {
    const mock = new MockSmsProvider({ writeToDisk: false });
    const r = await mock.sendMessage({
      workspaceId: "ws1",
      from: "+13125550100",
      to: "+13125550000",
      body: "Hi",
      idempotencyKey: "fail-1",
    });
    assert.equal(r.status, "failed");
    assert.equal(r.errorCode, "MOCK_UNDELIVERABLE");
  });
});

describe("Margin / profitability", () => {
  it("warns when margin falls below the configured threshold", () => {
    const row = buildMarginRow({
      workspaceId: "ws1",
      plan: "TEXT_ENTRY",
      fixedFeeRevenueMicros: 19_990_000n, // $19.99
      outboundUsageRevenueMicros: 0n,
      inboundOverageRevenueMicros: 0n,
      activationRevenueMicros: 0n,
      exceptionalChargeRevenueMicros: 0n,
      telnyxMessageCostMicros: 0n,
      telnyxNumberCostMicros: 1_500_000n,
      telnyxRegistrationCostMicros: 0n,
      carrierSurchargeMicros: 15_000_000n, // high enough to crush margin
      outboundSegments: 0,
      inboundSegments: 0,
      reconciledProviderCostMicros: null,
    });
    assert.ok(row.warnings.some((w) => /margin/i.test(w) || /NEGATIVE/i.test(w)));
  });

  it("estimates Stripe cost with integer math", () => {
    // $100.00 revenue, 1 charge → 2.9% + $0.30 = $3.20 → 3_200_000 micros
    assert.equal(estimateStripeCostMicros(100_000_000n, 1), 3_200_000n);
  });

  it("uses the documented default margin warn threshold", () => {
    assert.equal(DEFAULT_MARGIN_CONFIG.marginWarnPercent, 60);
  });
});

describe("SMS feature flags (safe defaults)", () => {
  it("keeps every customer-facing / live flag off by default", () => {
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_PUBLIC_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_BILLING_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_REGISTRATION_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_LIVE_SENDING_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_INBOUND_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_REPLY_ENABLED, false);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_MOCK_PROVIDER_ENABLED, true);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_ADMIN_ENABLED, true);
    assert.equal(SMS_FLAG_DEFAULTS.SENDFABLE_SMS_CODE_ENABLED, true);
  });

  it("smsFlag returns the safe default when the env var is unset", () => {
    // These should reflect defaults in the current process (no SMS flags set).
    assert.equal(smsFlag("SENDFABLE_SMS_PUBLIC_ENABLED"), false);
    assert.equal(smsFlag("SENDFABLE_SMS_LIVE_SENDING_ENABLED"), false);
    assert.equal(smsFlag("SENDFABLE_SMS_MOCK_PROVIDER_ENABLED"), true);
  });
});

describe("Telnyx helpers (no network)", () => {
  it("parses USD strings to micros without float math", () => {
    assert.equal(usdStringToMicros("0.008"), 8_000n);
    assert.equal(usdStringToMicros("1.50"), 1_500_000n);
    assert.equal(usdStringToMicros("12.5"), 12_500_000n);
  });
});
