import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canEnterRecoveryMode,
  deriveAcquisitionState,
  isRecoveryEligibleMessage,
  RECOVERY_NEW_PER_DAY,
} from "@/lib/acquisition/recovery";
import {
  isRecoverableBouncePauseReason,
  shouldAutoResumeRecoverablePause,
  shouldHardPause,
} from "@/lib/acquisition/ramp";
import { WEBSITE_DEMO_COPY_VERSION } from "@/lib/acquisition/queue-policy";

describe("acquisition recovery mode", () => {
  it("keeps the normal 5% bounce hard-pause threshold unchanged", () => {
    assert.equal(
      shouldHardPause({
        sent: 35,
        bounceRate: 2 / 35,
        complaintRate: 0,
        unsubRate: 0,
        bounced: 2,
      }).pause,
      true
    );
    assert.equal(
      shouldHardPause({
        sent: 41,
        bounceRate: 2 / 41,
        complaintRate: 0,
        unsubRate: 0,
        bounced: 2,
      }).pause,
      false
    );
  });

  it("allows RECOVERY only for bounce_rate hard pauses, never unsub/complaint", () => {
    assert.equal(isRecoverableBouncePauseReason("bounce_rate_5.56%"), true);
    assert.equal(isRecoverableBouncePauseReason("unsub_rate_5.13%"), false);
    assert.equal(isRecoverableBouncePauseReason("complaint_received"), false);
    assert.equal(isRecoverableBouncePauseReason("recovery_hard_bounce"), false);

    const rates = {
      sent: 35,
      bounced: 2,
      complained: 0,
      unsubscribed: 0,
      bounceRate: 2 / 35,
      complaintRate: 0,
      unsubRate: 0,
      sampleOk: true,
    };
    assert.equal(
      canEnterRecoveryMode({
        paused: true,
        hardPause: true,
        pauseReason: "bounce_rate_5.56%",
        rates,
      }),
      true
    );
    assert.equal(
      canEnterRecoveryMode({
        paused: true,
        hardPause: true,
        pauseReason: "unsub_rate_5.13%",
        rates: { ...rates, unsubscribed: 3, unsubRate: 3 / 35 },
      }),
      false
    );
    assert.equal(
      canEnterRecoveryMode({
        paused: true,
        hardPause: true,
        pauseReason: "bounce_rate_5.56%",
        rates: { ...rates, complained: 1, complaintRate: 1 / 35 },
      }),
      false
    );
    assert.equal(
      canEnterRecoveryMode({
        paused: true,
        hardPause: true,
        pauseReason: "recovery_hard_bounce",
        rates,
      }),
      false
    );
  });

  it("derives HARD_PAUSED / RECOVERY / HEALTHY explicitly", () => {
    assert.equal(
      deriveAcquisitionState({
        paused: false,
        hardPause: false,
        recoveryMode: false,
        pauseReason: null,
      }).state,
      "HEALTHY"
    );
    assert.equal(
      deriveAcquisitionState({
        paused: true,
        hardPause: true,
        recoveryMode: true,
        pauseReason: "bounce_rate_5.56%",
      }).state,
      "RECOVERY"
    );
    assert.equal(
      deriveAcquisitionState({
        paused: true,
        hardPause: true,
        recoveryMode: false,
        pauseReason: "bounce_rate_5.56%",
      }).state,
      "HARD_PAUSED"
    );
    assert.equal(
      deriveAcquisitionState({
        paused: true,
        hardPause: true,
        recoveryMode: true,
        pauseReason: "complaint_received",
      }).state,
      "HARD_PAUSED"
    );
  });

  it("limits recovery to INITIAL non-demo messages at 2/day", () => {
    assert.equal(RECOVERY_NEW_PER_DAY, 2);
    assert.equal(
      isRecoveryEligibleMessage({ step: "INITIAL", copyVersion: "utility_signup" }),
      true
    );
    assert.equal(
      isRecoveryEligibleMessage({
        step: "INITIAL",
        copyVersion: WEBSITE_DEMO_COPY_VERSION,
      }),
      false
    );
    assert.equal(
      isRecoveryEligibleMessage({ step: "FOLLOW_UP_1", copyVersion: "utility_signup" }),
      false
    );
  });

  it("auto-returns to normal when bounce rate clears the existing hard bar", () => {
    // 2 bounces / 41 sends ≈ 4.88% → below 5% with abs still 2 → no hard pause
    assert.equal(
      shouldAutoResumeRecoverablePause({
        pauseReason: "bounce_rate_5.56%",
        rates: {
          sent: 41,
          bounced: 2,
          complained: 0,
          unsubscribed: 0,
          bounceRate: 2 / 41,
          complaintRate: 0,
          unsubRate: 0,
          sampleOk: true,
        },
      }),
      true
    );
    assert.equal(
      shouldAutoResumeRecoverablePause({
        pauseReason: "recovery_hard_bounce",
        rates: {
          sent: 41,
          bounced: 2,
          complained: 0,
          unsubscribed: 0,
          bounceRate: 2 / 41,
          complaintRate: 0,
          unsubRate: 0,
          sampleOk: true,
        },
      }),
      true
    );
  });
});
