/**
 * Local SMS invoice simulation — NO Stripe API calls.
 * Uses only src/lib/sms/pricing.ts integer math.
 *
 * Run: npx tsx scripts/sms-invoice-simulate.ts
 */

import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  billableInboundSegments,
  formatCentsUsd,
  formatMicrosUsd,
  inboundOverageChargeMicros,
  microsToCentsFloor,
  outboundChargeMicros,
  resolveSmsPricing,
  type SmsPlanKey,
} from "../src/lib/sms/pricing";
import type { Plan } from "@prisma/client";

function monthTotalCents(
  plan: SmsPlanKey,
  emailPlan: Plan,
  emailActive: boolean,
  outboundSegments: number,
  inboundSegments: number,
  includeActivation: boolean
): {
  label: string;
  fixedCents: number;
  outboundCents: number;
  inboundOverageCents: number;
  activationCents: number;
  totalCents: number;
} {
  const pricing = resolveSmsPricing(plan, { plan: emailPlan, active: emailActive });
  const outboundMicros = outboundChargeMicros(plan, outboundSegments);
  const inboundMicros = inboundOverageChargeMicros(plan, inboundSegments);
  const outboundCents = microsToCentsFloor(outboundMicros);
  const inboundOverageCents = microsToCentsFloor(inboundMicros);
  const activationCents = includeActivation ? SMS_ACTIVATION_FEE_CENTS : 0;
  const fixedCents = pricing.appliedMonthlyPriceCents;
  return {
    label: `${plan} email=${emailPlan}${emailActive ? "" : "(inactive)"} out=${outboundSegments} in=${inboundSegments}${includeActivation ? " +activation" : ""}`,
    fixedCents,
    outboundCents,
    inboundOverageCents,
    activationCents,
    totalCents: fixedCents + outboundCents + inboundOverageCents + activationCents,
  };
}

const scenarios = [
  // 1. Text Entry with 100 outbound
  monthTotalCents("TEXT_ENTRY", "FREE", true, 100, 0, false),
  // 2. Text Essentials with 1,000 outbound
  monthTotalCents("TEXT_ESSENTIALS", "STARTER", true, 1000, 0, false),
  // 3. Text Essentials bundled with Growth
  monthTotalCents("TEXT_ESSENTIALS", "GROWTH", true, 0, 0, false),
  // 4. Text Advantage with 5,000 outbound
  monthTotalCents("TEXT_ADVANTAGE", "STARTER", true, 5000, 0, false),
  // 5. Text Advantage bundled with Pro
  monthTotalCents("TEXT_ADVANTAGE", "PRO", true, 0, 0, false),
  // 6. Incoming within allowance (Entry: 100 included)
  monthTotalCents("TEXT_ENTRY", "FREE", true, 0, 100, false),
  // 7. One incoming segment above allowance
  monthTotalCents("TEXT_ENTRY", "FREE", true, 0, 101, false),
  // 8. Activation fee alone (local calc)
  monthTotalCents("TEXT_ENTRY", "FREE", true, 0, 0, true),
];

console.log("=== Local SMS invoice simulation (no Stripe calls) ===\n");
for (const [i, s] of scenarios.entries()) {
  console.log(`${i + 1}. ${s.label}`);
  console.log(
    `   fixed=${formatCentsUsd(s.fixedCents)} outbound=${formatCentsUsd(s.outboundCents)} inbound_over=${formatCentsUsd(s.inboundOverageCents)} activation=${formatCentsUsd(s.activationCents)} TOTAL=${formatCentsUsd(s.totalCents)}`
  );
}

// 9. Upgrade Essentials → Advantage (standard, no usage)
const beforeUp = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "STARTER", active: true });
const afterUp = resolveSmsPricing("TEXT_ADVANTAGE", { plan: "STARTER", active: true });
console.log(
  `\n9. Upgrade Essentials→Advantage (standard): ${formatCentsUsd(beforeUp.appliedMonthlyPriceCents)} → ${formatCentsUsd(afterUp.appliedMonthlyPriceCents)} (delta ${formatCentsUsd(afterUp.appliedMonthlyPriceCents - beforeUp.appliedMonthlyPriceCents)})`
);

// 10. Downgrade Advantage → Essentials
console.log(
  `10. Downgrade Advantage→Essentials (standard): ${formatCentsUsd(afterUp.appliedMonthlyPriceCents)} → ${formatCentsUsd(beforeUp.appliedMonthlyPriceCents)} (delta ${formatCentsUsd(beforeUp.appliedMonthlyPriceCents - afterUp.appliedMonthlyPriceCents)})`
);

// 11. Bundle eligibility removal (Growth active → cancelled)
const bundled = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "GROWTH", active: true });
const unbundled = resolveSmsPricing("TEXT_ESSENTIALS", { plan: "GROWTH", active: false });
console.log(
  `11. Bundle eligibility removed (Essentials): ${formatCentsUsd(bundled.appliedMonthlyPriceCents)} → ${formatCentsUsd(unbundled.appliedMonthlyPriceCents)}`
);

// Sanity expected totals for report
const expected = {
  entry_100_out: 1999 + microsToCentsFloor(outboundChargeMicros("TEXT_ENTRY", 100)), // 1999+500=2499
  essentials_1000_out: 4999 + microsToCentsFloor(outboundChargeMicros("TEXT_ESSENTIALS", 1000)), // 4999+3500=8499
  essentials_growth: 4499,
  advantage_5000_out: 9999 + microsToCentsFloor(outboundChargeMicros("TEXT_ADVANTAGE", 5000)), // 9999+12500=22499
  advantage_pro: 8999,
  inbound_within: 1999,
  inbound_one_over: 1999 + microsToCentsFloor(inboundOverageChargeMicros("TEXT_ENTRY", 101)), // 1999+2=2001
  activation: 1999 + 9900,
};

console.log("\n=== Expected totals (cents) ===");
console.log(JSON.stringify(expected, null, 2));
console.log(`billable inbound 101 on Entry = ${billableInboundSegments("TEXT_ENTRY", 101)}`);
console.log(`plans=${Object.keys(SMS_PLANS).join(",")}`);
console.log(`sample_outbound_100_entry_micros=${formatMicrosUsd(outboundChargeMicros("TEXT_ENTRY", 100))}`);
