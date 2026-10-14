import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planSendTimes } from "../tools/send-time";

describe("send time planner", () => {
  it("does not claim a guaranteed best time", () => {
    const plan = planSendTimes({
      audience: "consumer",
      week: "weekday",
      timezone: "America/Chicago",
      industry: "general",
    });
    const text = JSON.stringify(plan).toLowerCase();
    assert.match(plan.disclaimer, /not a best time/i);
    assert.equal(text.includes("guaranteed"), false);
    assert.equal(plan.windows.length >= 2, true);
    assert.match(plan.timezoneNote, /America\/Chicago/);
  });

  it("uses dinner-planning hours for restaurants", () => {
    const plan = planSendTimes({
      audience: "consumer",
      week: "either",
      timezone: "America/New_York",
      industry: "restaurant",
    });
    assert.match(plan.windows[0]!.when, /3:00–5:00pm/);
  });

  it("keeps weekday morning as the first B2B test even if weekends are preferred", () => {
    const plan = planSendTimes({
      audience: "b2b",
      week: "weekend",
      timezone: "America/Los_Angeles",
      industry: "professional",
    });
    assert.match(plan.firstTest, /Tuesday or Wednesday morning/);
    assert.match(plan.windows[0]!.when, /9:30–11:00am/);
  });
});
