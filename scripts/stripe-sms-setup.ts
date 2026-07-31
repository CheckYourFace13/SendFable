/**
 * SMS Stripe catalog setup — DRY RUN BY DEFAULT.
 *
 * SF-016 live catalog creation (products/prices/meters ONLY):
 *   npx tsx scripts/stripe-sms-setup.ts --preflight-live
 *   npx tsx scripts/stripe-sms-setup.ts --confirm-live-sms-catalog
 *
 * Other modes:
 *   npx tsx scripts/stripe-sms-setup.ts                       # dry-run plan print
 *   npx tsx scripts/stripe-sms-setup.ts --confirm-test-sms-setup
 *   npx tsx scripts/stripe-sms-setup.ts --confirm-live-sms-setup  # legacy; requires billing flag
 *
 * Hard guarantees:
 *  - Never creates Checkout Sessions, subscriptions, customers, invoices,
 *    charges, payment methods, refunds, credits, or meter events
 *  - Live catalog mode refuses unless STRIPE_SECRET_KEY is sk_live_
 *  - Live catalog mode does NOT require SENDFABLE_SMS_BILLING_ENABLED
 *  - Created products are active=false until a future explicit enablement task
 *  - Lookup keys make reruns idempotent (reuse existing prices)
 *  - Never runs during build/deploy automatically
 */

import Stripe from "stripe";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  type SmsPlanKey,
} from "../src/lib/sms/pricing";

const CONFIRM_LIVE_ARG = "--confirm-live-sms-setup";
const CONFIRM_LIVE_CATALOG_ARG = "--confirm-live-sms-catalog";
const CONFIRM_TEST_ARG = "--confirm-test-sms-setup";
const PREFLIGHT_LIVE_ARG = "--preflight-live";
const VALIDATE_LIVE_ARG = "--validate-live-catalog";

const CATALOG_VERSION = "1";

/** Stable v1 lookup keys (SF-016). */
export const SMS_LOOKUP_KEYS = {
  TEXT_ENTRY_MONTHLY: "sendfable_sms_text_entry_monthly_v1",
  TEXT_ENTRY_OUTBOUND: "sendfable_sms_text_entry_outbound_segment_v1",
  TEXT_ESSENTIALS_MONTHLY: "sendfable_sms_text_essentials_monthly_v1",
  TEXT_ESSENTIALS_BUNDLE: "sendfable_sms_text_essentials_bundle_monthly_v1",
  TEXT_ESSENTIALS_OUTBOUND: "sendfable_sms_text_essentials_outbound_segment_v1",
  TEXT_ADVANTAGE_MONTHLY: "sendfable_sms_text_advantage_monthly_v1",
  TEXT_ADVANTAGE_BUNDLE: "sendfable_sms_text_advantage_bundle_monthly_v1",
  TEXT_ADVANTAGE_OUTBOUND: "sendfable_sms_text_advantage_outbound_segment_v1",
  INBOUND_OVERAGE: "sendfable_sms_incoming_overage_segment_v1",
  ACTIVATION: "sendfable_sms_activation_v1",
} as const;

/** Meter event names — immutable after creation; review carefully. */
export const SMS_METER_EVENTS = {
  TEXT_ENTRY_OUTBOUND: "sms_text_entry_outbound_segments_v1",
  TEXT_ESSENTIALS_OUTBOUND: "sms_text_essentials_outbound_segments_v1",
  TEXT_ADVANTAGE_OUTBOUND: "sms_text_advantage_outbound_segments_v1",
  INBOUND_OVERAGE: "sms_incoming_overage_segments_v1",
} as const;

interface PlannedMeter {
  eventName: string;
  displayName: string;
  note: string;
}

interface PlannedPrice {
  productName: string;
  lookupKey: string;
  envVar: string;
  kind: "recurring-fixed" | "recurring-metered" | "one-time";
  unitAmountCents?: number;
  unitAmountDecimalCents?: string;
  meterEventName?: string;
  planKey?: string;
  billingType: string;
  note?: string;
}

function commonMetadata(extra: Record<string, string> = {}): Record<string, string> {
  return {
    app: "sendfable",
    channel: "sms",
    environment: "live",
    catalog_version: CATALOG_VERSION,
    public_enabled: "false",
    ...extra,
  };
}

