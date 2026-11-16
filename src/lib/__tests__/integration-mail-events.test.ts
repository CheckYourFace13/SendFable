import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deliveryExternalId,
  integrationDeliveryEventType,
  isIntegrationMessageId,
} from "../integration-mail-events";

describe("integration mail events", () => {
  it("names permanent and transient bounces without storing an address", () => {
    assert.equal(integrationDeliveryEventType("Delivery"), "Delivery");
    assert.equal(integrationDeliveryEventType("Bounce", "Permanent"), "Bounce");
    assert.equal(integrationDeliveryEventType("Bounce", "Transient"), "TransientBounce");
    assert.equal(integrationDeliveryEventType("Open"), null);
    assert.equal(deliveryExternalId("abc123456789", "Delivery").includes("@"), false);
  });

  it("rejects message ids that could carry an address separator", () => {
    assert.equal(isIntegrationMessageId("0100019a8c0d9e"), true);
    assert.equal(isIntegrationMessageId("owner@bar.example"), false);
    assert.equal(isIntegrationMessageId("abc:Delivery"), false);
  });
});
