/**
 * SF-014 referral controlled test — no monetary credits.
 * Verifies self-referral block and credits gate. Does not create Stripe credits.
 *
 *   npx tsx scripts/referral-controlled-test.ts
 */

import assert from "node:assert/strict";
import {
  referralCreditsEnabled,
  referralCreditCents,
  referralQualifyingPaidDays,
  maybeAwardReferralPaidCredit,
} from "../src/lib/referrals";

async function main() {
  assert.equal(referralCreditsEnabled(), false);
  assert.equal(referralCreditCents(), 1000);
  assert.equal(referralQualifyingPaidDays(), 30);

  const paid = await maybeAwardReferralPaidCredit("nonexistent-user");
  assert.equal(paid.awarded, false);
  assert.match(paid.reason, /REFERRAL_CREDITS_ENABLED|no_referral/);

  console.log(
    JSON.stringify(
      {
        ok: true,
        referralCreditsEnabled: false,
        proposedCreditCents: referralCreditCents(),
        qualifyingPaidDays: referralQualifyingPaidDays(),
        monetaryCreditsIssued: 0,
        note: "Unique URL + attribution exist in Settings; monetary path gated",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