function planCatalog(): { meters: PlannedMeter[]; prices: PlannedPrice[] } {
  const meters: PlannedMeter[] = [
    {
      eventName: SMS_METER_EVENTS.TEXT_ENTRY_OUTBOUND,
      displayName: "SendFable Text Entry outbound SMS segments",
      note: "sum; value=segments; customer by stripe_customer_id",
    },
    {
      eventName: SMS_METER_EVENTS.TEXT_ESSENTIALS_OUTBOUND,
      displayName: "SendFable Text Essentials outbound SMS segments",
      note: "sum; value=segments; customer by stripe_customer_id",
    },
    {
      eventName: SMS_METER_EVENTS.TEXT_ADVANTAGE_OUTBOUND,
      displayName: "SendFable Text Advantage outbound SMS segments",
      note: "sum; value=segments; customer by stripe_customer_id",
    },
    {
      eventName: SMS_METER_EVENTS.INBOUND_OVERAGE,
      displayName: "SendFable incoming SMS overage segments",
      note: "only OVERAGE segments; included allowance never metered",
    },
  ];

  const outboundMeter: Record<SmsPlanKey, string> = {
    TEXT_ENTRY: SMS_METER_EVENTS.TEXT_ENTRY_OUTBOUND,
    TEXT_ESSENTIALS: SMS_METER_EVENTS.TEXT_ESSENTIALS_OUTBOUND,
    TEXT_ADVANTAGE: SMS_METER_EVENTS.TEXT_ADVANTAGE_OUTBOUND,
  };

  const monthlyLookup: Record<SmsPlanKey, string> = {
    TEXT_ENTRY: SMS_LOOKUP_KEYS.TEXT_ENTRY_MONTHLY,
    TEXT_ESSENTIALS: SMS_LOOKUP_KEYS.TEXT_ESSENTIALS_MONTHLY,
    TEXT_ADVANTAGE: SMS_LOOKUP_KEYS.TEXT_ADVANTAGE_MONTHLY,
  };
  const outboundLookup: Record<SmsPlanKey, string> = {
    TEXT_ENTRY: SMS_LOOKUP_KEYS.TEXT_ENTRY_OUTBOUND,
    TEXT_ESSENTIALS: SMS_LOOKUP_KEYS.TEXT_ESSENTIALS_OUTBOUND,
    TEXT_ADVANTAGE: SMS_LOOKUP_KEYS.TEXT_ADVANTAGE_OUTBOUND,
  };
  const bundleLookup: Partial<Record<SmsPlanKey, string>> = {
    TEXT_ESSENTIALS: SMS_LOOKUP_KEYS.TEXT_ESSENTIALS_BUNDLE,
    TEXT_ADVANTAGE: SMS_LOOKUP_KEYS.TEXT_ADVANTAGE_BUNDLE,
  };

  const prices: PlannedPrice[] = [];
  for (const key of Object.keys(SMS_PLANS) as SmsPlanKey[]) {
    const def = SMS_PLANS[key];
    const productName = `SendFable ${def.name}`;
    prices.push({
      productName,
      lookupKey: monthlyLookup[key],
      envVar: `STRIPE_PRICE_SMS_${key}_MONTHLY`,
      kind: "recurring-fixed",
      unitAmountCents: def.monthlyPriceCents,
      planKey: key,
      billingType: "fixed_monthly",
    });
    if (def.bundledMonthlyPriceCents !== null && bundleLookup[key]) {
      prices.push({
        productName,
        lookupKey: bundleLookup[key]!,
        envVar: `STRIPE_PRICE_SMS_${key}_MONTHLY_BUNDLED`,
        kind: "recurring-fixed",
        unitAmountCents: def.bundledMonthlyPriceCents,
        planKey: key,
        billingType: "fixed_monthly_bundle",
        note: "Bundle price — Growth/Pro/Pro Plus email only (server-enforced later)",
      });
    }
    prices.push({
      productName,
      lookupKey: outboundLookup[key],
      envVar: `STRIPE_PRICE_SMS_OUTBOUND_${key}`,
      kind: "recurring-metered",
      unitAmountDecimalCents: (def.outboundSegmentPriceMicros / 10_000).toFixed(2),
      meterEventName: outboundMeter[key],
      planKey: key,
      billingType: "metered_outbound_segment",
      note: `$${(def.outboundSegmentPriceMicros / 1_000_000).toFixed(3)} per outbound segment`,
    });
  }

  prices.push({
    productName: "SendFable Incoming SMS Overage",
    lookupKey: SMS_LOOKUP_KEYS.INBOUND_OVERAGE,
    envVar: "STRIPE_PRICE_SMS_INBOUND_OVERAGE",
    kind: "recurring-metered",
    unitAmountDecimalCents: "2.50",
    meterEventName: SMS_METER_EVENTS.INBOUND_OVERAGE,
    billingType: "metered_inbound_overage",
    note: "$0.025 per incoming segment beyond included allowance",
  });

  prices.push({
    productName: "SendFable Text Messaging Activation",
    lookupKey: SMS_LOOKUP_KEYS.ACTIVATION,
    envVar: "STRIPE_PRICE_SMS_ACTIVATION",
    kind: "one-time",
    unitAmountCents: SMS_ACTIVATION_FEE_CENTS,
    billingType: "activation_one_time",
    note: "Not charged until customer intentionally activates after public launch",
  });

  return { meters, prices };
}

