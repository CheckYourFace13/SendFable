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

  it("executeAutopilotAction requires confirm for approve", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/autopilot/approval.ts"),
      "utf8"
    );
    assert.match(src, /confirm_required/);
    assert.match(src, /launchCampaign/);
    // GET review path must not call launch
    const review = readFileSync(
      join(process.cwd(), "src/app/autopilot/review/page.tsx"),
      "utf8"
    );
    assert.doesNotMatch(review, /launchCampaign/);
    assert.match(review, /Opening this page does not send/);
  });

  it("worker tick never launches campaigns", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/autopilot/tick.ts"), "utf8");
    assert.doesNotMatch(src, /launchCampaign/);
    assert.match(src, /sendAutopilotApprovalEmail/);
  });

  it("waiting drafts are not auto-expired and reminders fire once", () => {
    const tick = readFileSync(join(process.cwd(), "src/lib/autopilot/tick.ts"), "utf8");
    assert.doesNotMatch(tick, /expireStale/);
    assert.doesNotMatch(tick, /status:\s*"EXPIRED"/);
    assert.match(tick, /reminderSentAt: null/);
    assert.match(tick, /sendDueAutopilotReminders/);
    const approval = readFileSync(join(process.cwd(), "src/lib/autopilot/approval.ts"), "utf8");
    assert.match(approval, /Skip this campaign/);
    assert.doesNotMatch(approval, /data: \{ status: "EXPIRED" \}/);
    assert.match(approval, /already_decided/);
    const queue = readFileSync(
      join(process.cwd(), "src/app/(app)/settings/marketing-autopilot/page.tsx"),
      "utf8"
    );
    assert.match(queue, /Waiting for approval/);
    assert.match(queue, /Approve &amp; Send/);
    assert.match(queue, /Skip/);
  });
});
