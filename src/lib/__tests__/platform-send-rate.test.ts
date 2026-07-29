import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { platformSendRatePerSec } from "../platform-send-rate";

describe("platform send rate", () => {
  it("defaults to 5 messages per second for launch", () => {
    const prev = process.env.PLATFORM_SEND_RATE_PER_SEC;
    delete process.env.PLATFORM_SEND_RATE_PER_SEC;
    assert.equal(platformSendRatePerSec(), 5);
    if (prev !== undefined) process.env.PLATFORM_SEND_RATE_PER_SEC = prev;
  });

  it("never exceeds the AWS account MaxSendRate of 14", () => {
    const prev = process.env.PLATFORM_SEND_RATE_PER_SEC;
    process.env.PLATFORM_SEND_RATE_PER_SEC = "100";
    assert.equal(platformSendRatePerSec(), 14);
    if (prev === undefined) delete process.env.PLATFORM_SEND_RATE_PER_SEC;
    else process.env.PLATFORM_SEND_RATE_PER_SEC = prev;
  });

  it("accepts an explicit conservative value", () => {
    const prev = process.env.PLATFORM_SEND_RATE_PER_SEC;
    process.env.PLATFORM_SEND_RATE_PER_SEC = "3";
    assert.equal(platformSendRatePerSec(), 3);
    if (prev === undefined) delete process.env.PLATFORM_SEND_RATE_PER_SEC;
    else process.env.PLATFORM_SEND_RATE_PER_SEC = prev;
  });
});
