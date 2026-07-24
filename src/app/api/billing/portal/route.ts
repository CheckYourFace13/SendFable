import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";

export async function POST() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners/admins can manage billing" }, { status: 403 });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }
  if (!ctx.user.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet" }, { status: 400 });
  }

  const stripe = getStripe()!;
  const session = await stripe.billingPortal.sessions.create({
    customer: ctx.user.stripeCustomerId,
    return_url: appUrl("/billing"),
  });

  return NextResponse.json({ url: session.url });
}
