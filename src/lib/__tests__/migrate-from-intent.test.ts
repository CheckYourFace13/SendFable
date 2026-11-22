import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contactsMigratePath,
  moveListCtaLabel,
  parseMigrateFrom,
  postAuthPathForMigrateFrom,
  signupWithMigrateFrom,
} from "@/lib/migrate-from-intent";

describe("migrate-from-intent", () => {
  it("parses known competitor slugs", () => {
    assert.equal(parseMigrateFrom("mailchimp"), "mailchimp");
    assert.equal(parseMigrateFrom("MailerLite"), "mailerlite");
    assert.equal(parseMigrateFrom("brevo"), "brevo");
    assert.equal(parseMigrateFrom("sendinblue"), "brevo");
    assert.equal(parseMigrateFrom("onboarding"), null);
    assert.equal(parseMigrateFrom("not-a-vendor"), null);
  });

  it("builds signup and migrate deep links", () => {
    assert.equal(signupWithMigrateFrom("mailchimp"), "/signup?from=mailchimp");
    assert.equal(contactsMigratePath("brevo"), "/contacts/migrate?provider=brevo");
    assert.equal(postAuthPathForMigrateFrom("mailerlite"), "/contacts/migrate?provider=mailerlite");
    assert.equal(postAuthPathForMigrateFrom(null), "/onboarding");
    assert.match(moveListCtaLabel("mailchimp"), /Mailchimp/);
  });
});
