/**
 * Live zero-dollar Starter certification (owner-controlled only).
 *
 * Creates a REAL Checkout Session with a temporary 100% coupon applied
 * server-side (customer never needs a public promo field). Completing the
 * session still goes through Stripe Checkout + live webhooks.
 *
 * Env:
 *   STRIPE_CERT_PROMO_ID=promo_...   (required)
 *   STRIPE_PRICE_STARTER_MONTHLY=price_... (from .env)
 *
 * Usage (worker container with .env):
 *   STRIPE_CERT_PROMO_ID=promo_xxx npx tsx scripts/vps-zero-dollar-cert.ts
 *
 * Prints CHECKOUT_URL=... for Playwright to complete, then --wait mode
 * polls for STARTER. Pass --phase=prepare|verify|cancel|cleanup
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { getStripe, isStripeEnabled } from "../src/lib/stripe";
import { PLANS } from "../src/lib/plans";
import { appUrl } from "../src/lib/utils";

type Phase = "prepare" | "verify" | "cancel" | "cleanup" | "status";

function phase(): Phase {
  const arg = process.argv.find((a) => a.startsWith("--phase="));
  return ((arg?.split("=")[1] as Phase) || "prepare") as Phase;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!isStripeEnabled()) throw new Error("Stripe not enabled");
  const stripe = getStripe()!;
  const p = phase();
  const statePathHint = "Look for CERT_EMAIL / CERT_USER_ID / CHECKOUT_URL / SUB_ID in stdout";

  if (p === "prepare") {
    const promoId = process.env.STRIPE_CERT_PROMO_ID?.trim();
    const priceId = process.env.STRIPE_PRICE_STARTER_MONTHLY?.trim();
    if (!promoId) throw new Error("STRIPE_CERT_PROMO_ID required");
    if (!priceId) throw new Error("STRIPE_PRICE_STARTER_MONTHLY required");
    const ts = Date.now();
    const email = `chris+sfpay${ts}@iscreamstudio.com`;
    const password = `CertPay!${ts}Aa1`;
    const hash = await bcrypt.hash(password, 12);

    // Signup via API so production path is exercised
    const signup = await fetch(`${process.env.APP_URL || "https://sendfable.com"}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "SF Pay Cert",
        email,
        password,
        workspaceName: `Pay Cert ${ts}`,
        acceptedPolicies: true,
      }),
    });
    const signupBody = await signup.json().catch(() => ({}));
    if (!signup.ok && signup.status !== 200) {
      throw new Error(`signup failed ${signup.status} ${JSON.stringify(signupBody).slice(0, 300)}`);
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user) {
      // Fallback create if API returned ok but race
      throw new Error("user missing after signup");
    }

    // Force verified + password hash consistent
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        passwordHash: hash,
        plan: "FREE",
        stripeSubscriptionId: null,
      },
      include: { memberships: true },
    });
    const workspaceId = user.memberships[0]?.workspaceId;
    if (!workspaceId) throw new Error("no workspace");

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        mailingAddress: "123 Cert St, Austin, TX 78701, US",
        onboardingCompletedAt: new Date(),
        onboardingStep: 4,
      },
    });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: {
          application: "sendfable",
          environment: "production",
          userId: user.id,
          workspaceId,
          cert: "zero_dollar_pay",
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Real Checkout Session — 100% promo applied server-side; $0 due.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ promotion_code: promoId }],
      payment_method_collection: "if_required",
      success_url: appUrl("/billing?success=1&cert=1"),
      cancel_url: appUrl("/billing?canceled=1&cert=1"),
      client_reference_id: user.id,
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message:
            "I agree to the SendFable Terms of Service, Privacy Policy, and Billing Policy at sendfable.com.",
        },
      },
      subscription_data: {
        metadata: {
          application: "sendfable",
          environment: "production",
          userId: user.id,
          workspaceId,
          plan: "STARTER",
          cert: "zero_dollar_pay",
        },
      },
      metadata: {
        application: "sendfable",
        environment: "production",
        userId: user.id,
        workspaceId,
        plan: "STARTER",
        cert: "zero_dollar_pay",
      },
    });

    console.log(
      JSON.stringify(
        {
          phase: "prepare",
          CERT_EMAIL: email,
          CERT_PASSWORD: password,
          CERT_USER_ID: user.id,
          CERT_WORKSPACE_ID: workspaceId,
          STRIPE_CUSTOMER_ID: customerId,
          CHECKOUT_SESSION_ID: session.id,
          CHECKOUT_URL: session.url,
          AMOUNT_TOTAL: session.amount_total,
          hint: statePathHint,
          starterContactCap: PLANS.STARTER.contactCap,
          freeContactCap: PLANS.FREE.contactCap,
        },
        null,
        2
      )
    );
    await prisma.$disconnect();
    return;
  }

  const email = process.env.CERT_EMAIL?.trim();
  if (!email) throw new Error("CERT_EMAIL required for this phase");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("cert user not found");

  if (p === "verify") {
    const sessionId = process.env.CHECKOUT_SESSION_ID?.trim();
    let session = sessionId
      ? await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] })
      : null;

    // Poll up to ~90s for webhook entitlement
    let plan = user.plan;
    for (let i = 0; i < 30; i++) {
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      plan = fresh?.plan || plan;
      if (plan === "STARTER" && fresh?.stripeSubscriptionId) break;
      if (sessionId) {
        session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
        if (session.status === "complete" && session.payment_status === "paid") {
          // webhook may still be in flight
        }
      }
      await sleep(3000);
    }

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    const subId = fresh?.stripeSubscriptionId;
    let sub = null as any;
    let invoices: any[] = [];
    if (subId) {
      sub = await stripe.subscriptions.retrieve(subId);
      const inv = await stripe.invoices.list({ subscription: subId, limit: 5 });
      invoices = inv.data.map((i) => ({
        id: i.id,
        status: i.status,
        total: i.total,
        amount_paid: i.amount_paid,
        paid: i.paid,
      }));
    }

    const events = await prisma.webhookEvent.findMany({
      where: {
        source: "stripe",
        type: {
          in: [
            "checkout.session.completed",
            "customer.subscription.created",
            "customer.subscription.updated",
            "invoice.paid",
            "invoice.payment_succeeded",
            "invoice.created",
            "invoice.finalized",
          ],
        },
        processedAt: { gte: new Date(Date.now() - 2 * 3600_000) },
      },
      orderBy: { processedAt: "desc" },
      take: 40,
      select: { type: true, externalId: true, processedAt: true },
    });

    console.log(
      JSON.stringify(
        {
          phase: "verify",
          dbPlan: fresh?.plan,
          stripeSubscriptionId: subId,
          checkoutStatus: session?.status,
          checkoutPaymentStatus: session?.payment_status,
          checkoutAmountTotal: session?.amount_total,
          subscriptionStatus: sub?.status,
          subscriptionAmount: sub?.items?.data?.[0]?.price?.unit_amount,
          invoices,
          recentWebhookTypes: [...new Set(events.map((e) => e.type))],
          webhookEventCount: events.length,
          STARTER_ENTITLEMENT: fresh?.plan === "STARTER" ? "PASS" : "FAIL",
          CHECKOUT_COMPLETE: session?.status === "complete" ? "PASS" : "FAIL",
          ZERO_DOLLAR:
            session?.amount_total === 0 || invoices.some((i) => i.amount_paid === 0 && i.status === "paid")
              ? "PASS"
              : "FAIL",
        },
        null,
        2
      )
    );
    await prisma.$disconnect();
    return;
  }

  if (p === "cancel") {
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh?.stripeCustomerId) throw new Error("no customer");

    const portal = await stripe.billingPortal.sessions.create({
      customer: fresh.stripeCustomerId,
      return_url: appUrl("/billing?cert=portal"),
    });

    const subId = fresh.stripeSubscriptionId;
    if (!subId) throw new Error("no subscription to cancel");

    // Immediate cancel → customer.subscription.deleted → FREE (correct end-of-life)
    const canceled = await stripe.subscriptions.cancel(subId);

    let plan = fresh.plan;
    for (let i = 0; i < 30; i++) {
      const u = await prisma.user.findUnique({ where: { id: user.id } });
      plan = u?.plan || plan;
      if (plan === "FREE" && !u?.stripeSubscriptionId) break;
      await sleep(3000);
    }
    const after = await prisma.user.findUnique({ where: { id: user.id } });

    const deletedEvents = await prisma.webhookEvent.findMany({
      where: {
        source: "stripe",
        type: "customer.subscription.deleted",
        processedAt: { gte: new Date(Date.now() - 2 * 3600_000) },
      },
      orderBy: { processedAt: "desc" },
      take: 5,
    });

    console.log(
      JSON.stringify(
        {
          phase: "cancel",
          PORTAL_URL: portal.url,
          PORTAL: portal.url ? "PASS" : "FAIL",
          canceledSubStatus: canceled.status,
          dbPlanAfter: after?.plan,
          dbSubAfter: after?.stripeSubscriptionId,
          deletedWebhookSeen: deletedEvents.length > 0,
          RETURN_TO_FREE: after?.plan === "FREE" && !after?.stripeSubscriptionId ? "PASS" : "FAIL",
          CANCELLATION: canceled.status === "canceled" ? "PASS" : "FAIL",
        },
        null,
        2
      )
    );
    await prisma.$disconnect();
    return;
  }

  if (p === "status") {
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    console.log(JSON.stringify({ email, plan: fresh?.plan, sub: fresh?.stripeSubscriptionId }, null, 2));
    await prisma.$disconnect();
    return;
  }

  console.log(JSON.stringify({ phase: p, note: "cleanup is done via Stripe MCP deactivate promo" }));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("CERT_FAIL", e instanceof Error ? e.message : e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
