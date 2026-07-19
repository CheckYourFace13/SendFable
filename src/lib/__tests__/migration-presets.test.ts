import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectColumnMapping,
  mapProviderStatus,
  mergeContactStatus,
  MIGRATION_PRESETS,
} from "../migration-presets";

describe("migration-presets", () => {
  it("exposes all expected providers", () => {
    for (const id of [
      "mailchimp",
      "constant-contact",
      "brevo",
      "mailerlite",
      "kit",
      "generic",
    ] as const) {
      assert.ok(MIGRATION_PRESETS[id]);
    }
  });

  it("detects Mailchimp headers", () => {
    const mapping = detectColumnMapping(
      ["Email Address", "First Name", "Last Name", "STATUS", "TAGS"],
      "mailchimp"
    );
    assert.equal(mapping[0], "email");
    assert.equal(mapping[1], "firstName");
    assert.equal(mapping[2], "lastName");
    assert.equal(mapping[3], "status");
  });

  it("maps provider statuses", () => {
    assert.equal(mapProviderStatus("mailchimp", "unsubscribed"), "UNSUBSCRIBED");
    assert.equal(mapProviderStatus("mailchimp", "cleaned"), "BOUNCED");
    assert.equal(mapProviderStatus("mailerlite", "junk"), "COMPLAINED");
    assert.equal(mapProviderStatus("generic", ""), "SUBSCRIBED");
  });

  it("never upgrades restricted statuses to subscribed", () => {
    assert.equal(mergeContactStatus("UNSUBSCRIBED", "SUBSCRIBED"), "UNSUBSCRIBED");
    assert.equal(mergeContactStatus("BOUNCED", "SUBSCRIBED"), "BOUNCED");
    assert.equal(mergeContactStatus("COMPLAINED", "PENDING_CONFIRM"), "COMPLAINED");
    assert.equal(mergeContactStatus("SUBSCRIBED", "UNSUBSCRIBED"), "UNSUBSCRIBED");
    assert.equal(mergeContactStatus("UNSUBSCRIBED", "COMPLAINED"), "COMPLAINED");
  });
});
