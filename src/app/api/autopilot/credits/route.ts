import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/session";
import { packById } from "@/lib/autopilot/commercial";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";
import {
  STRIPE_BILLING_DISABLED_MESSAGE,
  canCreateCheckoutSession,
} from "@/lib/stripe-billing-gate";

const schema = z.object({
  pack: z.enum(["pack_5", "pack_10", "pack_25"]),
});

/** One-time workspace creation credits. The free trial does not use this route. */
export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners and admins can buy creations" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a creation pack" }, { status: 400 });
  const pack = packById(parsed.data.pack);
  if (!pack) return NextResponse.json({ error: "Choose a creation pack" }, { status: 400 });

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }
  if (!canCreateCheckoutSession(ctx.user.email)) {
    return NextResponse.json({ error: STRIPE_BILLING_DISABLED_MESSAGE }, { status: 403 });
  }

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(ctx.user.stripeCustomerId
      ? { customer: ctx.user.stripeCustomerId }
      : { customer_email: ctx.user.email }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.cents,
          product_data: {
            name: `Scribe — ${pack.label}`,
            description: "Extra Scribe campaign creations for this workspace.",
          },
        },
      },
    ],
    success_url: appUrl("/settings/marketing-autopilot?credits=1"),
    cancel_url: appUrl("/settings/marketing-autopilot"),
    metadata: {
      application: "sendfable",
      autopilotCreditWorkspaceId: ctx.workspace.id,
      autopilotCreditPack: pack.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
