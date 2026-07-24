/**
 * Idempotent Sendfable Stripe live/test setup:
 * products, prices (lookup keys), webhook endpoint, Customer Portal.
 *
 * Usage (on VPS with /opt/sendfable/.env loaded):
 *   npm run stripe:setup
 *
 * Never prints full secret keys. Price IDs are printed in full so they can be stored in env.
 */
import "dotenv/config";
import Stripe from "stripe";
import fs from "node:fs";
import path from "node:path";

const EXPECTED_LIVE_ACCOUNT = "acct_1Two8SGnw9fPSfu4";
const WEBHOOK_URL = "https://sendfable.com/api/webhooks/stripe";
const PORTAL_RETURN = "https://sendfable.com/billing";

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.finalization_failed",
  "payment_method.attached",
];

const PLANS = [
  {
    key: "STARTER" as const,
    name: "Sendfable Starter",
    monthly: 900,
    annual: 9000,
    monthlyLookup: "sendfable_starter_monthly",
    annualLookup: "sendfable_starter_annual",
  },
  {
    key: "GROWTH" as const,
    name: "Sendfable Growth",
    monthly: 1900,
    annual: 19000,
    monthlyLookup: "sendfable_growth_monthly",
    annualLookup: "sendfable_growth_annual",
  },
  {
    key: "PRO" as const,
    name: "Sendfable Pro",
    monthly: 4900,
    annual: 49000,
    monthlyLookup: "sendfable_pro_monthly",
    annualLookup: "sendfable_pro_annual",
  },
];

function redact(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error("Set STRIPE_SECRET_KEY first");
    process.exit(1);
  }
  if (key.startsWith("sk_test_")) {
    console.warn("WARNING: using test-mode secret key");
  }
  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    console.error("STRIPE_SECRET_KEY must start with sk_live_ or sk_test_");
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const account = await stripe.accounts.retrieve();
  const accountId = account.id;
  const displayName =
    account.business_profile?.name ||
    account.settings?.dashboard?.display_name ||
    "(unnamed)";

  console.log("Account:", displayName, accountId);
  console.log("livemode key:", key.startsWith("sk_live_"));
  console.log("charges_enabled:", account.charges_enabled);
  console.log("payouts_enabled:", account.payouts_enabled);

  if (key.startsWith("sk_live_")) {
    if (accountId === "acct_1TejpaK42cqzoGRe" || /rental\s*noodle/i.test(displayName)) {
      console.error("STOP: Rental Noodle account detected");
      process.exit(1);
    }
    if (accountId !== EXPECTED_LIVE_ACCOUNT) {
      console.error("STOP: unexpected live account", accountId);
      process.exit(1);
    }
    if (!/sendfable/i.test(displayName)) {
      console.error("STOP: account name does not look like Sendfable:", displayName);
      process.exit(1);
    }
  }

  const priceEnv: Record<string, string> = {};

  for (const plan of PLANS) {
    const product = await findOrCreateProduct(stripe, plan.name, plan.key);
    const monthly = await findOrCreatePrice(stripe, {
      productId: product.id,
      amount: plan.monthly,
      interval: "month",
      lookupKey: plan.monthlyLookup,
      plan: plan.key,
      intervalMeta: "monthly",
    });
    const annual = await findOrCreatePrice(stripe, {
      productId: product.id,
      amount: plan.annual,
      interval: "year",
      lookupKey: plan.annualLookup,
      plan: plan.key,
      intervalMeta: "annual",
    });

    priceEnv[`STRIPE_PRICE_${plan.key}_MONTHLY`] = monthly.id;
    priceEnv[`STRIPE_PRICE_${plan.key}_ANNUAL`] = annual.id;
    priceEnv[`STRIPE_PRICE_${plan.key}_YEARLY`] = annual.id; // alias for older code paths

    console.log(
      `✓ ${plan.name}: monthly=${redact(monthly.id)} annual=${redact(annual.id)} (${monthly.reused ? "reused" : "created"}/${annual.reused ? "reused" : "created"})`
    );
  }

  const webhook = await findOrCreateWebhook(stripe);
  console.log(
    `✓ Webhook ${redact(webhook.id)} status=${webhook.status} url=${WEBHOOK_URL} (${webhook.reused ? "reused" : "created"})`
  );

  const portal = await findOrCreatePortal(stripe, [
    {
      productId: (await stripe.prices.retrieve(priceEnv.STRIPE_PRICE_STARTER_MONTHLY)).product as string,
      prices: [priceEnv.STRIPE_PRICE_STARTER_MONTHLY, priceEnv.STRIPE_PRICE_STARTER_ANNUAL],
    },
    {
      productId: (await stripe.prices.retrieve(priceEnv.STRIPE_PRICE_GROWTH_MONTHLY)).product as string,
      prices: [priceEnv.STRIPE_PRICE_GROWTH_MONTHLY, priceEnv.STRIPE_PRICE_GROWTH_ANNUAL],
    },
    {
      productId: (await stripe.prices.retrieve(priceEnv.STRIPE_PRICE_PRO_MONTHLY)).product as string,
      prices: [priceEnv.STRIPE_PRICE_PRO_MONTHLY, priceEnv.STRIPE_PRICE_PRO_ANNUAL],
    },
  ]);
  console.log(`✓ Portal config ${redact(portal.id)} (${portal.reused ? "reused" : "created"})`);

  // Write machine-readable result for env merge (no secret key).
  const outPath = path.resolve(process.cwd(), "stripe-live-setup-result.json");
  const result = {
    accountId,
    displayName,
    livemode: key.startsWith("sk_live_"),
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    currentlyDue: account.requirements?.currently_due ?? [],
    prices: priceEnv,
    webhookEndpointId: webhook.id,
    webhookSecret: webhook.secret || null,
    portalConfigurationId: portal.id,
    events: WEBHOOK_EVENTS,
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log("Wrote", outPath, "(mode 600; contains webhook secret — do not commit)");
}

