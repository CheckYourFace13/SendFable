/**
 * One-shot live reprice for SendFable (acct_1Two8SGnw9fPSfu4).
 *
 * - Creates/updates products (Starter, Growth, Pro, Pro Plus)
 * - Creates eight NEW recurring prices at the approved 2026-07 amounts
 * - Archives old recurring prices matching previous catalog amounts
 * - Updates Customer Portal to the new prices
 * - Does NOT create customers, Checkout Sessions, subscriptions, invoices,
 *   PaymentIntents, charges, refunds, or payments
 *
 * Usage on VPS:
 *   set -a; . /opt/sendfable/.env; set +a
 *   npx tsx scripts/stripe-reprice-2026-07.ts
 */
import "dotenv/config";
import Stripe from "stripe";
import fs from "node:fs";
import path from "node:path";
import { PLAN_STRIPE_CENTS, PAID_PLAN_ORDER } from "../src/lib/plans";

const EXPECTED_LIVE_ACCOUNT = "acct_1Two8SGnw9fPSfu4";
const PORTAL_RETURN = "https://sendfable.com/billing";

/** Previous catalog amounts (cents) — archive these from new purchases. */
const LEGACY_AMOUNTS = new Set([900, 9000, 1900, 19000, 4900, 49000]);

const CATALOG = PAID_PLAN_ORDER.map((key) => {
  const name =
    key === "PRO_PLUS"
      ? "Sendfable Pro Plus"
      : key === "PRO"
        ? "Sendfable Pro"
        : key === "GROWTH"
          ? "Sendfable Growth"
          : "Sendfable Starter";
  const cents = PLAN_STRIPE_CENTS[key];
  return {
    key,
    name,
    monthly: cents.monthly,
    annual: cents.annual,
    monthlyLookup: `sendfable_${key.toLowerCase()}_monthly_20260725`,
    annualLookup: `sendfable_${key.toLowerCase()}_annual_20260725`,
  };
});

