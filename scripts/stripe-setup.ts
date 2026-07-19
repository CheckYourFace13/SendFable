/**
 * Creates Sendfable Stripe products & prices, then prints env vars to paste into .env
 * Usage: npm run stripe:setup
 */
import "dotenv/config";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY in .env first");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

const PLANS = [
  { key: "STARTER", name: "Sendfable Starter", monthly: 900, yearly: 9000 },
  { key: "GROWTH", name: "Sendfable Growth", monthly: 1900, yearly: 19000 },
  { key: "PRO", name: "Sendfable Pro", monthly: 4900, yearly: 49000 },
] as const;

async function main() {
  const envLines: string[] = [];

  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { sendfable_plan: plan.key },
    });

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { sendfable_plan: plan.key, interval: "month" },
    });

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearly,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { sendfable_plan: plan.key, interval: "year" },
    });

    envLines.push(`STRIPE_PRICE_${plan.key}_MONTHLY="${monthly.id}"`);
    envLines.push(`STRIPE_PRICE_${plan.key}_YEARLY="${yearly.id}"`);
    console.log(`✓ ${plan.name}: monthly=${monthly.id} yearly=${yearly.id}`);
  }

  console.log("\n# Paste into your .env:\n");
  console.log(envLines.join("\n"));
  console.log(
    "\n# Also create a webhook endpoint pointing to:\n#   https://YOUR_DOMAIN/api/webhooks/stripe\n# Events: checkout.session.completed, customer.subscription.updated,\n#         customer.subscription.deleted, invoice.payment_failed, invoice.payment_succeeded\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
