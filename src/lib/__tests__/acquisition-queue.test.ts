import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  acquisitionWebsiteDemoEnabled,
  chooseInitialTrack,
  isCurrentAutopilotInitial,
  orderSendCandidates,
  planStaleInitial,
  stableAutopilotVariant,
  websiteDemoSlotsLeft,
  WEBSITE_DEMO_DAILY_NEW_LIMIT,
} from "@/lib/acquisition/queue-policy";
import { ACQUISITION_RAMP_STAGES } from "@/lib/acquisition/flags";

const current = {
  step: "INITIAL",
  subject: "Could your website write your marketing emails?",
  ctaPath: "/automated-email-marketing",
  copyVersion: "v1a",
  prospectId: "p1",
  createdAt: new Date("2026-10-05T13:00:00Z"),
};

describe("acquisition queue policy", () => {
  it("recognizes only the current Autopilot A/B initials", () => {
    assert.equal(isCurrentAutopilotInitial(current), true);
    assert.equal(
      isCurrentAutopilotInitial({
        ...current,
        subject: "What if Harbor Coffee's marketing mostly wrote itself?",
        copyVersion: "v1b",
      }),
      true
    );
    assert.equal(
      isCurrentAutopilotInitial({
        ...current,
        subject: "Quick question about Harbor Coffee",
        ctaPath: "/solutions/local-events",
      }),
      false
    );
    assert.equal(
      isCurrentAutopilotInitial({
        ...current,
        copyVersion: "personalized_website_demo",
        subject: "We made this from Harbor Coffee's website",
      }),
      false
    );
  });

  it("sends current initials ahead of older stale drafts and follow-ups", () => {
    const ordered = orderSendCandidates([
      {
        ...current,
        prospectId: "old",
        subject: "A simpler email tool for Harbor Coffee?",
        ctaPath: "/email-marketing-for-small-business",
        createdAt: new Date("2026-09-01T00:00:00Z"),
      },
      {
        ...current,
        prospectId: "new",
        createdAt: new Date("2026-10-05T13:00:00Z"),
      },
      {
        step: "FOLLOW_UP_1",
        subject: "Re: older",
        ctaPath: "/solutions/restaurants",
        copyVersion: null,
        prospectId: "followed",
        createdAt: new Date("2026-08-01T00:00:00Z"),
      },
    ]);
    assert.deepEqual(
      ordered.map((m) => m.prospectId),
      ["new", "followed"]
    );
  });

  it("keeps one initial per prospect, oldest current draft first", () => {
    const ordered = orderSendCandidates([
      { ...current, prospectId: "a", createdAt: new Date("2026-10-02T00:00:00Z") },
      { ...current, prospectId: "a", createdAt: new Date("2026-10-01T00:00:00Z") },
      { ...current, prospectId: "b", createdAt: new Date("2026-10-03T00:00:00Z") },
    ]);
    assert.equal(ordered.filter((m) => m.prospectId === "a").length, 1);
    assert.equal(ordered[0]?.prospectId, "a");
    assert.equal(ordered[0]?.createdAt.toISOString(), "2026-10-01T00:00:00.000Z");
  });

  it("regenerates stale unsent initials and retires duplicates", () => {
    const stale = {
      step: "INITIAL",
      subject: "Quick question about Harbor Coffee",
      ctaPath: "/solutions/local-events",
      copyVersion: "v1a",
    };
    assert.equal(planStaleInitial(stale, false), "regenerate");
    assert.equal(planStaleInitial(stale, true), "retire_duplicate");
    assert.equal(planStaleInitial(current, false), "keep");
    assert.equal(planStaleInitial({ ...stale, step: "FOLLOW_UP_1" }, false), "keep");
    assert.equal(
      planStaleInitial(
        {
          step: "INITIAL",
          subject: "We made this from Harbor Coffee's website",
          ctaPath: "/automated-email-marketing",
          copyVersion: "personalized_website_demo",
        },
        false
      ),
      "keep"
    );
  });

  it("assigns a stable A/B variant", () => {
    assert.equal(stableAutopilotVariant("prospect-1"), stableAutopilotVariant("prospect-1"));
    assert.ok(["v1a", "v1b"].includes(stableAutopilotVariant("prospect-1")));
  });

  it("gives a prospect one initial path and caps the demo track at 2", () => {
    assert.equal(acquisitionWebsiteDemoEnabled(), true);
    assert.equal(chooseInitialTrack(true), "personalized_website_demo");
    assert.equal(chooseInitialTrack(false), "normal");
    assert.equal(WEBSITE_DEMO_DAILY_NEW_LIMIT, 2);
    assert.equal(websiteDemoSlotsLeft(0, 0), 2);
    assert.equal(websiteDemoSlotsLeft(1, 1), 0);
    assert.equal(websiteDemoSlotsLeft(2, 0), 0);
    assert.equal(ACQUISITION_RAMP_STAGES[1].newPerDay, 5);
    assert.equal(ACQUISITION_RAMP_STAGES[1].totalPerDay, 10);
    const ordered = orderSendCandidates([
      {
        ...current,
        prospectId: "demo",
        copyVersion: "personalized_website_demo",
        subject: "We made this from Harbor Coffee's website",
        createdAt: new Date("2026-10-01T00:00:00Z"),
      },
      { ...current, prospectId: "casey" },
    ]);
    assert.deepEqual(
      ordered.map((m) => m.prospectId),
      ["casey"]
    );
  });
});
