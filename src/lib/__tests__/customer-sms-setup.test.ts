/**
 * Customer-facing SMS setup helpers (no provider branding).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  customerStatusLabel,
  generateSmsHelpStop,
  generateSmsOptInDescription,
  generateSmsSampleMessages,
  mapLifecycleToCustomerStatus,
  parseMailingAddress,
  translateSmsProviderError,
} from "../sms/customer-facing";

describe("customer SMS setup UX helpers", () => {
  it("hides provider jargon in insufficient-funds translation", () => {
    const t = translateSmsProviderError(
      'Telnyx POST /10dlc/campaignBuilder → HTTP 402 code 20100 Insufficient Funds'
    );
    assert.equal(t.code, "insufficient_funds");
    assert.doesNotMatch(t.customerMessage, /Telnyx|campaignBuilder|20100/i);
    assert.match(t.ownerMessage, /provider account needs additional balance/i);
  });

  it("maps lifecycle to plain customer statuses", () => {
    assert.equal(mapLifecycleToCustomerStatus({}), "not_started");
    assert.equal(
      mapLifecycleToCustomerStatus({ phase: "BRAND_PENDING", reviewStatus: "PROVIDER_PENDING" }),
      "approval_in_progress"
    );
    assert.equal(
      mapLifecycleToCustomerStatus({ phase: "NUMBER_READY" }),
      "choose_number"
    );
    assert.equal(
      mapLifecycleToCustomerStatus({ hasNumber: true, phase: "NUMBER_ASSIGNED" }),
      "active"
    );
    assert.equal(
      mapLifecycleToCustomerStatus({ reviewStatus: "NEEDS_CUSTOMER_CHANGES" }),
      "needs_attention"
    );
    assert.equal(customerStatusLabel("approval_in_progress"), "Approval in progress");
  });

  it("auto-generates samples HELP STOP and message flow with brand", () => {
    const samples = generateSmsSampleMessages({ brandName: "Acme Bakery", useCase: "MARKETING" });
    assert.match(samples.sampleMessage1, /Acme Bakery/);
    assert.match(samples.sampleMessage1, /STOP/);
    assert.match(samples.sampleMessage2, /Msg & data rates|Msg&data rates/i);
    const hs = generateSmsHelpStop({
      brandName: "Acme Bakery",
      supportEmail: "hi@acme.example",
    });
    assert.match(hs.helpResponse, /Acme Bakery/);
    assert.match(hs.stopResponse, /unsubscribed/i);
    assert.doesNotMatch(hs.helpResponse, /Telnyx/i);
    const flow = generateSmsOptInDescription({
      brandName: "Acme Bakery",
      useCaseLabel: "Promotions & offers",
      optInFormUrl: "https://sendfable.com/f/acme-text-signup",
    });
    assert.match(flow, /https:\/\/sendfable\.com\/f\/acme-text-signup/);
    assert.doesNotMatch(flow, /privacy/i);
  });

  it("parses mailing address for prefill", () => {
    const a = parseMailingAddress("1364 Patriot Boulevard, Glenview, IL 60026");
    assert.equal(a.street, "1364 Patriot Boulevard");
    assert.equal(a.city, "Glenview");
    assert.equal(a.state, "IL");
    assert.equal(a.postalCode, "60026");
  });
});
