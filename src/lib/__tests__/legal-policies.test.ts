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
    assert.equal(CURRENT_POLICY_BUNDLE, "2026-07-25b");
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
  it("matches published Free/Starter/Growth/Pro/Pro Plus limits", () => {
    assert.deepEqual(
      {
        contacts: PLANS.FREE.contactCap,
        emails: PLANS.FREE.emailsPerMonth,
        monthly: PLANS.FREE.monthlyPrice,
      },
      { contacts: 500, emails: 1_000, monthly: 0 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.STARTER.contactCap,
        emails: PLANS.STARTER.emailsPerMonth,
        monthly: PLANS.STARTER.monthlyPrice,
        yearly: PLANS.STARTER.yearlyPrice,
      },
      { contacts: 2_500, emails: 10_000, monthly: 12, yearly: 120 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.GROWTH.contactCap,
        emails: PLANS.GROWTH.emailsPerMonth,
        monthly: PLANS.GROWTH.monthlyPrice,
        yearly: PLANS.GROWTH.yearlyPrice,
      },
      { contacts: 10_000, emails: 40_000, monthly: 29, yearly: 290 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.PRO.contactCap,
        emails: PLANS.PRO.emailsPerMonth,
        monthly: PLANS.PRO.monthlyPrice,
        yearly: PLANS.PRO.yearlyPrice,
      },
      { contacts: 20_000, emails: 80_000, monthly: 69, yearly: 690 }
    );
    assert.deepEqual(
      {
        contacts: PLANS.PRO_PLUS.contactCap,
        emails: PLANS.PRO_PLUS.emailsPerMonth,
        monthly: PLANS.PRO_PLUS.monthlyPrice,
        yearly: PLANS.PRO_PLUS.yearlyPrice,
      },
      { contacts: 40_000, emails: 200_000, monthly: 99, yearly: 990 }
    );
  });
});
