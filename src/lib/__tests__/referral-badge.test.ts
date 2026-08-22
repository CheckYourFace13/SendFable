import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { REFERRAL_BADGE_URL, isReferralBadgeLanding } from "@/lib/referral-badge";

describe("referral badge attribution", () => {
  it("tags footer badge URL with UTM params", () => {
    const url = new URL(REFERRAL_BADGE_URL);
    assert.equal(url.hostname, "sendfable.com");
    assert.equal(url.searchParams.get("utm_source"), "email");
    assert.equal(url.searchParams.get("utm_medium"), "footer_badge");
    assert.equal(url.searchParams.get("utm_campaign"), "free_plan");
  });

  it("detects referral badge landings", () => {
    const yes = new URLSearchParams(
      "utm_source=email&utm_medium=footer_badge&utm_campaign=free_plan"
    );
    const no = new URLSearchParams("utm_source=google&utm_medium=cpc");
    assert.equal(isReferralBadgeLanding(yes), true);
    assert.equal(isReferralBadgeLanding(no), false);
  });
});