function redact(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key?.startsWith("sk_live_")) {
    console.error("Require live STRIPE_SECRET_KEY (sk_live_…)");
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const account = await stripe.accounts.retrieve();
  if (account.id !== EXPECTED_LIVE_ACCOUNT) {
    console.error("STOP: unexpected account", account.id);
    process.exit(1);
  }
  const displayName =
    account.business_profile?.name ||
    account.settings?.dashboard?.display_name ||
    "";
  if (/rental\s*noodle/i.test(displayName)) {
    console.error("STOP: Rental Noodle account");
    process.exit(1);
  }
  if (!/sendfable/i.test(displayName)) {
    console.error("STOP: account name does not look like SendFable:", displayName);
    process.exit(1);
  }

  console.log("Account:", displayName, account.id);

  // Safety: no active subscriptions may be on old prices.
  const activeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
  const trialing = await stripe.subscriptions.list({ status: "trialing", limit: 100 });
  const pastDue = await stripe.subscriptions.list({ status: "past_due", limit: 100 });
  const liveCount = activeSubs.data.length + trialing.data.length + pastDue.data.length;
  console.log(
    `Subscriptions active=${activeSubs.data.length} trialing=${trialing.data.length} past_due=${pastDue.data.length}`
  );
  if (liveCount > 0) {
    console.error("STOP: live subscriptions present — abort reprice");
    process.exit(1);
  }

  const priceEnv: Record<string, string> = {};
  const createdPriceIds: string[] = [];
  const archivedPriceIds: string[] = [];

  for (const plan of CATALOG) {
    const product = await findOrCreateProduct(stripe, plan.name, plan.key);
    const monthly = await createPriceIfNeeded(stripe, {
      productId: product.id,
      amount: plan.monthly,
      interval: "month",
      lookupKey: plan.monthlyLookup,
      plan: plan.key,
      intervalMeta: "monthly",
    });
    const annual = await createPriceIfNeeded(stripe, {
      productId: product.id,
      amount: plan.annual,
      interval: "year",
      lookupKey: plan.annualLookup,
      plan: plan.key,
      intervalMeta: "annual",
    });
    priceEnv[`STRIPE_PRICE_${plan.key}_MONTHLY`] = monthly.id;
    priceEnv[`STRIPE_PRICE_${plan.key}_ANNUAL`] = annual.id;
    priceEnv[`STRIPE_PRICE_${plan.key}_YEARLY`] = annual.id;
    createdPriceIds.push(monthly.id, annual.id);
    console.log(
      `✓ ${plan.name}: monthly=${redact(monthly.id)} annual=${redact(annual.id)} (${monthly.reused ? "reused" : "created"}/${annual.reused ? "reused" : "created"})`
    );
  }

  // Archive legacy catalog prices (do not delete).
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.prices.list({
      active: true,
      limit: 100,
      starting_after: startingAfter,
    });
    for (const price of page.data) {
      if (price.type !== "recurring") continue;
      if (!price.unit_amount || !LEGACY_AMOUNTS.has(price.unit_amount)) continue;
      if (createdPriceIds.includes(price.id)) continue;
      // Only archive Sendfable-tagged or unnamed catalog matches on our products
      const metaApp = price.metadata?.application;
      if (metaApp && metaApp !== "sendfable") continue;
      await stripe.prices.update(price.id, {
        active: false,
        metadata: {
          ...price.metadata,
          application: "sendfable",
          archived_reason: "reprice_2026_07_25",
          archived_at: new Date().toISOString(),
        },
      });
      archivedPriceIds.push(price.id);
      console.log(`archived legacy price ${redact(price.id)} amount=${price.unit_amount}`);
    }
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  const portalProducts = CATALOG.map((plan) => ({
    productId: undefined as unknown as string,
    prices: [
      priceEnv[`STRIPE_PRICE_${plan.key}_MONTHLY`],
      priceEnv[`STRIPE_PRICE_${plan.key}_ANNUAL`],
    ],
  }));
  for (let i = 0; i < CATALOG.length; i++) {
    const monthlyId = priceEnv[`STRIPE_PRICE_${CATALOG[i].key}_MONTHLY`];
    const price = await stripe.prices.retrieve(monthlyId);
    portalProducts[i].productId = price.product as string;
  }

  const portal = await upsertPortal(stripe, portalProducts);
  console.log(`✓ Portal config ${redact(portal.id)}`);

  const outPath = path.resolve(process.cwd(), "stripe-reprice-2026-07-result.json");
  const result = {
    accountId: account.id,
    displayName,
    livemode: true,
    activeSubscriptions: 0,
    createdPriceIds: createdPriceIds.map(redact),
    archivedPriceIds: archivedPriceIds.map(redact),
    prices: priceEnv,
    portalConfigurationId: portal.id,
    note: "Full price IDs are in this file (mode 600). Do not commit. No payments created.",
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  // Also write env fragment with full IDs for merge (secrets dir preferred on VPS).
  const envFragment = Object.entries(priceEnv)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const envPath = path.resolve(process.cwd(), "stripe-reprice-2026-07-env.txt");
  fs.writeFileSync(envPath, envFragment + "\n", { mode: 0o600 });
  console.log("Wrote", outPath, "and", envPath);
  console.log("NO_PAYMENT_OBJECTS_CREATED");
}

async function findOrCreateProduct(stripe: Stripe, name: string, plan: string) {
  const listed = await stripe.products.list({ active: true, limit: 100 });
  const match = listed.data.find(
    (p) =>
      (p.name === name || (plan === "PRO_PLUS" && /pro\s*plus/i.test(p.name))) &&
      (p.metadata?.application === "sendfable" || !p.metadata?.application)
  );
  if (match) {
    await stripe.products.update(match.id, {
      name,
      metadata: {
        ...match.metadata,
        application: "sendfable",
        environment: "production",
        plan,
      },
    });
    return match;
  }
  return stripe.products.create({
    name,
    metadata: {
      application: "sendfable",
      environment: "production",
      plan,
    },
  });
}

async function createPriceIfNeeded(
  stripe: Stripe,
  opts: {
    productId: string;
    amount: number;
    interval: "month" | "year";
    lookupKey: string;
    plan: string;
    intervalMeta: "monthly" | "annual";
  }
): Promise<{ id: string; reused: boolean }> {
  const byLookup = await stripe.prices.list({
    lookup_keys: [opts.lookupKey],
    limit: 1,
    active: true,
  });
  const hit = byLookup.data[0];
  if (
    hit &&
    hit.unit_amount === opts.amount &&
    hit.currency === "usd" &&
    hit.recurring?.interval === opts.interval &&
    hit.product === opts.productId
  ) {
    return { id: hit.id, reused: true };
  }

  const created = await stripe.prices.create({
    product: opts.productId,
    unit_amount: opts.amount,
    currency: "usd",
    recurring: { interval: opts.interval, usage_type: "licensed" },
    lookup_key: opts.lookupKey,
    metadata: {
      application: "sendfable",
      environment: "production",
      plan: opts.plan,
      interval: opts.intervalMeta,
      catalog: "2026-07-25",
    },
  });
  return { id: created.id, reused: false };
}

async function upsertPortal(
  stripe: Stripe,
  products: Array<{ productId: string; prices: string[] }>
): Promise<{ id: string }> {
  const listed = await stripe.billingPortal.configurations.list({ limit: 20, active: true });
  const existing = listed.data.find(
    (c) => c.metadata?.application === "sendfable" && c.metadata?.environment === "production"
  );

  const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    customer_update: {
      enabled: true,
      allowed_updates: ["email", "address"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      proration_behavior: "none",
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: products.map((p) => ({
        product: p.productId,
        prices: p.prices,
        adjustable_quantity: { enabled: false },
      })),
    },
  };

  const business_profile = {
    headline: "Sendfable billing",
    privacy_policy_url: "https://sendfable.com/privacy",
    terms_of_service_url: "https://sendfable.com/terms",
  };
  const metadata = {
    application: "sendfable",
    environment: "production",
    catalog: "2026-07-25",
  };

  if (existing) {
    await stripe.billingPortal.configurations.update(existing.id, {
      business_profile,
      features,
      default_return_url: PORTAL_RETURN,
      metadata,
      active: true,
    });
    return { id: existing.id };
  }

  const created = await stripe.billingPortal.configurations.create({
    business_profile,
    features,
    default_return_url: PORTAL_RETURN,
    metadata,
  });
  return { id: created.id };
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
