import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  acquisitionWebsiteDemoEnabled,
  chooseInitialTrack,
  isCurrentAutopilotInitial,
  orderSendCandidates,
  planStaleInitial,
  stableAutopilotVariant,
} from "@/lib/acquisition/queue-policy";

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
  });

  it("assigns a stable A/B variant", () => {
    assert.equal(stableAutopilotVariant("prospect-1"), stableAutopilotVariant("prospect-1"));
    assert.ok(["v1a", "v1b"].includes(stableAutopilotVariant("prospect-1")));
  });

  it("does not put a prospect on the demo track while owner review is open", () => {
    assert.equal(acquisitionWebsiteDemoEnabled(), false);
    assert.equal(chooseInitialTrack(true), "normal");
    assert.equal(chooseInitialTrack(false), "normal");
  });
});
