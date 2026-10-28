import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUDIENCE_MISSING,
  AUDIENCE_REQUIRED,
  EVERYONE_SUBSCRIBED,
  campaignAudienceIsSendable,
  labelCampaignAudience,
  preferredScribeAudienceTagId,
  resolveScribeAudience,
} from "@/lib/autopilot/audience";

const fans = { id: "tag_fans", name: "Fans" };
const venues = { id: "tag_venues", name: "Venues" };
const customers = { id: "tag_customers", name: "Customers" };

describe("Scribe default audience", () => {
  it("autoselects the only normal audience", () => {
    const resolved = resolveScribeAudience({
      config: { audienceType: "all", audienceTagIds: [], audienceChosen: false },
      audiences: [fans],
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.audienceType, "tags");
    assert.deepEqual(resolved.audienceTagIds, [fans.id]);
    assert.equal(resolved.label, "Fans");
    assert.equal(resolved.source, "single");
    assert.notEqual(resolved.label, EVERYONE_SUBSCRIBED);
  });

  it("requires an explicit choice when there are multiple audiences and no default", () => {
    const resolved = resolveScribeAudience({
      config: { audienceType: "all", audienceTagIds: [], audienceChosen: false },
      audiences: [fans, venues],
    });
    assert.equal(resolved.ok, false);
    if (resolved.ok) return;
    assert.equal(resolved.reason, "audience_required");
    assert.equal(resolved.label, AUDIENCE_REQUIRED);
  });

  it("allows Everyone subscribed only as a deliberate choice", () => {
    const silent = resolveScribeAudience({
      config: { audienceType: "all", audienceTagIds: [], audienceChosen: false },
      audiences: [fans, venues],
    });
    assert.equal(silent.ok, false);
    const explicit = resolveScribeAudience({
      config: { audienceType: "all", audienceTagIds: [], audienceChosen: true },
      audiences: [fans, venues],
    });
    assert.equal(explicit.ok, true);
    if (!explicit.ok) return;
    assert.equal(explicit.audienceType, "all");
    assert.equal(explicit.label, EVERYONE_SUBSCRIBED);
    assert.equal(explicit.source, "explicit");
  });

  it("uses the try-builder primary audience as the sensible Scribe default", () => {
    const resolved = resolveScribeAudience({
      config: { audienceType: "all", audienceTagIds: [], audienceChosen: false },
      audiences: [fans, venues],
      preferredAudienceTagId: preferredScribeAudienceTagId({
        scribePreferredAudienceTagId: fans.id,
      }),
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.label, "Fans");
    assert.deepEqual(resolved.audienceTagIds, [fans.id]);
    assert.notEqual(resolved.label, "Venues");
    assert.notEqual(resolved.label, EVERYONE_SUBSCRIBED);
  });

  it("band Fans then Venues drafts follow the configured default", () => {
    const fansDraft = resolveScribeAudience({
      config: { audienceType: "tags", audienceTagIds: [fans.id], audienceChosen: true },
      audiences: [fans, venues],
    });
    assert.equal(fansDraft.ok, true);
    if (!fansDraft.ok) return;
    assert.equal(fansDraft.label, "Fans");
    assert.deepEqual(fansDraft.audienceTagIds, [fans.id]);

    const venuesDraft = resolveScribeAudience({
      config: { audienceType: "tags", audienceTagIds: [venues.id], audienceChosen: true },
      audiences: [fans, venues],
    });
    assert.equal(venuesDraft.ok, true);
    if (!venuesDraft.ok) return;
    assert.equal(venuesDraft.label, "Venues");
    assert.deepEqual(venuesDraft.audienceTagIds, [venues.id]);
    assert.notEqual(venuesDraft.label, "Fans");
    assert.notEqual(venuesDraft.label, EVERYONE_SUBSCRIBED);
  });

  it("does not fall back to Everyone subscribed when the default audience is deleted", () => {
    const resolved = resolveScribeAudience({
      config: { audienceType: "tags", audienceTagIds: [fans.id], audienceChosen: true },
      audiences: [venues, customers],
    });
    assert.equal(resolved.ok, false);
    if (resolved.ok) return;
    assert.equal(resolved.reason, "audience_missing");
    assert.equal(resolved.label, AUDIENCE_MISSING);
    assert.notEqual(resolved.label, EVERYONE_SUBSCRIBED);
    assert.equal(
      campaignAudienceIsSendable({
        audienceType: "tags",
        audienceTagIds: [fans.id],
        existingTagIds: [venues.id, customers.id],
      }).ok,
      false
    );
  });

  it("labels waiting drafts with the audience name", () => {
    assert.equal(
      labelCampaignAudience({
        audienceType: "tags",
        audienceTagIds: [fans.id],
        audiences: [fans, venues],
      }),
      "Fans"
    );
    assert.equal(
      labelCampaignAudience({
        audienceType: "tags",
        audienceTagIds: [fans.id],
        audiences: [venues],
      }),
      AUDIENCE_MISSING
    );
  });
});

describe("Scribe audience wiring", () => {
  it("persists the chosen audience instead of hardcoding Everyone subscribed", () => {
    const page = readFileSync(join(process.cwd(), "src/app/(app)/scribe/page.tsx"), "utf8");
    assert.match(page, /Campaign audience/);
    assert.match(page, /audiencePayload/);
    assert.match(page, /audienceChosen/);
    assert.doesNotMatch(page, /body: JSON.stringify\(\{[\s\S]*audienceType: "all",\s*checkFrequency/);
    assert.match(page, /Audience:/);
    const config = readFileSync(join(process.cwd(), "src/app/api/autopilot/config/route.ts"), "utf8");
    assert.match(config, /audienceChosen/);
    assert.match(config, /resolveScribeAudience/);
    const tick = readFileSync(join(process.cwd(), "src/lib/autopilot/tick.ts"), "utf8");
    assert.match(tick, /resolveScribeAudience/);
    assert.match(tick, /audience_unresolved/);
    assert.doesNotMatch(tick, /enqueueAutopilotAutoSend/);
    assert.doesNotMatch(tick, /launchCampaign/);
    const apply = readFileSync(join(process.cwd(), "src/lib/try-signup/apply.ts"), "utf8");
    assert.match(apply, /scribePreferredAudienceTagId/);
    assert.doesNotMatch(apply, /enabled:\s*true/);
    const approval = readFileSync(join(process.cwd(), "src/lib/autopilot/approval.ts"), "utf8");
    assert.match(approval, /labelCampaignAudience/);
    assert.match(approval, /AUDIENCE_MISSING/);
    assert.match(approval, /schedule_required/);
    assert.match(config, /ctx\.workspace\.id/);
    const drafts = readFileSync(join(process.cwd(), "src/app/api/autopilot/drafts/route.ts"), "utf8");
    assert.match(drafts, /ctx\.workspace\.id/);
  });
});
