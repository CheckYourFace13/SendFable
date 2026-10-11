import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReservedExampleEmail } from "@/lib/reserved-email";
import {
  briefIssueSlotKey,
  chicagoDateKey,
  isActiveBriefSlotStatus,
  isRecoverableBriefSlotStatus,
} from "@/lib/brief-issue-slot";

describe("isReservedExampleEmail", () => {
  it("flags IETF example domains", () => {
    assert.equal(isReservedExampleEmail("qa@example.com"), true);
    assert.equal(isReservedExampleEmail("x@Example.NET"), true);
    assert.equal(isReservedExampleEmail("a@sub.example.org"), true);
  });

  it("allows real domains", () => {
    assert.equal(isReservedExampleEmail("chris@iscreamstudio.com"), false);
    assert.equal(isReservedExampleEmail("hello@boatingchicago.com"), false);
  });
});

describe("brief issue slot", () => {
  it("builds America/Chicago Thursday keys", () => {
    // 2026-10-15 20:00 UTC = 3pm CDT
    const at = new Date("2026-10-15T20:00:00.000Z");
    assert.equal(chicagoDateKey(at), "2026-10-15");
    assert.equal(briefIssueSlotKey(at), "brief:America/Chicago:2026-10-15");
  });

  it("classifies slot statuses", () => {
    assert.equal(isActiveBriefSlotStatus("SCHEDULED"), true);
    assert.equal(isActiveBriefSlotStatus("SENDING"), true);
    assert.equal(isActiveBriefSlotStatus("COMPLETED"), true);
    assert.equal(isActiveBriefSlotStatus("FAILED"), false);
    assert.equal(isRecoverableBriefSlotStatus("FAILED"), true);
    assert.equal(isRecoverableBriefSlotStatus("CANCELLED"), true);
  });
});
