import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { getStripe, isStripeEnabled, priceIdFor, type PaidPlan } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";
import {
  STRIPE_BILLING_DISABLED_MESSAGE,
  canCreateCheckoutSession,
} from "@/lib/stripe-billing-gate";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

const schema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "PRO", "PRO_PLUS"]),
  interval: z.enum(["month", "year"]),
});

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners/admins can change billing" }, { status: 403 });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: "Billing is not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 }
    );
  }

  if (!canCreateCheckoutSession(ctx.user.email)) {
    return NextResponse.json({ error: STRIPE_BILLING_DISABLED_MESSAGE }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const stripe = getStripe()!;
  const priceId = priceIdFor(parsed.data.plan as PaidPlan, parsed.data.interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Price not configured. Run npm run stripe:setup." },
      { status: 503 }
    );
  }

  // Existing subscribers manage changes in the Customer Portal (no duplicate Checkout subs).
  if (ctx.user.stripeSubscriptionId && ctx.user.plan !== "FREE") {
    if (!ctx.user.stripeCustomerId) {
      return NextResponse.json({ error: "Billing account incomplete" }, { status: 400 });
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: ctx.user.stripeCustomerId,
      return_url: appUrl("/billing"),
    });
    return NextResponse.json({ url: portal.url, portal: true });
  }

  let customerId = ctx.user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.user.email,
      name: ctx.user.name ?? undefined,
      metadata: {
        application: "sendfable",
        environment: "production",
        userId: ctx.user.id,
        workspaceId: ctx.workspace.id,
      },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { stripeCustomerId: customerId },
    });
  } else {
    // Block a second active subscription on the same customer.
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (existing.data.length > 0) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: appUrl("/billing"),
      });
      return NextResponse.json({ url: portal.url, portal: true });
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: appUrl("/billing?success=1"),
    cancel_url: appUrl("/billing?canceled=1"),
    allow_promotion_codes: false,
    client_reference_id: ctx.user.id,
    consent_collection: {
      terms_of_service: "required",
    },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "I agree to the SendFable Terms of Service, Privacy Policy, and Billing, Renewal, Cancellation & Refund Policy at sendfable.com. Paid subscriptions renew automatically until canceled in the Customer Portal (cancellation stops the next renewal at period end and is not itself a refund). Refunds are not automatic or guaranteed except for duplicate or erroneous charges or where legally required — see the Refund Policy.",
      },
    },
    subscription_data: {
      metadata: {
        application: "sendfable",
        environment: "production",
        userId: ctx.user.id,
        workspaceId: ctx.workspace.id,
        plan: parsed.data.plan,
      },
    },
    metadata: {
      application: "sendfable",
      environment: "production",
      userId: ctx.user.id,
      workspaceId: ctx.workspace.id,
      plan: parsed.data.plan,
    },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("checkout_started", { plan: parsed.data.plan });
  } catch {
    /* fail open */
  }

  return NextResponse.json({ url: session.url });
}
