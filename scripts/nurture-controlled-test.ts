/**
 * SF-014 controlled nurture test — owner allowlist only.
 *
 * Usage (production app container or VPS with env set):
 *   NURTURE_TEST_MODE=true \
 *   NURTURE_TEST_ALLOWLIST="owner@example.com" \
 *   NURTURE_GENERAL_ENABLED=false \
 *   npx tsx scripts/nurture-controlled-test.ts --confirm-owner-qa
 *
 * Limits: ≤2 recipients, ≤12 emails, 1 enrollment sample per sequence.
 */

import { NURTURE_SEQUENCES } from "../src/data/content-pipeline";
import {
  nurtureGeneralEnabled,
  nurtureTestAllowlist,
  nurtureTestMode,
  sendNurtureStep,
} from "../src/lib/nurture";

const CONFIRM = "--confirm-owner-qa";
const MAX_EMAILS = 12;

async function main() {
  if (!process.argv.includes(CONFIRM)) {
    console.error("Refusing: pass --confirm-owner-qa");
    process.exit(1);
  }
  if (nurtureGeneralEnabled()) {
    console.error("Refusing: NURTURE_GENERAL_ENABLED must be false for this QA pass");
    process.exit(1);
  }
  if (!nurtureTestMode()) {
    console.error("Refusing: set NURTURE_TEST_MODE=true");
    process.exit(1);
  }

  const allow = nurtureTestAllowlist();
  if (!allow.length) {
    console.error("Refusing: NURTURE_TEST_ALLOWLIST empty (max 2 owner emails)");
    process.exit(1);
  }

  const recipient = allow[0];
  // Pick representative steps across all 5 sequences, totaling ≤12.
  const plan: { sequenceId: string; day: number; consent: boolean }[] = [
    { sequenceId: "lead", day: 0, consent: true },
    { sequenceId: "lead", day: 2, consent: true },
    { sequenceId: "free-activation", day: 0, consent: false },
    { sequenceId: "free-activation", day: 1, consent: false },
    { sequenceId: "free-activation", day: 2, consent: false },
    { sequenceId: "inactive", day: 14, consent: false },
    { sequenceId: "inactive", day: 21, consent: false },
    { sequenceId: "free-to-paid", day: 0, consent: false },
    { sequenceId: "free-to-paid", day: 3, consent: false },
    { sequenceId: "mailchimp-migration", day: 0, consent: true },
    { sequenceId: "mailchimp-migration", day: 2, consent: true },
    { sequenceId: "mailchimp-migration", day: 4, consent: true },
  ].slice(0, MAX_EMAILS);

  // Negative tests (no send)
  const negatives = [
    await sendNurtureStep({
      sequenceId: "lead",
      stepDay: 0,
      to: "random-customer@example.com",
      marketingConsent: true,
      compressed: true,
    }),
    await sendNurtureStep({
      sequenceId: "lead",
      stepDay: 0,
      to: recipient,
      marketingConsent: false,
      compressed: true,
    }),
    await sendNurtureStep({
      sequenceId: "lead",
      stepDay: 0,
      to: recipient,
      marketingConsent: true,
      held: true,
      compressed: true,
    }),
  ];

  const results = [];
  for (const step of plan) {
    const r = await sendNurtureStep({
      sequenceId: step.sequenceId,
      stepDay: step.day,
      to: recipient,
      marketingConsent: step.consent,
      compressed: true,
    });
    results.push({ ...step, ...r });
    // Duplicate enrollment protection
    const dup = await sendNurtureStep({
      sequenceId: step.sequenceId,
      stepDay: step.day,
      to: recipient,
      marketingConsent: step.consent,
      alreadySentStep: true,
      compressed: true,
    });
    if (dup.status !== "blocked") {
      console.error("Duplicate step was not blocked", dup);
      process.exit(1);
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  console.log(
    JSON.stringify(
      {
        ok: sent > 0 && sent <= MAX_EMAILS,
        generalEnabled: nurtureGeneralEnabled(),
        testMode: nurtureTestMode(),
        sequencesDefined: NURTURE_SEQUENCES.map((s) => s.id),
        recipientMasked: results[0]?.masked,
        planned: plan.length,
        sent,
        negatives: negatives.map((n) => ({ status: n.status, reason: n.reason })),
        results: results.map((r) => ({
          sequenceId: r.sequenceId,
          day: r.day,
          status: r.status,
          reason: r.reason,
          masked: r.masked,
        })),
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