async function findOrCreateProduct(stripe: Stripe, name: string, plan: string) {
  const listed = await stripe.products.list({ active: true, limit: 100 });
  const match = listed.data.find(
    (p) => p.name === name && p.metadata?.application === "sendfable"
  );
  if (match) return match;

  const byName = listed.data.find((p) => p.name === name);
  if (byName) {
    await stripe.products.update(byName.id, {
      metadata: {
        ...byName.metadata,
        application: "sendfable",
        environment: "production",
        plan,
      },
    });
    return byName;
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

async function findOrCreatePrice(
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
  try {
    const byLookup = await stripe.prices.list({ lookup_keys: [opts.lookupKey], limit: 1, active: true });
    const hit = byLookup.data[0];
    if (
      hit &&
      hit.unit_amount === opts.amount &&
      hit.currency === "usd" &&
      hit.recurring?.interval === opts.interval &&
      hit.type === "recurring" &&
      hit.product === opts.productId
    ) {
      return { id: hit.id, reused: true };
    }
    if (hit) {
      console.warn(
        `Lookup key ${opts.lookupKey} exists but does not match expected amount/interval/product — creating new price without reclaiming key`
      );
    }
  } catch {
    // continue to create
  }

  // Also reuse by product+amount+interval if an active matching price exists (no lookup yet).
  const listed = await stripe.prices.list({ product: opts.productId, active: true, limit: 100 });
  const match = listed.data.find(
    (p) =>
      p.unit_amount === opts.amount &&
      p.currency === "usd" &&
      p.recurring?.interval === opts.interval &&
      p.type === "recurring"
  );
  if (match) {
    if (!match.lookup_key) {
      try {
        await stripe.prices.update(match.id, {
          lookup_key: opts.lookupKey,
          metadata: {
            application: "sendfable",
            environment: "production",
            plan: opts.plan,
            interval: opts.intervalMeta,
          },
        });
      } catch {
        // lookup_key may already be taken elsewhere
      }
    }
    return { id: match.id, reused: true };
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
    },
  });
  return { id: created.id, reused: false };
}

async function findOrCreateWebhook(stripe: Stripe): Promise<{
  id: string;
  status: string;
  secret: string | null;
  reused: boolean;
}> {
  const listed = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = listed.data.find((w) => w.url === WEBHOOK_URL);

  if (existing && process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: WEBHOOK_EVENTS,
      disabled: false,
    });
    return {
      id: existing.id,
      status: existing.status,
      secret: process.env.STRIPE_WEBHOOK_SECRET.trim(),
      reused: true,
    };
  }

  // Recreate when we need a signing secret (Stripe only returns secret on create).
  if (existing) {
    await stripe.webhookEndpoints.del(existing.id);
  }

  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: "Sendfable production billing",
    metadata: {
      application: "sendfable",
      environment: "production",
    },
  });
  return {
    id: created.id,
    status: created.status,
    secret: created.secret || null,
    reused: false,
  };
}

async function findOrCreatePortal(
  stripe: Stripe,
  products: Array<{ productId: string; prices: string[] }>
): Promise<{ id: string; reused: boolean }> {
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
  };

  if (existing) {
    await stripe.billingPortal.configurations.update(existing.id, {
      business_profile,
      features,
      default_return_url: PORTAL_RETURN,
      metadata,
      active: true,
    });
    return { id: existing.id, reused: true };
  }

  const created = await stripe.billingPortal.configurations.create({
    business_profile,
    features,
    default_return_url: PORTAL_RETURN,
    metadata,
  });
  return { id: created.id, reused: false };
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
