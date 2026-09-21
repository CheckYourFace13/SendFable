import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attributionAlertWindow,
  ACQUISITION_ATTRIBUTION_CONSTANTS,
} from "@/lib/acquisition/delivery-health";

describe("acquisition delivery attribution window", () => {
  it("alerts only between 4h and 48h after send", () => {
    const now = new Date("2026-09-20T21:45:00.000Z");
    const w = attributionAlertWindow(now);
    assert.equal(
      w.olderThanOrEqual.toISOString(),
      new Date(now.getTime() - ACQUISITION_ATTRIBUTION_CONSTANTS.DELIVERY_GRACE_MS).toISOString()
    );
    assert.equal(
      w.newerThanOrEqual.toISOString(),
      new Date(now.getTime() - ACQUISITION_ATTRIBUTION_CONSTANTS.ATTRIBUTION_MAX_AGE_MS).toISOString()
    );
    // Black Horse sentAt 2026-09-16T13:00:28Z is older than 48h → outside window
    const blackHorseSent = new Date("2026-09-16T13:00:28.826Z");
    assert.ok(blackHorseSent < w.newerThanOrEqual);
  });

  it("respects ATTRIBUTION_WATCH_FROM when max-age floor is earlier", () => {
    const now = new Date("2026-09-05T00:00:00.000Z"); // ~10h after watch-from
    const w = attributionAlertWindow(now);
    assert.equal(
      w.newerThanOrEqual.toISOString(),
      ACQUISITION_ATTRIBUTION_CONSTANTS.ATTRIBUTION_WATCH_FROM.toISOString()
    );
  });
});
