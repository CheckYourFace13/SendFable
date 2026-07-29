/**
 * SMS Stripe setup — DRY RUN BY DEFAULT. Prints every product, price, meter
 * and lookup key it WOULD create, plus the env var names to store.
 *
 * Usage:
 *   npx tsx scripts/stripe-sms-setup.ts                       # dry run
 *   npx tsx scripts/stripe-sms-setup.ts --confirm-test-sms-setup  # test mode writes (sk_test_ only)
 *   npx tsx scripts/stripe-sms-setup.ts --confirm-live-sms-setup  # live writes (requires billing flag + sk_live_)
 *
 * Safety:
 *  - refuses live mode without --confirm-live-sms-setup
 *  - refuses live mode while SENDFABLE_SMS_BILLING_ENABLED != true
 *  - refuses test mode unless STRIPE_SECRET_KEY is sk_test_
 *  - verifies existing lookup keys first — rerunning never duplicates objects
 *  - never runs automatically during build or deploy
 *
 * Usage metering uses the CURRENT Stripe Billing Meters model (Meter +
 * metered price bound via price.recurring.meter) supported by stripe@16 /
 * API 2024-06-20 — NOT the deprecated per-subscription-item usage records.
 */

import Stripe from "stripe";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  type SmsPlanKey,
} from "../src/lib/sms/pricing";

const CONFIRM_LIVE_ARG = "--confirm-live-sms-setup";
/** Creates products/prices against a Stripe *test* secret key only. */
const CONFIRM_TEST_ARG = "--confirm-test-sms-setup";

interface PlannedMeter {
  lookupNote: string;
  eventName: string;
  displayName: string;
}

interface PlannedPrice {
  productName: string;
  lookupKey: string;
  envVar: string;
  kind: "recurring-fixed" | "recurring-metered" | "one-time";
  unitAmountCents?: number;
  /** Metered prices bill fractional cents per segment: use unit_amount_decimal */
  unitAmountDecimalCents?: string;
  meterEventName?: string;
  note?: string;
}

function plan(): { meters: PlannedMeter[]; prices: PlannedPrice[] } {
  const meters: PlannedMeter[] = [
    {
      displayName: "SendFable SMS outbound segments",
      eventName: "sms_outbound_segments",
      lookupNote: "one shared meter; per-plan rates come from the price",
    },
    {
      displayName: "SendFable SMS inbound overage segments",
      eventName: "sms_inbound_overage_segments",
      lookupNote: "only OVERAGE segments are reported — included allowance is never metered",
    },
  ];

  const prices: PlannedPrice[] = [];

  for (const key of Object.keys(SMS_PLANS) as SmsPlanKey[]) {
    const def = SMS_PLANS[key];
    const slug = key.toLowerCase();
    prices.push({
      productName: `SendFable ${def.name}`,
      lookupKey: `sms_${slug}_monthly`,
      envVar: `STRIPE_PRICE_SMS_${key}_MONTHLY`,
      kind: "recurring-fixed",
      unitAmountCents: def.monthlyPriceCents,
    });
    if (def.bundledMonthlyPriceCents !== null) {
      prices.push({
        productName: `SendFable ${def.name}`,
        lookupKey: `sms_${slug}_monthly_bundled`,
        envVar: `STRIPE_PRICE_SMS_${key}_MONTHLY_BUNDLED`,
        kind: "recurring-fixed",
        unitAmountCents: def.bundledMonthlyPriceCents,
        note: "10% bundle price — applied only with an active Growth/Pro/Pro Plus email plan",
      });
    }
    prices.push({
      productName: `SendFable ${def.name} — outbound texts`,
      lookupKey: `sms_outbound_${slug}`,
      envVar: `STRIPE_PRICE_SMS_OUTBOUND_${key}`,
      kind: "recurring-metered",
      unitAmountDecimalCents: (def.outboundSegmentPriceMicros / 10_000).toFixed(2),
      meterEventName: "sms_outbound_segments",
      note: `$${(def.outboundSegmentPriceMicros / 1_000_000).toFixed(3)} per outbound segment`,
    });
  }

  prices.push({
    productName: "SendFable incoming text overage",
    lookupKey: "sms_inbound_overage",
    envVar: "STRIPE_PRICE_SMS_INBOUND_OVERAGE",
    kind: "recurring-metered",
    unitAmountDecimalCents: "2.50",
    meterEventName: "sms_inbound_overage_segments",
    note: "$0.025 per incoming segment beyond the plan's included allowance",
  });

  prices.push({
    productName: "SendFable Text Messaging Activation",
    lookupKey: "sms_activation_fee",
    envVar: "STRIPE_PRICE_SMS_ACTIVATION",
    kind: "one-time",
    unitAmountCents: SMS_ACTIVATION_FEE_CENTS,
    note: "one-time; covers standard onboarding/registration prep; exceptional charges are separate invoice items requiring customer approval",
  });

  return { meters, prices };
}

