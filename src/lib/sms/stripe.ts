/**
 * Stripe integration for the SMS product — fully independent of the email
 * Plan lifecycle, and inert while SENDFABLE_SMS_BILLING_ENABLED=false.
 *
 * Price IDs come from env vars written by scripts/stripe-sms-setup.ts
 * (dry-run by default). Lookup keys are the stable identifiers.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isSmsBillingEnabled } from "@/lib/sms/flags";
import {
  isBundleEligible,
  resolveSmsPricing,
  SMS_PLANS,
  type SmsPlanKey,
} from "@/lib/sms/pricing";
import { getWorkspaceOwner } from "@/lib/workspace-owner";
import type { Plan } from "@prisma/client";

// ─── Env price mapping ────────────────────────────────────────────────────────

export const SMS_PRICE_ENV_KEYS = {
  TEXT_ENTRY: { standard: "STRIPE_PRICE_SMS_TEXT_ENTRY_MONTHLY", bundled: null },
  TEXT_ESSENTIALS: {
    standard: "STRIPE_PRICE_SMS_TEXT_ESSENTIALS_MONTHLY",
    bundled: "STRIPE_PRICE_SMS_TEXT_ESSENTIALS_MONTHLY_BUNDLED",
  },
  TEXT_ADVANTAGE: {
    standard: "STRIPE_PRICE_SMS_TEXT_ADVANTAGE_MONTHLY",
    bundled: "STRIPE_PRICE_SMS_TEXT_ADVANTAGE_MONTHLY_BUNDLED",
  },
} as const;

export const SMS_METERED_PRICE_ENV_KEYS = {
  TEXT_ENTRY: "STRIPE_PRICE_SMS_OUTBOUND_TEXT_ENTRY",
  TEXT_ESSENTIALS: "STRIPE_PRICE_SMS_OUTBOUND_TEXT_ESSENTIALS",
  TEXT_ADVANTAGE: "STRIPE_PRICE_SMS_OUTBOUND_TEXT_ADVANTAGE",
} as const;

export const SMS_INBOUND_OVERAGE_PRICE_ENV = "STRIPE_PRICE_SMS_INBOUND_OVERAGE";
export const SMS_ACTIVATION_PRICE_ENV = "STRIPE_PRICE_SMS_ACTIVATION";

export function smsFixedPriceId(plan: SmsPlanKey, bundled: boolean): string | null {
  const keys = SMS_PRICE_ENV_KEYS[plan];
  const env = bundled && keys.bundled ? keys.bundled : keys.standard;
  return process.env[env]?.trim() || null;
}

/** Map an incoming Stripe price id to an SMS plan (standard or bundled). */
export function smsPlanFromPriceId(
  priceId: string
): { plan: SmsPlanKey; bundled: boolean } | null {
  for (const plan of Object.keys(SMS_PRICE_ENV_KEYS) as SmsPlanKey[]) {
    const keys = SMS_PRICE_ENV_KEYS[plan];
    if (process.env[keys.standard]?.trim() === priceId) return { plan, bundled: false };
    if (keys.bundled && process.env[keys.bundled]?.trim() === priceId) {
      return { plan, bundled: true };
    }
  }
  return null;
}

/** Stable lookup keys for products/prices created by the setup script. */
export const SMS_STRIPE_LOOKUP_KEYS = {
  TEXT_ENTRY: "sms_text_entry_monthly",
  TEXT_ESSENTIALS: "sms_text_essentials_monthly",
  TEXT_ESSENTIALS_BUNDLED: "sms_text_essentials_monthly_bundled",
  TEXT_ADVANTAGE: "sms_text_advantage_monthly",
  TEXT_ADVANTAGE_BUNDLED: "sms_text_advantage_monthly_bundled",
  ACTIVATION: "sms_activation_fee",
  OUTBOUND_TEXT_ENTRY: "sms_outbound_text_entry",
  OUTBOUND_TEXT_ESSENTIALS: "sms_outbound_text_essentials",
  OUTBOUND_TEXT_ADVANTAGE: "sms_outbound_text_advantage",
  INBOUND_OVERAGE: "sms_inbound_overage",
} as const;

// ─── Webhook handling ─────────────────────────────────────────────────────────

export interface SmsStripeHandleResult {
  handled: boolean;
  action?: string;
}

/**
 * Handle SMS-relevant subscription lifecycle events. Called from the shared
 * Stripe webhook route AFTER signature verification and idempotency checks.
 */
