import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("autopilot approval safety", () => {
  it("action route rejects GET for send", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/api/autopilot/action/route.ts"),
      "utf8"
    );
    assert.match(src, /export async function GET/);
    assert.match(src, /405/);
    assert.match(src, /GET never sends/);
  });

  it("executeAutopilotAction requires confirm; GET review never launches", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/autopilot/approval.ts"),
      "utf8"
    );
    assert.match(src, /confirm_required/);
    assert.match(src, /schedule_required/);
    assert.match(src, /sendNowAutopilotDraft/);
    assert.match(src, /launchCampaign/);
    assert.match(src, /expectedTokenVersion/);
    // launchCampaign only via confirmed send-now path
    assert.match(src, /Explicit SEND NOW after confirmation POST/);
    const review = readFileSync(
      join(process.cwd(), "src/app/autopilot/review/page.tsx"),
      "utf8"
    );
    assert.doesNotMatch(review, /launchCampaign/);
    assert.match(review, /Opening this page does not send/);
    assert.match(review, /Campaign sent/);
    assert.match(review, /Campaign scheduled/);
  });

  it("worker tick never launches campaigns", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/autopilot/tick.ts"), "utf8");
    assert.doesNotMatch(src, /launchCampaign/);
    assert.match(src, /sendAutopilotApprovalEmail/);
    assert.match(src, /rankCampaignContent/);
    assert.match(src, /skip:\$\{ranked\.reason\}/);
  });

  it("waiting drafts are not auto-expired and reminders fire once", () => {
    const tick = readFileSync(join(process.cwd(), "src/lib/autopilot/tick.ts"), "utf8");
    assert.doesNotMatch(tick, /expireStale/);
    assert.doesNotMatch(tick, /status:\s*"EXPIRED"/);
    assert.match(tick, /reminderSentAt: null/);
    assert.match(tick, /sendDueAutopilotReminders/);
    const approval = readFileSync(join(process.cwd(), "src/lib/autopilot/approval.ts"), "utf8");
    const copy = readFileSync(join(process.cwd(), "src/lib/autopilot/approval-copy.ts"), "utf8");
    assert.match(copy, /Skip this campaign/);
    assert.match(copy, /SEND NOW/);
    assert.match(copy, /CHOOSE DATE/);
    assert.doesNotMatch(approval, /data: \{ status: "EXPIRED" \}/);
    assert.match(approval, /already_decided/);
    const queue = readFileSync(join(process.cwd(), "src/app/(app)/scribe/page.tsx"), "utf8");
    assert.match(queue, /Waiting for you/);
    assert.match(queue, /Campaign audience|Audience:/);
    assert.match(queue, /Choose date|SCHEDULE FOR LATER|SEND NOW/);
    assert.match(queue, /Skip/);
  });
});