function printPlan() {
  const { meters, prices } = plan();
  console.log("=== SMS Stripe setup plan (NOTHING has been created) ===\n");
  console.log("Billing Meters:");
  for (const m of meters) {
    console.log(`  - ${m.displayName}`);
    console.log(`      event_name: ${m.eventName}   (${m.lookupNote})`);
  }
  console.log("\nProducts & Prices:");
  for (const p of prices) {
    const amount =
      p.kind === "recurring-metered"
        ? `${p.unitAmountDecimalCents}¢/segment (metered, meter=${p.meterEventName})`
        : `$${((p.unitAmountCents ?? 0) / 100).toFixed(2)}${p.kind === "recurring-fixed" ? "/month" : " one-time"}`;
    console.log(`  - ${p.productName}`);
    console.log(`      lookup_key: ${p.lookupKey}`);
    console.log(`      amount:     ${amount}`);
    console.log(`      env var:    ${p.envVar}`);
    if (p.note) console.log(`      note:       ${p.note}`);
  }
  console.log("\nExceptional charges: created ad-hoc as one-time invoice items after");
  console.log("explicit customer approval — no pre-created price object.");
  console.log("\nEnvironment variables expected after live setup:");
  for (const p of prices) console.log(`  ${p.envVar}=price_...`);
  console.log("\nDry run complete. To create these objects:");
  console.log(`  Test mode: set STRIPE_SECRET_KEY=sk_test_... then rerun with ${CONFIRM_TEST_ARG}`);
  console.log(`  Live mode: set SENDFABLE_SMS_BILLING_ENABLED=true + sk_live_... then ${CONFIRM_LIVE_ARG}`);
}

async function runSetup(mode: "test" | "live") {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error("REFUSED: STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }
  if (mode === "test" && !key.startsWith("sk_test_")) {
    console.error("REFUSED: test setup requires STRIPE_SECRET_KEY starting with sk_test_.");
    process.exit(1);
  }
  if (mode === "live") {
    if (process.env.SENDFABLE_SMS_BILLING_ENABLED?.trim().toLowerCase() !== "true") {
      console.error(
        `REFUSED: live setup requires SENDFABLE_SMS_BILLING_ENABLED=true (currently disabled).`
      );
      process.exit(1);
    }
    if (!key.startsWith("sk_live_")) {
      console.error("REFUSED: live setup requires STRIPE_SECRET_KEY starting with sk_live_.");
      process.exit(1);
    }
  }

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const { meters, prices } = plan();

  const existingMeters = await stripe.billing.meters.list({ limit: 100 });
  const meterIds = new Map<string, string>();
  for (const m of meters) {
    const found = existingMeters.data.find((x) => x.event_name === m.eventName);
    if (found) {
      console.log(`meter exists: ${m.eventName} (${found.id})`);
      meterIds.set(m.eventName, found.id);
      continue;
    }
    const created = await stripe.billing.meters.create({
      display_name: m.displayName,
      event_name: m.eventName,
      default_aggregation: { formula: "sum" },
      customer_mapping: { event_payload_key: "stripe_customer_id", type: "by_id" },
      value_settings: { event_payload_key: "value" },
    });
    console.log(`meter created: ${m.eventName} (${created.id})`);
    meterIds.set(m.eventName, created.id);
  }

  for (const p of prices) {
    const existing = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
    if (existing.data.length) {
      console.log(`price exists: ${p.lookupKey} -> ${existing.data[0].id}  (${p.envVar})`);
      continue;
    }
    const product = await stripe.products.create({ name: p.productName });
    const base: Stripe.PriceCreateParams = {
      product: product.id,
      currency: "usd",
      lookup_key: p.lookupKey,
      transfer_lookup_key: true,
    };
    let created: Stripe.Price;
    if (p.kind === "recurring-fixed") {
      created = await stripe.prices.create({
        ...base,
        unit_amount: p.unitAmountCents,
        recurring: { interval: "month" },
      });
    } else if (p.kind === "recurring-metered") {
      created = await stripe.prices.create({
        ...base,
        unit_amount_decimal: p.unitAmountDecimalCents,
        recurring: {
          interval: "month",
          usage_type: "metered",
          meter: meterIds.get(p.meterEventName!)!,
        },
      });
    } else {
      created = await stripe.prices.create({ ...base, unit_amount: p.unitAmountCents });
    }
    console.log(`price created: ${p.lookupKey} -> ${created.id}  (${p.envVar})`);
  }
  console.log(`\n${mode.toUpperCase()} SMS Stripe setup complete. Store the printed price IDs in env.`);
}

async function main() {
  const confirmLive = process.argv.includes(CONFIRM_LIVE_ARG);
  const confirmTest = process.argv.includes(CONFIRM_TEST_ARG);
  if (confirmLive && confirmTest) {
    console.error("REFUSED: pass only one of test/live confirm flags.");
    process.exit(1);
  }
  if (!confirmLive && !confirmTest) {
    printPlan();
    return;
  }
  await runSetup(confirmTest ? "test" : "live");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
