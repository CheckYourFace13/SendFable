import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAutopilotSchedule } from "@/lib/autopilot/schedule";

function src(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("scribe schedule-only contract", () => {
  it("a page change drafts and asks for approval, and does not send", () => {
    const tick = src("src/lib/autopilot/tick.ts");
    assert.match(tick, /NO RESPONSE = NO SEND/);
    assert.match(tick, /sendAutopilotApprovalEmail/);
    assert.match(tick, /createAutopilotCampaignDraft/);
    assert.match(tick, /resolveScribeAudience/);
    assert.match(tick, /audience_unresolved/);
    assert.doesNotMatch(tick, /enqueueAutopilotAutoSend/);
    assert.doesNotMatch(tick, /launchCampaign/);
  });

  it("a signup does not enqueue an automatic welcome", () => {
    const accept = src("src/lib/forms/accept.ts");
    assert.doesNotMatch(accept, /maybeEnqueueAutoWelcome/);
    assert.doesNotMatch(accept, /enqueueAutopilotAutoSend/);
  });

  it("the worker sends only a campaign the owner already scheduled", () => {
    const worker = src("src/worker/index.ts");
    assert.match(worker, /status: "SCHEDULED"/);
    assert.match(worker, /scheduledAt: \{ lte: new Date\(\) \}/);
    assert.match(worker, /launchCampaign/);
    assert.doesNotMatch(worker, /processDueAutomationSends/);
    assert.doesNotMatch(worker, /enqueueAutopilotAutoSend/);
  });

  it("approve and schedule requires a future date, time, and timezone", () => {
    assert.equal(parseAutopilotSchedule({}).ok, false);
    assert.equal(
      parseAutopilotSchedule({ date: "2026-12-01", time: "", timezone: "UTC" }).ok,
      false
    );
    assert.equal(
      parseAutopilotSchedule({ date: "2026-12-01", time: "15:00", timezone: "" }).ok,
      false
    );
    const scheduled = parseAutopilotSchedule({
      date: "2026-12-01",
      time: "15:00",
      timezone: "America/Chicago",
      now: new Date("2026-10-10T00:00:00Z"),
    });
    assert.equal(scheduled.ok, true);
    if (scheduled.ok) {
      assert.equal(scheduled.at.toISOString(), "2026-12-01T21:00:00.000Z");
    }
  });
});
