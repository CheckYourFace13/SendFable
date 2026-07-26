import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  assertStripeAccountAllowed,
  assertStripeLiveMode,
  getStripe,
  planFromPriceId,
} from "@/lib/stripe";
import {
  handleSmsActivationPayment,
  handleSmsSubscriptionEvent,
  recalcSmsBundleForCustomer,
} from "@/lib/sms/stripe";

export const dynamic = "force-dynamic";

async function alreadyProcessed(externalId: string, type: string): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: { source: "stripe", externalId, type },
    });
    return false;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    assertStripeLiveMode(event.livemode);
    assertStripeAccountAllowed(event.account);
  } catch {
    console.warn("[stripe-webhook] ignored wrong-mode or wrong-account event", event.type);
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (await alreadyProcessed(event.id, event.type)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // SMS activation fee (one-time payment) — flag-gated product; inert
        // unless an SmsActivation row is awaiting payment.
        if (session.mode === "payment" && session.metadata?.smsActivationWorkspaceId) {
          await handleSmsActivationPayment(
            session.metadata.smsActivationWorkspaceId,
            String(session.payment_intent || session.id)
          );
          break;
        }
        if (session.mode !== "subscription" || !session.subscription) break;
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        // SMS subscriptions are handled separately from the email Plan.
        const sms = await handleSmsSubscriptionEvent(sub, event.type);
        if (!sms.handled) await applySubscription(sub, session.metadata?.userId);
        break;
      }
      case "checkout.session.async_payment_failed": {
        // No plan grant — success URL alone never upgrades.
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const sms = await handleSmsSubscriptionEvent(sub, event.type);
        if (!sms.handled) {
          await applySubscription(sub);
          // Email plan may have changed — SMS bundle discount follows it.
          await recalcSmsBundleForCustomer(String(sub.customer));
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const sms = await handleSmsSubscriptionEvent(sub, event.type);
        if (sms.handled) break;
        const user = await findUserForSub(sub);
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: "FREE",
              stripeSubscriptionId: null,
              billingInterval: null,
              paymentFailedAt: null,
            },
          });
          // Losing the email plan removes bundle eligibility (never SMS service).
          await recalcSmsBundleForCustomer(String(sub.customer));
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer || "");
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { paymentFailedAt: null },
          });
        }
        break;
      }
      case "invoice.payment_failed":
      case "invoice.finalization_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer || "");
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { paymentFailedAt: new Date() },
          });
        }
        break;
      }
      case "payment_method.attached": {
        // Acknowledged for portal/payment-method updates; no plan change.
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler failed", event.type);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function findUserForSub(sub: Stripe.Subscription) {
  const customerId = String(sub.customer);
  return prisma.user.findFirst({
    where: {
      OR: [
        { stripeCustomerId: customerId },
        { stripeSubscriptionId: sub.id },
        ...(sub.metadata?.userId ? [{ id: sub.metadata.userId }] : []),
      ],
    },
  });
}

async function applySubscription(sub: Stripe.Subscription, userIdHint?: string | null) {
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return;
  const mapped = planFromPriceId(priceId);
  if (!mapped) {
    console.warn("[stripe-webhook] unknown price");
    return;
  }

  const customerId = String(sub.customer);
  let user = userIdHint
    ? await prisma.user.findUnique({ where: { id: userIdHint } })
    : null;
  if (!user) {
    user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  }
  if (!user) return;

  const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);

  // Keep paid plan until period end when cancel_at_period_end is set.
  const keepPaid =
    mapped &&
    (sub.status === "active" ||
      sub.status === "trialing" ||
      (cancelAtPeriodEnd && sub.status !== "canceled" && sub.status !== "incomplete_expired"));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: keepPaid ? mapped.plan : "FREE",
      stripeCustomerId: customerId,
      stripeSubscriptionId: keepPaid ? sub.id : null,
      billingInterval: keepPaid ? mapped.interval : null,
      paymentFailedAt: null,
    },
  });
}
