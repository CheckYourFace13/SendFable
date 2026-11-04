import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  datetimeLocalInZoneToUtc,
  isMissingHomeTimezone,
  normalizeHomeTimezone,
  resolveHomeTimezone,
} from "@/lib/home-timezone";
import { parseAutopilotSchedule, resolveDefaultTimezone } from "@/lib/autopilot/schedule";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("workspace home timezone defaults", () => {
  it("prefers workspace home timezone for Chicago, New York, and Los Angeles", () => {
    assert.equal(
      resolveHomeTimezone({
        workspaceTimezone: "America/Chicago",
        accountTimezone: "America/New_York",
        browserTimezone: "America/Los_Angeles",
      }),
      "America/Chicago"
    );
    assert.equal(
      resolveHomeTimezone({
        workspaceTimezone: "America/New_York",
        browserTimezone: "America/Chicago",
      }),
      "America/New_York"
    );
    assert.equal(
      resolveHomeTimezone({
        workspaceTimezone: "America/Los_Angeles",
        accountTimezone: "UTC",
      }),
      "America/Los_Angeles"
    );
  });

  it("falls back account → browser → UTC without hardcoding a city", () => {
    assert.equal(
      resolveHomeTimezone({
        workspaceTimezone: null,
        accountTimezone: "America/New_York",
        browserTimezone: "America/Los_Angeles",
      }),
      "America/New_York"
    );
    assert.equal(
      resolveHomeTimezone({
        workspaceTimezone: "",
        accountTimezone: null,
        browserTimezone: "America/Los_Angeles",
      }),
      "America/Los_Angeles"
    );
    assert.equal(resolveHomeTimezone({}), "UTC");
    assert.equal(isMissingHomeTimezone(null), true);
    assert.equal(isMissingHomeTimezone("America/Chicago"), false);
  });

  it("rejects unknown zones and keeps Scribe schedule defaults aligned", () => {
    assert.equal(normalizeHomeTimezone("Not/AZone"), null);
    assert.equal(
      resolveDefaultTimezone({ workspaceTimezone: "America/Chicago" }),
      "America/Chicago"
    );
    const scheduled = parseAutopilotSchedule({
      date: "2026-12-01",
      time: "15:00",
      timezone: "America/Los_Angeles",
      now: new Date("2026-10-10T00:00:00Z"),
    });
    assert.equal(scheduled.ok, true);
    if (scheduled.ok) {
      assert.equal(scheduled.timezone, "America/Los_Angeles");
      assert.equal(scheduled.at.toISOString(), "2026-12-01T23:00:00.000Z");
    }
  });

  it("interprets datetime-local in the workspace home timezone", () => {
    const chicago = datetimeLocalInZoneToUtc("2026-12-01T15:00", "America/Chicago");
    const ny = datetimeLocalInZoneToUtc("2026-12-01T15:00", "America/New_York");
    const la = datetimeLocalInZoneToUtc("2026-12-01T15:00", "America/Los_Angeles");
    assert.ok(chicago && ny && la);
    assert.equal(chicago!.toISOString(), "2026-12-01T21:00:00.000Z");
    assert.equal(ny!.toISOString(), "2026-12-01T20:00:00.000Z");
    assert.equal(la!.toISOString(), "2026-12-01T23:00:00.000Z");
  });

  it("does not hardcode BoatingChicago or America/Chicago as a product default", () => {
    const files = [
      "src/lib/home-timezone.ts",
      "src/app/api/auth/signup/route.ts",
      "src/app/(app)/onboarding/page.tsx",
      "src/components/app/autopilot-schedule-form.tsx",
      "src/app/(app)/campaigns/[id]/page.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      assert.doesNotMatch(src, /BoatingChicago/);
      assert.doesNotMatch(src, /workspaceTimezone:\s*"America\/Chicago"/);
      assert.doesNotMatch(src, /defaultTimezone:\s*"America\/Chicago"/);
    }
    assert.equal(resolveHomeTimezone({}), "UTC");
  });
});
