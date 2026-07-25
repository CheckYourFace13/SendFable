import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS } from "@/lib/plans";
import {
  CURRENT_POLICY_BUNDLE,
  LEGAL_OPERATOR_NAME,
  LEGAL_OPERATOR_STATEMENT,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
} from "@/lib/legal-policies";

describe("legal policy constants", () => {
  it("uses Treatment B operator wording without claiming a verified DBA", () => {
    assert.equal(LEGAL_OPERATOR_NAME, "iScream Studio INC");
    assert.match(LEGAL_OPERATOR_STATEMENT, /operated by iScream Studio INC/);
    assert.doesNotMatch(LEGAL_OPERATOR_STATEMENT, /d\/b\/a|doing business as/i);
  });

  it("keeps policy bundle versions aligned", () => {
    assert.equal(CURRENT_POLICY_BUNDLE, "2026-07-25");
    for (const v of Object.values(POLICY_VERSIONS)) {
      assert.equal(v, CURRENT_POLICY_BUNDLE);
    }
  });

  it("exposes public SendFable mailboxes only", () => {
    for (const addr of Object.values(PUBLIC_MAILBOXES)) {
      assert.match(addr, /@sendfable\.com$/);
      assert.doesNotMatch(addr, /iscreamstudio/i);
    }
  });

  it("publishes expected policy paths", () => {
    assert.equal(POLICY_PATHS.cookies, "/cookies");
    assert.equal(POLICY_PATHS.refund, "/refund-policy");
  });
});

describe("plan catalog for billing policy", () => {
  it("matches published Free/Starter/Growth/Pro limits", () => {
    assert.deepEqual(
      {
        contacts: PLANS.FREE.contactCap,
        emails: PLANS.FREE.emailsPerMonth,
        monthly: PLANS.FREE.monthlyPrice,
      },
      { contacts: 500, emails: 2_000, monthly: 0 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.STARTER.contactCap,
        emails: PLANS.STARTER.emailsPerMonth,
        monthly: PLANS.STARTER.monthlyPrice,
        yearly: PLANS.STARTER.yearlyPrice,
      },
      { contacts: 2_500, emails: 15_000, monthly: 9, yearly: 90 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.GROWTH.contactCap,
        emails: PLANS.GROWTH.emailsPerMonth,
        monthly: PLANS.GROWTH.monthlyPrice,
        yearly: PLANS.GROWTH.yearlyPrice,
      },
      { contacts: 10_000, emails: 60_000, monthly: 19, yearly: 190 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.PRO.contactCap,
        emails: PLANS.PRO.emailsPerMonth,
        monthly: PLANS.PRO.monthlyPrice,
        yearly: PLANS.PRO.yearlyPrice,
        seats: PLANS.PRO.seats,
      },
      { contacts: 30_000, emails: 200_000, monthly: 49, yearly: 490, seats: 10 }
    );
  });
});