function requireLiveKey(key: string | undefined): string {
  if (!key?.trim()) {
    console.error("REFUSED: STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }
  const k = key.trim();
  if (!k.startsWith("sk_live_")) {
    console.error("REFUSED: this mode requires STRIPE_SECRET_KEY starting with sk_live_.");
    process.exit(1);
  }
  return k;
}

function maskAccountId(id: string): string {
  if (id.length <= 10) return "***";
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function printPlan() {
  const { meters, prices } = planCatalog();
  console.log("=== SMS Stripe catalog plan (NOTHING created) ===\n");
  console.log("Billing Meters (review before create — event names are immutable):");
  for (const m of meters) {
    console.log(`  - ${m.displayName}`);
    console.log(`      event_name: ${m.eventName}`);
    console.log(`      ${m.note}`);
  }
  console.log("\nProducts & Prices (products created active=false):");
  for (const p of prices) {
    const amount =
      p.kind === "recurring-metered"
        ? `${p.unitAmountDecimalCents}¢/segment (metered)`
        : `$${((p.unitAmountCents ?? 0) / 100).toFixed(2)}${p.kind === "recurring-fixed" ? "/month" : " one-time"}`;
    console.log(`  - ${p.productName}`);
    console.log(`      lookup_key: ${p.lookupKey}`);
    console.log(`      amount:     ${amount}`);
    console.log(`      env var:    ${p.envVar}`);
    if (p.note) console.log(`      note:       ${p.note}`);
  }
  console.log("\nForbidden in this script: checkout, subscriptions, customers, invoices,");
  console.log("charges, payment methods, refunds, credits, meter events.");
  console.log(`\nLive catalog (flags stay false): ${CONFIRM_LIVE_CATALOG_ARG}`);
}

async function findSmsRelated(
  stripe: Stripe
): Promise<{
  products: { id: string; name: string; active: boolean }[];
  prices: { id: string; lookup_key: string | null; nickname: string | null; unit_amount: number | null }[];
  meters: { id: string; event_name: string; display_name: string }[];
}> {
  const products: { id: string; name: string; active: boolean }[] = [];
  const productPage = await stripe.products.list({ limit: 100 });
  for (const p of productPage.data) {
    const nameHit = /sms|text entry|text essentials|text advantage|text messaging|incoming sms/i.test(
      p.name
    );
    if (nameHit || p.metadata?.channel === "sms") {
      products.push({ id: p.id, name: p.name, active: p.active });
    }
  }

  const prices: {
    id: string;
    lookup_key: string | null;
    nickname: string | null;
    unit_amount: number | null;
  }[] = [];
  const lookupKeys = Object.values(SMS_LOOKUP_KEYS);
  // Also check legacy keys from earlier script drafts
  const legacy = [
    "sms_text_entry_monthly",
    "sms_text_essentials_monthly",
    "sms_text_essentials_monthly_bundled",
    "sms_text_advantage_monthly",
    "sms_text_advantage_monthly_bundled",
    "sms_activation_fee",
    "sms_outbound_text_entry",
    "sms_outbound_text_essentials",
    "sms_outbound_text_advantage",
    "sms_inbound_overage",
  ];
  const allKeys = [...lookupKeys, ...legacy];
  // Stripe allows at most 10 lookup_keys per list request
  for (let i = 0; i < allKeys.length; i += 10) {
    const chunk = allKeys.slice(i, i + 10);
    const existing = await stripe.prices.list({
      lookup_keys: chunk,
      limit: 100,
    });
    for (const pr of existing.data) {
      prices.push({
        id: pr.id,
        lookup_key: pr.lookup_key,
        nickname: pr.nickname,
        unit_amount: pr.unit_amount,
      });
    }
  }

  const meters: { id: string; event_name: string; display_name: string }[] = [];
  const meterList = await stripe.billing.meters.list({ limit: 100 });
  for (const m of meterList.data) {
    if (/sms|text_/i.test(m.event_name) || /sms|text/i.test(m.display_name)) {
      meters.push({ id: m.id, event_name: m.event_name, display_name: m.display_name });
    }
  }

  return { products, prices, meters };
}

async function listEmailCatalog(stripe: Stripe) {
  const emailPriceEnvs = [
    "STRIPE_PRICE_STARTER_MONTHLY",
    "STRIPE_PRICE_STARTER_ANNUAL",
    "STRIPE_PRICE_GROWTH_MONTHLY",
    "STRIPE_PRICE_GROWTH_ANNUAL",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PRO_ANNUAL",
    "STRIPE_PRICE_PRO_PLUS_MONTHLY",
    "STRIPE_PRICE_PRO_PLUS_ANNUAL",
  ];
  const rows: { env: string; id: string | null; amount: number | null; product: string | null }[] = [];
  for (const env of emailPriceEnvs) {
    const id = process.env[env]?.trim() || null;
    if (!id) {
      rows.push({ env, id: null, amount: null, product: null });
      continue;
    }
    const price = await stripe.prices.retrieve(id);
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    rows.push({
      env,
      id,
      amount: price.unit_amount,
      product: productId,
    });
  }
  return rows;
}

async function preflightLive() {
  const key = requireLiveKey(process.env.STRIPE_SECRET_KEY);
  console.log("key_prefix=sk_live_ CONFIRMED (value redacted)");
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const account = await stripe.accounts.retrieve();
  console.log(`stripe_account=${maskAccountId(account.id)} livemode=${account.id ? "live" : "?"}`);

  console.log("\n=== Existing email price env mappings (read-only) ===");
  const emailRows = await listEmailCatalog(stripe);
  for (const r of emailRows) {
    console.log(
      `  ${r.env}=${r.id ? r.id.slice(0, 8) + "…" : "MISSING"} amount=${r.amount ?? "—"} product=${r.product ? r.product.slice(0, 8) + "…" : "—"}`
    );
  }

  console.log("\n=== SMS-related objects already in Stripe ===");
  const related = await findSmsRelated(stripe);
  console.log(`  products: ${related.products.length}`);
  for (const p of related.products) console.log(`    ${p.id} active=${p.active} name=${JSON.stringify(p.name)}`);
  console.log(`  prices (lookup key search): ${related.prices.length}`);
  for (const p of related.prices) console.log(`    ${p.id} lookup=${p.lookup_key} amount=${p.unit_amount}`);
  console.log(`  meters: ${related.meters.length}`);
  for (const m of related.meters) console.log(`    ${m.id} event=${m.event_name}`);

  const flags = [
    "SENDFABLE_SMS_PUBLIC_ENABLED",
    "SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED",
    "SENDFABLE_SMS_BILLING_ENABLED",
    "SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED",
    "SENDFABLE_SMS_REGISTRATION_ENABLED",
    "SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED",
    "SENDFABLE_SMS_LIVE_SENDING_ENABLED",
    "SENDFABLE_SMS_INBOUND_ENABLED",
    "SENDFABLE_SMS_REPLY_ENABLED",
  ];
  console.log("\n=== SMS feature flags (must stay false) ===");
  for (const f of flags) {
    const v = (process.env[f] || "").trim().toLowerCase();
    const on = v === "true" || v === "1" || v === "yes";
    console.log(`  ${f}=${on ? "TRUE" : "false"}`);
    if (on) {
      console.error(`REFUSED: ${f} must be false for SF-016 catalog-only work.`);
      process.exit(1);
    }
  }

  console.log("\n=== Script safety ===");
  console.log("  creates_checkout=false");
  console.log("  creates_subscriptions=false");
  console.log("  creates_invoices=false");
  console.log("  creates_charges=false");
  console.log("  submits_meter_events=false");
  console.log("  products_will_be_active=false");
  console.log("  idempotent_via_lookup_keys=true");
  console.log("\nPREFLIGHT_OK — safe to run --confirm-live-sms-catalog");
}

async function ensureProduct(
  stripe: Stripe,
  name: string,
  metadata: Record<string, string>,
  existing?: Stripe.Product
): Promise<Stripe.Product> {
  const found = existing;
  if (found) {
    if (found.active) {
      await stripe.products.update(found.id, { active: false, metadata: { ...found.metadata, ...metadata } });
    } else {
      await stripe.products.update(found.id, { metadata: { ...found.metadata, ...metadata } });
    }
    return stripe.products.retrieve(found.id);
  }
  return stripe.products.create({
    name,
    active: false,
    metadata,
  });
}

async function runCatalogSetup(mode: "test" | "live-catalog" | "live-legacy") {
  const rawKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!rawKey) {
    console.error("REFUSED: STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }
  if (mode === "test" && !rawKey.startsWith("sk_test_")) {
    console.error("REFUSED: test setup requires sk_test_.");
    process.exit(1);
  }
  if (mode === "live-legacy") {
    if (process.env.SENDFABLE_SMS_BILLING_ENABLED?.trim().toLowerCase() !== "true") {
      console.error("REFUSED: legacy live setup requires SENDFABLE_SMS_BILLING_ENABLED=true.");
      process.exit(1);
    }
    requireLiveKey(rawKey);
  }
  if (mode === "live-catalog") {
    requireLiveKey(rawKey);
    // Explicitly refuse if any customer-facing SMS flag is on
    for (const f of [
      "SENDFABLE_SMS_PUBLIC_ENABLED",
      "SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED",
      "SENDFABLE_SMS_BILLING_ENABLED",
      "SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED",
    ]) {
      const v = (process.env[f] || "").trim().toLowerCase();
      if (v === "true" || v === "1" || v === "yes") {
        console.error(`REFUSED: ${f} must remain false during catalog-only creation.`);
        process.exit(1);
      }
    }
  }

  const stripe = new Stripe(rawKey, { apiVersion: "2024-06-20" });
  const account = await stripe.accounts.retrieve();
  console.log(`mode=${mode} account=${maskAccountId(account.id)}`);

  const { meters, prices } = planCatalog();
  const envLines: string[] = [];
  let createdPrices = 0;
  let reusedPrices = 0;
  let createdMeters = 0;
  let reusedMeters = 0;
  let createdProducts = 0;

  const meterEnvByEvent: Record<string, string> = {
    [SMS_METER_EVENTS.TEXT_ENTRY_OUTBOUND]: "STRIPE_METER_SMS_TEXT_ENTRY_OUTBOUND",
    [SMS_METER_EVENTS.TEXT_ESSENTIALS_OUTBOUND]: "STRIPE_METER_SMS_TEXT_ESSENTIALS_OUTBOUND",
    [SMS_METER_EVENTS.TEXT_ADVANTAGE_OUTBOUND]: "STRIPE_METER_SMS_TEXT_ADVANTAGE_OUTBOUND",
    [SMS_METER_EVENTS.INBOUND_OVERAGE]: "STRIPE_METER_SMS_INBOUND_OVERAGE",
  };

  const productEnvByName: Record<string, string> = {
    "SendFable Text Entry": "STRIPE_PRODUCT_SMS_TEXT_ENTRY",
    "SendFable Text Essentials": "STRIPE_PRODUCT_SMS_TEXT_ESSENTIALS",
    "SendFable Text Advantage": "STRIPE_PRODUCT_SMS_TEXT_ADVANTAGE",
    "SendFable Incoming SMS Overage": "STRIPE_PRODUCT_SMS_INBOUND_OVERAGE",
    "SendFable Text Messaging Activation": "STRIPE_PRODUCT_SMS_ACTIVATION",
  };

  const existingMeters = await stripe.billing.meters.list({ limit: 100 });
  const meterIds = new Map<string, string>();
  for (const m of meters) {
    const found = existingMeters.data.find((x) => x.event_name === m.eventName);
    if (found) {
      console.log(`meter_reuse event=${m.eventName} id=${found.id}`);
      meterIds.set(m.eventName, found.id);
      envLines.push(`${meterEnvByEvent[m.eventName]}=${found.id}`);
      reusedMeters++;
      continue;
    }
    console.log(
      `meter_create_review event=${m.eventName} display=${JSON.stringify(m.displayName)} agg=sum customer_mapping=by_id:stripe_customer_id value_field=value`
    );
    const created = await stripe.billing.meters.create({
      display_name: m.displayName,
      event_name: m.eventName,
      default_aggregation: { formula: "sum" },
      customer_mapping: { event_payload_key: "stripe_customer_id", type: "by_id" },
      value_settings: { event_payload_key: "value" },
    });
    console.log(`meter_created event=${m.eventName} id=${created.id}`);
    meterIds.set(m.eventName, created.id);
    envLines.push(`${meterEnvByEvent[m.eventName]}=${created.id}`);
    createdMeters++;
  }

  // Cache SMS products once (avoid per-price full product list)
  const productList = await stripe.products.list({ limit: 100 });
  const smsProductsByName = new Map<string, Stripe.Product>();
  for (const prod of productList.data) {
    if (prod.metadata?.channel === "sms" || prod.metadata?.catalog_version === CATALOG_VERSION) {
      smsProductsByName.set(prod.name, prod);
    }
  }

  const productCache = new Map<string, string>();

  for (const p of prices) {
    const existing = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
    if (existing.data.length) {
      const price = existing.data[0];
      console.log(`price_reuse lookup=${p.lookupKey} id=${price.id} env=${p.envVar}`);
      envLines.push(`${p.envVar}=${price.id}`);
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      const productEnv = productEnvByName[p.productName];
      if (productEnv && !envLines.some((l) => l.startsWith(`${productEnv}=`))) {
        envLines.push(`${productEnv}=${productId}`);
      }
      reusedPrices++;
      continue;
    }

    let productId = productCache.get(p.productName);
    if (!productId) {
      const had = smsProductsByName.has(p.productName);
      const product = await ensureProduct(
        stripe,
        p.productName,
        commonMetadata({
          plan_key: p.planKey || "",
          billing_type: "product",
        }),
        smsProductsByName.get(p.productName)
      );
      if (!had) createdProducts++;
      productId = product.id;
      productCache.set(p.productName, productId);
      smsProductsByName.set(p.productName, product);
      const productEnv = productEnvByName[p.productName];
      if (productEnv) envLines.push(`${productEnv}=${productId}`);
      console.log(
        `product_ready name=${JSON.stringify(p.productName)} id=${productId} active=${product.active}`
      );
      if (product.active) {
        console.error("REFUSED: SMS product unexpectedly active; deactivating.");
        await stripe.products.update(productId, { active: false });
      }
    }

    const meta = commonMetadata({
      plan_key: p.planKey || "",
      billing_type: p.billingType,
      lookup_key: p.lookupKey,
    });

    const base: Stripe.PriceCreateParams = {
      product: productId,
      currency: "usd",
      lookup_key: p.lookupKey,
      transfer_lookup_key: true,
      metadata: meta,
      nickname: p.lookupKey,
    };

    let created: Stripe.Price;
    if (p.kind === "recurring-fixed") {
      created = await stripe.prices.create({
        ...base,
        unit_amount: p.unitAmountCents,
        recurring: { interval: "month" },
      });
    } else if (p.kind === "recurring-metered") {
      const meterId = meterIds.get(p.meterEventName!);
      if (!meterId) throw new Error(`Missing meter for ${p.meterEventName}`);
      created = await stripe.prices.create({
        ...base,
        unit_amount_decimal: p.unitAmountDecimalCents,
        recurring: {
          interval: "month",
          usage_type: "metered",
          meter: meterId,
        },
      });
    } else {
      created = await stripe.prices.create({ ...base, unit_amount: p.unitAmountCents });
    }
    console.log(`price_created lookup=${p.lookupKey} id=${created.id} env=${p.envVar}`);
    envLines.push(`${p.envVar}=${created.id}`);
    createdPrices++;
  }

  console.log("\n=== ENV MAPPING (store on VPS .env — do not commit) ===");
  for (const line of envLines) console.log(line);

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        mode,
        account: maskAccountId(account.id),
        meters_created: createdMeters,
        meters_reused: reusedMeters,
        products_created_or_updated: createdProducts,
        prices_created: createdPrices,
        prices_reused: reusedPrices,
        customers_created: 0,
        subscriptions_created: 0,
        checkout_sessions_created: 0,
        invoices_created: 0,
        charges_created: 0,
        meter_events_submitted: 0,
      },
      null,
      2
    )
  );
}

async function main() {
  const args = process.argv.slice(2);
  const confirmLive = args.includes(CONFIRM_LIVE_ARG);
  const confirmLiveCatalog = args.includes(CONFIRM_LIVE_CATALOG_ARG);
  const confirmTest = args.includes(CONFIRM_TEST_ARG);
  const preflight = args.includes(PREFLIGHT_LIVE_ARG);
  const validate = args.includes(VALIDATE_LIVE_ARG);

  const confirms = [confirmLive, confirmLiveCatalog, confirmTest].filter(Boolean).length;
  if (confirms > 1) {
    console.error("REFUSED: pass only one confirm flag.");
    process.exit(1);
  }

  if (preflight) {
    await preflightLive();
    return;
  }
  if (validate) {
    await validateLiveCatalog();
    return;
  }
  if (!confirmLive && !confirmLiveCatalog && !confirmTest) {
    printPlan();
    return;
  }
  if (confirmTest) await runCatalogSetup("test");
  else if (confirmLiveCatalog) await runCatalogSetup("live-catalog");
  else await runCatalogSetup("live-legacy");
}

async function validateLiveCatalog() {
  const key = requireLiveKey(process.env.STRIPE_SECRET_KEY);
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const { prices } = planCatalog();
  let ok = 0;
  let fail = 0;
  console.log("=== Validate live SMS catalog (read-only) ===");
  for (const p of prices) {
    const listed = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
    const price = listed.data[0];
    if (!price) {
      console.error(`MISSING lookup=${p.lookupKey}`);
      fail++;
      continue;
    }
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);
    const amountOk =
      p.kind === "recurring-metered"
        ? Number(price.unit_amount_decimal) === Number(p.unitAmountDecimalCents)
        : price.unit_amount === p.unitAmountCents;
    const intervalOk =
      p.kind === "one-time" ? !price.recurring : price.recurring?.interval === "month";
    const currencyOk = price.currency === "usd";
    const productInactive = !product.active;
    const metaOk = product.metadata?.public_enabled === "false" && product.metadata?.channel === "sms";
    const meteredOk =
      p.kind !== "recurring-metered" ||
      (price.recurring?.usage_type === "metered" && Boolean(price.recurring?.meter));
    const line = [
      amountOk ? "amount_ok" : `AMOUNT_BAD got=${price.unit_amount ?? price.unit_amount_decimal}`,
      intervalOk ? "interval_ok" : "INTERVAL_BAD",
      currencyOk ? "currency_ok" : "CURRENCY_BAD",
      productInactive ? "product_inactive" : "PRODUCT_ACTIVE",
      metaOk ? "meta_ok" : "META_BAD",
      meteredOk ? "meter_ok" : "METER_BAD",
    ].join(" ");
    console.log(`${p.lookupKey} ${price.id} ${line}`);
    if (amountOk && intervalOk && currencyOk && productInactive && metaOk && meteredOk) ok++;
    else fail++;
  }
  // Email regression: ensure configured email prices still retrieve
  const emailEnvs = [
    "STRIPE_PRICE_STARTER_MONTHLY",
    "STRIPE_PRICE_GROWTH_MONTHLY",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PRO_PLUS_MONTHLY",
  ];
  for (const env of emailEnvs) {
    const id = process.env[env]?.trim();
    if (!id) {
      console.error(`EMAIL_MISSING ${env}`);
      fail++;
      continue;
    }
    const pr = await stripe.prices.retrieve(id);
    console.log(`email_ok ${env} ${id.slice(0, 12)}… amount=${pr.unit_amount} active=${pr.active}`);
    ok++;
  }
  console.log(JSON.stringify({ ok, fail }, null, 2));
  if (fail > 0) process.exit(1);
  console.log("VALIDATE_OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
