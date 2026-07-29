import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import {
  isSmsAccountSignupEnabled,
  isSmsActivationPurchaseEnabled,
  isSmsBillingEnabled,
  isSmsCodeEnabled,
} from "@/lib/sms/flags";
import { isBundleEligible, resolveSmsPricing, type SmsPlanKey } from "@/lib/sms/pricing";
import {
  SMS_ACTIVATION_PRICE_ENV,
  SMS_METERED_PRICE_ENV_KEYS,
  SMS_INBOUND_OVERAGE_PRICE_ENV,
  smsFixedPriceId,
} from "@/lib/sms/stripe";
import { appUrl } from "@/lib/utils";
import type { Plan } from "@prisma/client";

const schema = z.object({
  plan: z.enum(["TEXT_ENTRY", "TEXT_ESSENTIALS", "TEXT_ADVANTAGE"]),
});

/**
 * Start an SMS subscription Checkout. HARD-GATED:
 *  - SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED must be true (product visible)
 *  - SENDFABLE_SMS_BILLING_ENABLED must be true (Stripe writes allowed)
 *  - SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED must be true (activation fee)
 * With defaults, this endpoint can never create a Stripe object.
 */
export async function POST(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isSmsBillingEnabled() || !isSmsActivationPurchaseEnabled()) {
    return NextResponse.json(
      { error: "Text messaging billing is not activated yet" },
      { status: 403 }
    );
  }

  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can manage billing" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  const plan = parsed.data.plan as SmsPlanKey;

  const existing = await prisma.smsSubscription.findUnique({
    where: { workspaceId: ctx.workspace.id },
  });
  if (existing && existing.status !== "CANCELLED") {
    return NextResponse.json({ error: "An SMS subscription already exists" }, { status: 409 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Billing unavailable" }, { status: 503 });

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const emailState = {
    plan: owner.plan as Plan,
    active: !owner.paymentFailedAt && owner.plan !== "FREE",
  };
  const eligible = isBundleEligible(plan, emailState);
  const pricing = resolveSmsPricing(plan, emailState);

  const fixedPrice = smsFixedPriceId(plan, eligible);
  const meteredPrice = process.env[SMS_METERED_PRICE_ENV_KEYS[plan]]?.trim();
  const overagePrice = process.env[SMS_INBOUND_OVERAGE_PRICE_ENV]?.trim();
  const activationPrice = process.env[SMS_ACTIVATION_PRICE_ENV]?.trim();
  if (!fixedPrice || !meteredPrice || !overagePrice || !activationPrice) {
    return NextResponse.json(
      { error: "SMS prices are not configured (run scripts/stripe-sms-setup.ts)" },
      { status: 503 }
    );
  }

  // Create the pending local records first (entitlement is only granted by
  // verified webhooks, never by the success redirect).
  await prisma.smsSubscription.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: {
      workspaceId: ctx.workspace.id,
      plan,
      status: "INCOMPLETE",
      baseMonthlyPriceCents: pricing.baseMonthlyPriceCents,
      appliedMonthlyPriceCents: pricing.appliedMonthlyPriceCents,
      bundleDiscountPercent: pricing.bundleDiscountPercent,
      bundleEligibilitySource: pricing.bundleEligibilitySource,
    },
    update: {
      plan,
      status: "INCOMPLETE",
      baseMonthlyPriceCents: pricing.baseMonthlyPriceCents,
      appliedMonthlyPriceCents: pricing.appliedMonthlyPriceCents,
      bundleDiscountPercent: pricing.bundleDiscountPercent,
      bundleEligibilitySource: pricing.bundleEligibilitySource,
      cancelledAt: null,
    },
  });
  await prisma.smsActivation.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: { workspaceId: ctx.workspace.id },
    update: {},
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: owner.stripeCustomerId ?? undefined,
    customer_email: owner.stripeCustomerId ? undefined : owner.email,
    line_items: [
      { price: fixedPrice, quantity: 1 },
      { price: meteredPrice },
      { price: overagePrice },
    ],
    subscription_data: {
      metadata: { workspaceId: ctx.workspace.id, product: "sms" },
    },
    metadata: { workspaceId: ctx.workspace.id, userId: owner.id, product: "sms" },
    success_url: appUrl("/billing/sms?checkout=success"),
    cancel_url: appUrl("/billing/sms?checkout=cancelled"),
  });

  return NextResponse.json({ url: session.url });
}
