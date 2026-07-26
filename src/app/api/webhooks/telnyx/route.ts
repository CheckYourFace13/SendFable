/**
 * Telnyx SMS webhook endpoint — delivery events + inbound messages.
 *
 * Safety: with SENDFABLE_SMS_INBOUND_ENABLED=false (the default) this route
 * acknowledges nothing and processes nothing — no conversation can be
 * activated by a real inbound webhook while the product is dark. Signature
 * verification is mandatory whenever processing is enabled.
 */

import { NextResponse } from "next/server";
import { isSmsCodeEnabled, isSmsInboundEnabled } from "@/lib/sms/flags";
import { TelnyxSmsProvider } from "@/lib/sms/telnyx-provider";
import { processInboundSms } from "@/lib/sms/inbound";
import { processDeliveryEvent } from "@/lib/sms/send";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsInboundEnabled()) {
    // Product is dark: refuse without processing. 404 avoids advertising the
    // endpoint while SMS is unreleased.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawBody = await req.text();
  const provider = new TelnyxSmsProvider();

  const validation = provider.validateWebhook(rawBody, {
    "telnyx-timestamp": req.headers.get("telnyx-timestamp"),
    "telnyx-signature-ed25519": req.headers.get("telnyx-signature-ed25519"),
    "telnyx-signature-hmac": req.headers.get("telnyx-signature-hmac"),
  });
  if (!validation.valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inbound = provider.handleInboundMessage(payload);
  if (inbound) {
    const result = await processInboundSms(provider.name, inbound);
    return NextResponse.json({ ok: true, outcome: result.outcome });
  }

  const delivery = provider.handleDeliveryEvent(payload);
  if (delivery) {
    const result = await processDeliveryEvent(provider.name, delivery);
    return NextResponse.json({ ok: true, outcome: result.outcome });
  }

  // Unrecognized but validly-signed event types are acknowledged so Telnyx
  // does not retry forever.
  return NextResponse.json({ ok: true, outcome: "ignored" });
}
