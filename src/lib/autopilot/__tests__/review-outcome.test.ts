import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveAutopilotReviewOutcome } from "@/lib/autopilot/review-outcome";

describe("resolveAutopilotReviewOutcome", () => {
  it("reports sent when campaign completed or sending", () => {
    assert.equal(
      resolveAutopilotReviewOutcome({
        status: "APPROVED",
        decidedAction: "SCHEDULE",
        scheduledFor: new Date("2026-11-04T00:34:00Z"),
        scheduleTimezone: "America/Chicago",
        campaign: { status: "COMPLETED", scheduledAt: new Date("2026-11-04T00:34:00Z") },
      }).outcome,
      "sent"
    );
    assert.equal(
      resolveAutopilotReviewOutcome({
        status: "APPROVED",
        decidedAction: "SCHEDULE",
        scheduledFor: null,
        scheduleTimezone: null,
        campaign: { status: "SENDING", scheduledAt: null },
      }).outcome,
      "sent"
    );
  });

  it("reports scheduled with timezone label when still SCHEDULED", () => {
    const resolved = resolveAutopilotReviewOutcome({
      status: "APPROVED",
      decidedAction: "SCHEDULE",
      scheduledFor: new Date("2026-11-04T00:34:00Z"),
      scheduleTimezone: "America/Chicago",
      campaign: { status: "SCHEDULED", scheduledAt: new Date("2026-11-04T00:34:00Z") },
    });
    assert.equal(resolved.outcome, "scheduled");
    assert.ok(resolved.scheduledLabel);
    assert.match(resolved.scheduledLabel!, /2026|Nov|CST|CDT|Chicago|GMT/i);
  });

  it("reports sent for explicit SEND_NOW decisions", () => {
    assert.equal(
      resolveAutopilotReviewOutcome({
        status: "SENT",
        decidedAction: "SEND_NOW",
        scheduledFor: null,
        scheduleTimezone: null,
        campaign: { status: "COMPLETED", scheduledAt: null },
      }).outcome,
      "sent"
    );
  });

  it("reports rejected and editing distinctly", () => {
    assert.equal(
      resolveAutopilotReviewOutcome({
        status: "REJECTED",
        decidedAction: "REJECT",
        scheduledFor: null,
        scheduleTimezone: null,
        campaign: { status: "DRAFT", scheduledAt: null },
      }).outcome,
      "rejected"
    );
    assert.equal(
      resolveAutopilotReviewOutcome({
        status: "EDITING",
        decidedAction: "EDIT",
        scheduledFor: null,
        scheduleTimezone: null,
        campaign: { status: "DRAFT", scheduledAt: null },
      }).outcome,
      "editing"
    );
  });
});

describe("review link UI safety (source)", () => {
  it("never shows bare token_used / already used copy", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/autopilot/review/page.tsx"),
      "utf8"
    );
    assert.doesNotMatch(page, /This link was already used/);
    assert.doesNotMatch(page, /token_used/);
    assert.match(page, /Campaign sent/);
    assert.match(page, /Campaign scheduled for/);
  });

  it("confirm form does not refresh after success (avoids wiping UI)", () => {
    const form = readFileSync(
      join(process.cwd(), "src/app/autopilot/review/confirm-form.tsx"),
      "utf8"
    );
    assert.doesNotMatch(form, /useRouter/);
    assert.doesNotMatch(form, /router\.refresh\(\)/);
    assert.match(form, /if \(busy \|\| done\) return/);
  });

  it("schedule claims token version atomically and blocks COMPLETED", () => {
    const approval = readFileSync(
      join(process.cwd(), "src/lib/autopilot/approval.ts"),
      "utf8"
    );
    assert.match(approval, /approvalTokenVersion: opts\.expectedTokenVersion/);
    assert.match(approval, /"COMPLETED"/);
    assert.doesNotMatch(approval, /\["SENDING", "SENT"\]/);
    assert.match(approval, /resolveAutopilotReviewOutcome/);
  });

  it("launchCampaign claims SENDING via updateMany and enqueue uses jobId", () => {
    const send = readFileSync(join(process.cwd(), "src/lib/campaign-send.ts"), "utf8");
    assert.match(send, /updateMany/);
    assert.match(send, /alreadyLaunched/);
    const queue = readFileSync(join(process.cwd(), "src/lib/queue.ts"), "utf8");
    assert.match(queue, /jobId: `campaign-send-\$\{data\.recipientId\}`/);
  });
});
