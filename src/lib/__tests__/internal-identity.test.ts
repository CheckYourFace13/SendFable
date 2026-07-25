import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isInternalOwnerEmail,
  containsInternalOwnerIdentity,
  redactInternalTeamUser,
  INTERNAL_OWNER_TEAM_LABEL,
} from "@/lib/internal-identity";

describe("internal-identity redaction", () => {
  it("detects the private owner mailbox", () => {
    assert.equal(isInternalOwnerEmail("chris@iscreamstudio.com"), true);
    assert.equal(isInternalOwnerEmail("support@sendfable.com"), false);
  });

  it("detects iScream / iscreamstudio fragments in free text", () => {
    assert.equal(containsInternalOwnerIdentity("operated by iScream Studio"), true);
    assert.equal(containsInternalOwnerIdentity("https://sendfable.com"), false);
  });

  it("redacts owner email from team payloads for other viewers", () => {
    const user = { email: "chris@iscreamstudio.com", name: "Chris" };
    const forMember = redactInternalTeamUser(user, "privacy@sendfable.com");
    assert.equal(forMember.email, INTERNAL_OWNER_TEAM_LABEL);
    assert.equal(forMember.name, INTERNAL_OWNER_TEAM_LABEL);

    const forSelf = redactInternalTeamUser(user, "chris@iscreamstudio.com");
    assert.equal(forSelf.email, "chris@iscreamstudio.com");
  });
});
