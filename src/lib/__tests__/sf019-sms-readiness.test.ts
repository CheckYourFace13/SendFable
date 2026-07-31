/**
 * SF-019 — SMS launch readiness (dark): compliance, provider ops, billing guards, pilot.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionCompliance,
  estimatePlanMarginBasisPoints,
  estimateRegistrationFeesCents,
  toComplianceListItem,
  validateComplianceProfileForSubmit,
  validateEinBrn,
} from "../sms/compliance";
import {
  assertSmsLiveBillingWritesAllowed,
  assertSmsOnboardingSurface,
  SmsBillingGuardError,
  smsBillingFlagsSnapshot,
} from "../sms/billing-guards";
import { MockSmsProviderOps } from "../sms/mock-provider-ops";
import { TelnyxSmsProviderOps } from "../sms/telnyx-provider-ops";
import {
  assertOwnerPilotSendAllowed,
  OWNER_SMS_PILOT,
  isOwnerSmsPilotEnabled,
} from "../sms/pilot";
import { SMS_PLANS, SMS_ACTIVATION_FEE_CENTS } from "../sms/pricing";
import { MockSmsProvider } from "../sms/mock-provider";
import { calculateSegments } from "../sms/segments";
import { splitInboundSegments } from "../sms/usage";
import { redactEin } from "../sms/sensitive";

function validProfile(overrides: Record<string, unknown> = {}) {
  return {
    selectedPlan: "TEXT_ESSENTIALS",
    legalEntityName: "Acme Bakery LLC",
    dbaBrandName: "Acme",
    einBrn: "12-3456789",
    entityType: "PRIVATE_PROFIT",
    street: "1 Main St",
    city: "Chicago",
    state: "IL",
    postalCode: "60601",
    websiteUrl: "https://acme.example",
    supportEmail: "hi@acme.example",
    supportPhone: "+13125550100",
    industryVertical: "Retail",
    smsUseCase: "MARKETING",
    estimatedMonthlyVolume: 500,
    optInDescription: "Customers check an unchecked SMS box on our join form after reading disclosure.",
    optInFormUrl: "https://acme.example/join",
    optInEvidenceUrl: "https://acme.example/evidence.png",
    privacyPolicyUrl: "https://acme.example/privacy",
    smsTermsUrl: "https://acme.example/sms-terms",
    sampleMessage1: "Acme: Sale this weekend! Reply STOP to unsubscribe.",
    sampleMessage2: "Acme: Msg frequency varies. Msg&Data rates may apply. Reply STOP to opt out.",
    helpResponse: "Acme: For help email hi@acme.example. Reply STOP to unsubscribe.",
    stopResponse: "You are unsubscribed from Acme. No more messages. Reply HELP for help.",
    disclosureAccepted: true,
    ...overrides,
  };
}

describe("SF-019 compliance validation", () => {
  it("accepts a complete profile", () => {
    assert.deepEqual(validateComplianceProfileForSubmit(validProfile()), {});
  });

  it("requires legal name, HTTPS URLs, samples, HELP/STOP, disclosure", () => {
    const errors = validateComplianceProfileForSubmit(
      validProfile({
        legalEntityName: "",
        websiteUrl: "http://insecure.example",
        sampleMessage1: "hi",
        disclosureAccepted: false,
      })
    );
    assert.ok(errors.legalEntityName);
    assert.ok(errors.websiteUrl);
    assert.ok(errors.sampleMessage1);
    assert.ok(errors.disclosureAccepted);
  });

  it("validates EIN; sole prop may omit", () => {
    assert.equal(validateEinBrn("12-3456789", "PRIVATE_PROFIT"), null);
    assert.ok(validateEinBrn("bad", "PRIVATE_PROFIT"));
    assert.equal(validateEinBrn(null, "SOLE_PROPRIETOR"), null);
  });

  it("list projection never includes EIN material", () => {
    const item = toComplianceListItem({
      id: "p1",
      workspaceId: "w1",
      legalEntityName: "Acme",
      dbaBrandName: null,
      reviewStatus: "CUSTOMER_SUBMITTED",
      selectedPlan: "TEXT_ENTRY",
      submittedAt: null,
      hasEin: true,
    });
    assert.equal(item.einOnFile, true);
    assert.ok(!("einBrn" in item));
    assert.ok(!("einBrnCiphertext" in item));
    assert.match(redactEin("12-3456789"), /6789$/);
  });

  it("enforces compliance status transitions and blocks provider skip", () => {
    assert.equal(canTransitionCompliance("CUSTOMER_SUBMITTED", "INTERNAL_REVIEW"), true);
    assert.equal(canTransitionCompliance("INTERNAL_REVIEW", "READY_FOR_PROVIDER"), true);
    assert.equal(canTransitionCompliance("DRAFT", "PROVIDER_SUBMITTED"), false);
    assert.equal(canTransitionCompliance("READY_FOR_PROVIDER", "APPROVED"), false);
  });

  it("estimates fees under activation and positive margins", () => {
    const fees = estimateRegistrationFeesCents();
    assert.equal(fees.activationFeeCents, SMS_ACTIVATION_FEE_CENTS);
    assert.ok(fees.coversActivation);
    assert.ok(estimatePlanMarginBasisPoints("TEXT_ENTRY", false) > 0);
    assert.ok(estimatePlanMarginBasisPoints("TEXT_ESSENTIALS", true) > 0);
  });
});

describe("SF-019 billing guards (dark defaults)", () => {
  it("blocks onboarding and live billing with default flags", () => {
    assert.throws(() => assertSmsOnboardingSurface(), (e: unknown) => e instanceof SmsBillingGuardError);
    assert.throws(
      () => assertSmsLiveBillingWritesAllowed(),
      (e: unknown) => e instanceof SmsBillingGuardError
    );
    const snap = smsBillingFlagsSnapshot();
    assert.equal(snap.liveWritesAllowed, false);
  });
});

describe("SF-019 provider abstraction + mock ops", () => {
  it("mock brand → campaign → number → suspend/release is deterministic", async () => {
    const ops = new MockSmsProviderOps();
    ops.reset();
    const brand = await ops.createBrand({
      workspaceId: "ws1",
      legalEntityName: "Acme",
      displayName: "Acme",
      entityType: "PRIVATE_PROFIT",
      website: "https://acme.example",
      email: "hi@acme.example",
      phone: "+13125550100",
      street: "1 Main",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "US",
      vertical: "Retail",
    });
    assert.equal(brand.status, "approved");
    const camp = await ops.createCampaign({
      workspaceId: "ws1",
      providerBrandId: brand.providerBrandId,
      usecase: "MARKETING",
      description: "Offers",
      sample1: "hi STOP",
      sample2: "rates",
      messageFlow: "web form",
      helpMessage: "help",
      optoutMessage: "stop",
    });
    assert.equal(camp.status, "approved");
    const nums = await ops.searchNumbers({ numberType: "us-local", areaCode: "312" });
    assert.ok(nums.length >= 1);
    const bought = await ops.purchaseNumber(nums[0]!.phoneE164, "ws1");
    await ops.assignNumber(bought.providerNumberId, camp.providerCampaignId);
    await ops.suspendNumber(bought.providerNumberId);
    assert.equal(ops.isSuspended(bought.providerNumberId), true);
    await ops.releaseNumber(bought.providerNumberId);
    assert.equal(ops.isSuspended(bought.providerNumberId), false);
    const fees = await ops.retrieveFees();
    assert.ok(fees.numberMonthlyMicros > 0n);
  });

  it("Telnyx ops stub throws without credentials", async () => {
    const ops = new TelnyxSmsProviderOps();
    await assert.rejects(() => ops.createBrand({} as never));
  });
});

describe("SF-019 mock messaging scenarios (segments / encoding)", () => {
  it("covers GSM-7, extended, multi-segment, unicode, emoji", () => {
    assert.equal(calculateSegments("Hello").encoding, "GSM-7");
    assert.ok(calculateSegments("Hello ^[]{}").segments >= 1); // extended GSM
    const long = "A".repeat(200);
    assert.ok(calculateSegments(long).segments >= 2);
    assert.equal(calculateSegments("你好").encoding, "UCS-2");
    assert.equal(calculateSegments("Hi 😀").encoding, "UCS-2");
  });

  it("mock send is idempotent on key", async () => {
    const p = new MockSmsProvider({ writeToDisk: false });
    const a = await p.sendMessage({
      workspaceId: "w",
      from: "+13125550100",
      to: "+13125550111",
      body: "Hi",
      idempotencyKey: "idem-1",
    });
    const b = await p.sendMessage({
      workspaceId: "w",
      from: "+13125550100",
      to: "+13125550111",
      body: "Hi",
      idempotencyKey: "idem-1",
    });
    assert.equal(a.providerMessageId, b.providerMessageId);
  });

  it("inbound allowance split matches plan math", () => {
    const mid = splitInboundSegments("TEXT_ENTRY", 40, 30);
    assert.equal(mid.included, 30);
    assert.equal(mid.overage, 0);
    const over = splitInboundSegments("TEXT_ENTRY", 90, 20);
    assert.equal(over.included, 10);
    assert.equal(over.overage, 10);
  });
});

describe("SF-019 owner pilot (disabled by default)", () => {
  it("defaults off and enforces allowlist/caps when enabled", () => {
    assert.equal(isOwnerSmsPilotEnabled(), false);
    assert.equal(OWNER_SMS_PILOT.maxOutboundSegmentsTotal, 25);
    assert.equal(OWNER_SMS_PILOT.maxRecipients, 2);

    const prevE = process.env.SENDFABLE_SMS_OWNER_PILOT_ENABLED;
    const prevW = process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID;
    const prevA = process.env.SENDFABLE_SMS_OWNER_PILOT_ALLOWLIST;
    const prevK = process.env.SENDFABLE_SMS_OWNER_PILOT_KILL_SWITCH;
    process.env.SENDFABLE_SMS_OWNER_PILOT_ENABLED = "true";
    process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID = "pilot-ws";
    process.env.SENDFABLE_SMS_OWNER_PILOT_ALLOWLIST = "+13125550111,+13125550112";
    process.env.SENDFABLE_SMS_OWNER_PILOT_KILL_SWITCH = "false";
    try {
      assert.equal(
        assertOwnerPilotSendAllowed({
          workspaceId: "pilot-ws",
          toE164: "+13125550111",
          outboundSegmentsSoFar: 0,
          segmentsThisMessage: 1,
        }).ok,
        true
      );
      assert.equal(
        assertOwnerPilotSendAllowed({
          workspaceId: "other",
          toE164: "+13125550111",
          outboundSegmentsSoFar: 0,
          segmentsThisMessage: 1,
        }).ok,
        false
      );
      assert.equal(
        assertOwnerPilotSendAllowed({
          workspaceId: "pilot-ws",
          toE164: "+13125550999",
          outboundSegmentsSoFar: 0,
          segmentsThisMessage: 1,
        }).ok,
        false
      );
      assert.equal(
        assertOwnerPilotSendAllowed({
          workspaceId: "pilot-ws",
          toE164: "+13125550111",
          outboundSegmentsSoFar: 24,
          segmentsThisMessage: 2,
        }).ok,
        false
      );
    } finally {
      if (prevE === undefined) delete process.env.SENDFABLE_SMS_OWNER_PILOT_ENABLED;
      else process.env.SENDFABLE_SMS_OWNER_PILOT_ENABLED = prevE;
      if (prevW === undefined) delete process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID;
      else process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID = prevW;
      if (prevA === undefined) delete process.env.SENDFABLE_SMS_OWNER_PILOT_ALLOWLIST;
      else process.env.SENDFABLE_SMS_OWNER_PILOT_ALLOWLIST = prevA;
      if (prevK === undefined) delete process.env.SENDFABLE_SMS_OWNER_PILOT_KILL_SWITCH;
      else process.env.SENDFABLE_SMS_OWNER_PILOT_KILL_SWITCH = prevK;
    }
  });
});

describe("SF-019 pricing catalog constants", () => {
  it("matches owner-specified plan amounts", () => {
    assert.equal(SMS_PLANS.TEXT_ENTRY.monthlyPriceCents, 1999);
    assert.equal(SMS_PLANS.TEXT_ENTRY.outboundSegmentPriceMicros, 50_000);
    assert.equal(SMS_PLANS.TEXT_ENTRY.includedInboundSegments, 100);
    assert.equal(SMS_PLANS.TEXT_ESSENTIALS.monthlyPriceCents, 4999);
    assert.equal(SMS_PLANS.TEXT_ESSENTIALS.bundledMonthlyPriceCents, 4499);
    assert.equal(SMS_PLANS.TEXT_ESSENTIALS.outboundSegmentPriceMicros, 35_000);
    assert.equal(SMS_PLANS.TEXT_ESSENTIALS.includedInboundSegments, 300);
    assert.equal(SMS_PLANS.TEXT_ADVANTAGE.monthlyPriceCents, 9999);
    assert.equal(SMS_PLANS.TEXT_ADVANTAGE.bundledMonthlyPriceCents, 8999);
    assert.equal(SMS_PLANS.TEXT_ADVANTAGE.outboundSegmentPriceMicros, 25_000);
    assert.equal(SMS_PLANS.TEXT_ADVANTAGE.includedInboundSegments, 750);
    assert.equal(SMS_ACTIVATION_FEE_CENTS, 9900);
  });
});
