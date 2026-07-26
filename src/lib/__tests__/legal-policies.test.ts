import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS } from "@/lib/plans";
import {
  CURRENT_POLICY_BUNDLE,
  GOVERNING_LAW_PROOF_NEEDED,
  GOVERNING_LAW_STATUS,
  LEGAL_OPERATOR_NAME,
  LEGAL_OPERATOR_STATEMENT,
  POLICY_PATHS,
  POLICY_VERSIONS,
  PUBLIC_MAILBOXES,
  REFUND_POSTURE_SUMMARY,
} from "@/lib/legal-policies";

describe("legal policy constants", () => {
  it("uses Treatment B operator wording without claiming a verified DBA", () => {
    assert.equal(LEGAL_OPERATOR_NAME, "iScream Studio INC");
    assert.match(LEGAL_OPERATOR_STATEMENT, /operated by iScream Studio INC/);
    assert.doesNotMatch(LEGAL_OPERATOR_STATEMENT, /d\/b\/a|doing business as/i);
  });

  it("keeps policy bundle versions aligned", () => {
    assert.equal(CURRENT_POLICY_BUNDLE, "2026-07-26");
    for (const v of Object.values(POLICY_VERSIONS)) {
      assert.equal(v, CURRENT_POLICY_BUNDLE);
    }
  });

  it("does not invent a governing-law state without verified formation proof", () => {
    assert.equal(GOVERNING_LAW_STATUS, "OWNER_CONFIRMATION_REQUIRED");
    assert.match(GOVERNING_LAW_PROOF_NEEDED, /Illinois Secretary of State/i);
    assert.doesNotMatch(GOVERNING_LAW_PROOF_NEEDED, /assumes Illinois/i);
  });

  it("keeps owner-approved refund posture without unconditional first-charge refund", () => {
    assert.match(REFUND_POSTURE_SUMMARY, /may request a refund of their first paid/i);
    assert.match(
      REFUND_POSTURE_SUMMARY,
      /generally approved when the account has not sent a live campaign/i
    );
    assert.match(REFUND_POSTURE_SUMMARY, /within seven days may be considered/i);
    assert.match(REFUND_POSTURE_SUMMARY, /Duplicate or erroneous charges will be corrected/i);
    assert.match(REFUND_POSTURE_SUMMARY, /not eligible for discretionary refunds/i);
    assert.doesNotMatch(REFUND_POSTURE_SUMMARY, /we will refund that first charge in full/i);
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