export async function handleSmsSubscriptionEvent(
  sub: Stripe.Subscription,
  eventType: string
): Promise<SmsStripeHandleResult> {
  // Find an SMS price on this subscription; if none, it's not ours.
  let match: { plan: SmsPlanKey; bundled: boolean; itemId: string } | null = null;
  for (const item of sub.items.data) {
    const mapped = item.price?.id ? smsPlanFromPriceId(item.price.id) : null;
    if (mapped) {
      match = { ...mapped, itemId: item.id };
      break;
    }
  }
  if (!match) return { handled: false };

  const workspaceId = sub.metadata?.workspaceId;
  const existing = workspaceId
    ? await prisma.smsSubscription.findUnique({ where: { workspaceId } })
    : await prisma.smsSubscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
  if (!existing) {
    console.warn("[sms-stripe] subscription event for unknown SMS subscription");
    return { handled: true, action: "unknown-subscription" };
  }

  if (eventType === "customer.subscription.deleted" || sub.status === "canceled") {
    await prisma.smsSubscription.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return { handled: true, action: "cancelled" };
  }

  const def = SMS_PLANS[match.plan];
  const applied = match.bundled && def.bundledMonthlyPriceCents !== null
    ? def.bundledMonthlyPriceCents
    : def.monthlyPriceCents;

  await prisma.smsSubscription.update({
    where: { id: existing.id },
    data: {
      plan: match.plan,
      status:
        sub.status === "active" || sub.status === "trialing"
          ? "ACTIVE"
          : sub.status === "past_due" || sub.status === "unpaid"
            ? "PAST_DUE"
            : sub.status === "paused"
              ? "PAUSED"
              : "INCOMPLETE",
      baseMonthlyPriceCents: def.monthlyPriceCents,
      appliedMonthlyPriceCents: applied,
      bundleDiscountPercent: match.bundled ? 10 : 0,
      stripeSubscriptionId: sub.id,
      stripeSubscriptionItemId: match.itemId,
      activatedAt: existing.activatedAt ?? (sub.status === "active" ? new Date() : null),
    },
  });
  return { handled: true, action: "updated" };
}

/** Activation payment (one-time $99) confirmation via checkout/invoice. */
export async function handleSmsActivationPayment(
  workspaceId: string,
  stripePaymentId: string
): Promise<void> {
  await prisma.smsActivation.updateMany({
    where: { workspaceId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", stripePaymentId, paidAt: new Date() },
  });
}

// ─── Bundle recalculation ─────────────────────────────────────────────────────

/**
 * Recalculate bundle eligibility for a workspace after ANY email-plan change
 * (upgrade, downgrade, cancellation, payment failure, webhook replay).
 *
 * DB state always updates. The Stripe price swap (with proration) only runs
 * when SMS billing is enabled AND a live SMS subscription item exists. The
 * customer's SMS service is never removed because their email plan changed —
 * only the fixed fee returns to its standard rate.
 */
export async function recalcSmsBundle(workspaceId: string): Promise<{
  changed: boolean;
  appliedMonthlyPriceCents?: number;
}> {
  const smsSub = await prisma.smsSubscription.findUnique({ where: { workspaceId } });
  if (!smsSub || smsSub.status === "CANCELLED") return { changed: false };

  const owner = await getWorkspaceOwner(workspaceId);
  const emailState = {
    plan: owner.plan as Plan,
    // Paused/unpaid/cancelled/expired plans do not qualify
    active: !owner.paymentFailedAt && owner.plan !== "FREE",
  };

  const pricing = resolveSmsPricing(smsSub.plan as SmsPlanKey, emailState);
  const eligible = isBundleEligible(smsSub.plan as SmsPlanKey, emailState);

  if (pricing.appliedMonthlyPriceCents === smsSub.appliedMonthlyPriceCents) {
    return { changed: false };
  }

  await prisma.smsSubscription.update({
    where: { id: smsSub.id },
    data: {
      appliedMonthlyPriceCents: pricing.appliedMonthlyPriceCents,
      bundleDiscountPercent: pricing.bundleDiscountPercent,
      bundleEligibilitySource: pricing.bundleEligibilitySource,
    },
  });

  // Live Stripe price swap with standard proration — gated.
  if (isSmsBillingEnabled() && smsSub.stripeSubscriptionId && smsSub.stripeSubscriptionItemId) {
    const stripe = getStripe();
    const newPriceId = smsFixedPriceId(smsSub.plan as SmsPlanKey, eligible);
    if (stripe && newPriceId) {
      await stripe.subscriptionItems.update(smsSub.stripeSubscriptionItemId, {
        price: newPriceId,
        proration_behavior: "create_prorations",
      });
    }
  }

  return { changed: true, appliedMonthlyPriceCents: pricing.appliedMonthlyPriceCents };
}

/** Recalc bundles for every workspace owned by this Stripe customer. */
export async function recalcSmsBundleForCustomer(stripeCustomerId: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { stripeCustomerId } });
  if (!user) return;
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, role: "OWNER" },
    select: { workspaceId: true },
  });
  for (const m of memberships) {
    try {
      await recalcSmsBundle(m.workspaceId);
    } catch (err) {
      console.error(`[sms-stripe] bundle recalc failed for workspace ${m.workspaceId}`, err);
    }
  }
}
