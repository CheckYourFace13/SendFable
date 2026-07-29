/**
 * TelnyxSmsProvider — prepared integration, ALL live methods locked behind
 * feature flags. With the flags at their safe defaults this class can never
 * make a network request.
 *
 * Credentials: a dedicated TELNYX_API_KEY env var (never stored in the
 * database, never shared with AWS SES credentials). See .env.example.
 *
 * Phase 1 scope: plain SMS, US destinations, US local 10DLC numbers.
 * No MMS. No international.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { calculateSegments } from "@/lib/sms/segments";
import { assertSmsFlag } from "@/lib/sms/flags";
import type {
  DeliveryEvent,
  InboundMessageEvent,
  NumberRequest,
  NumberResult,
  OutboundSmsRequest,
  OutboundSmsResult,
  ProviderCosts,
  RegistrationRequest,
  RegistrationResult,
  SmsEstimate,
  SmsProvider,
  SmsWebhookValidation,
} from "@/lib/sms/provider";
import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

function telnyxApiKey(): string {
  const key = process.env.TELNYX_API_KEY?.trim();
  if (!key) throw new Error("TELNYX_API_KEY is not configured");
  return key;
}

async function telnyxRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${TELNYX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${telnyxApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Telnyx API ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export class TelnyxSmsProvider implements SmsProvider {
  readonly name = "telnyx" as const;

  /** Pure local estimation — no network. */
  estimateMessage(body: string): SmsEstimate {
    const info = calculateSegments(body);
    return {
      encoding: info.encoding,
      segments: info.segments,
      estimatedProviderCostMicros:
        BigInt(info.segments) * MOCK_PROVIDER_COSTS.outboundPerSegmentMicros,
    };
  }

  async sendMessage(req: OutboundSmsRequest): Promise<OutboundSmsResult> {
    assertSmsFlag("SENDFABLE_SMS_LIVE_SENDING_ENABLED");
    if (!req.to.startsWith("+1")) {
      throw new Error("Phase 1 permits US destinations only");
    }
    const info = calculateSegments(req.body);
    const data = await telnyxRequest<{ data: { id: string } }>("/messages", {
      method: "POST",
      body: JSON.stringify({
        from: req.from,
        to: req.to,
        text: req.body,
        type: "SMS",
      }),
      // Telnyx supports idempotency via unique request keys
      headers: { "Idempotency-Key": req.idempotencyKey },
    });
    return {
      providerMessageId: data.data.id,
      status: "accepted",
      encoding: info.encoding,
      segments: info.segments,
      providerCostMicros:
        BigInt(info.segments) * MOCK_PROVIDER_COSTS.outboundPerSegmentMicros,
    };
  }

  /**
   * Telnyx signs webhooks with Ed25519 (telnyx-signature-ed25519 +
   * telnyx-timestamp). Until the live public key is configured we also
   * support an HMAC shared-secret mode for controlled testing.
   * Validation NEVER makes a network call.
   */
  validateWebhook(rawBody: string, headers: Record<string, string | null>): SmsWebhookValidation {
    const secret = process.env.TELNYX_WEBHOOK_SECRET?.trim();
    if (!secret) return { valid: false, reason: "TELNYX_WEBHOOK_SECRET not configured" };

    const timestamp = headers["telnyx-timestamp"];
    const signature = headers["telnyx-signature-hmac"] ?? headers["telnyx-signature-ed25519"];
    if (!timestamp || !signature) return { valid: false, reason: "missing signature headers" };

    // Reject stale webhooks (> 5 minutes)
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      return { valid: false, reason: "stale or invalid timestamp" };
    }

    const expected = createHmac("sha256", secret).update(`${timestamp}|${rawBody}`).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: "signature mismatch" };
    }
    return { valid: true };
  }

  handleDeliveryEvent(payload: unknown): DeliveryEvent | null {
    const evt = (payload as { data?: { event_type?: string; id?: string; payload?: Record<string, unknown>; occurred_at?: string } })?.data;
    if (!evt?.event_type) return null;
    const et = evt.event_type;
    if (et !== "message.sent" && et !== "message.finalized") return null;
    const p = evt.payload ?? {};
    const to = Array.isArray(p.to) ? (p.to[0] as Record<string, unknown>) : undefined;
    const status = String(to?.status ?? p.status ?? "");
    const mapped: DeliveryEvent["status"] =
      status === "delivered" ? "delivered" : et === "message.sent" ? "sent" : "failed";
    const costObj = p.cost as { amount?: string } | undefined;
    return {
      providerMessageId: String(p.id ?? ""),
      status: mapped,
      errorCode: Array.isArray(p.errors) && p.errors.length ? String((p.errors[0] as Record<string, unknown>).code ?? "") : undefined,
      providerCostMicros: costObj?.amount ? usdStringToMicros(costObj.amount) : undefined,
      occurredAt: evt.occurred_at ? new Date(evt.occurred_at) : new Date(),
      eventId: String(evt.id ?? `${p.id}_${et}`),
    };
  }

  handleInboundMessage(payload: unknown): InboundMessageEvent | null {
    const evt = (payload as { data?: { event_type?: string; id?: string; payload?: Record<string, unknown>; occurred_at?: string } })?.data;
    if (!evt?.event_type || evt.event_type !== "message.received") return null;
    const p = evt.payload ?? {};
    const body = String(p.text ?? "");
    const info = calculateSegments(body);
    const from = p.from as Record<string, unknown> | undefined;
    const toArr = Array.isArray(p.to) ? (p.to[0] as Record<string, unknown>) : undefined;
    const costObj = p.cost as { amount?: string } | undefined;
    return {
      providerMessageId: String(p.id ?? ""),
      from: String(from?.phone_number ?? ""),
      to: String(toArr?.phone_number ?? ""),
      body,
      segments: typeof p.parts === "number" ? p.parts : info.segments,
      encoding: info.encoding,
      occurredAt: evt.occurred_at ? new Date(evt.occurred_at) : new Date(),
      eventId: String(evt.id ?? `in_${p.id}`),
      providerCostMicros: costObj?.amount ? usdStringToMicros(costObj.amount) : undefined,
    };
  }

  async requestNumber(req: NumberRequest): Promise<NumberResult> {
    assertSmsFlag("SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED");
    if (req.numberType !== "us-local") {
      throw new Error("Phase 1 permits US local 10DLC numbers only");
    }
    throw new Error(
      "Telnyx number purchase is prepared but intentionally not implemented until " +
        "SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED rollout is authorized (see docs/SMS_TELNYX_SETUP.md)."
    );
  }

  async releaseNumber(_providerNumberId: string): Promise<void> {
    assertSmsFlag("SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED");
    throw new Error("Telnyx number release requires the number-purchase flag rollout.");
  }

  async submitRegistration(_req: RegistrationRequest): Promise<RegistrationResult> {
    assertSmsFlag("SENDFABLE_SMS_REGISTRATION_ENABLED");
    throw new Error(
      "10DLC registration submission is prepared but intentionally not implemented " +
        "until SENDFABLE_SMS_REGISTRATION_ENABLED rollout is authorized."
    );
  }

  async getRegistrationStatus(providerReference: string): Promise<RegistrationResult> {
    assertSmsFlag("SENDFABLE_SMS_REGISTRATION_ENABLED");
    return { providerReference, status: "pending" };
  }

  async getProviderCosts(): Promise<ProviderCosts> {
    // Until reconciliation data exists, use the documented assumptions.
    return MOCK_PROVIDER_COSTS;
  }
}

/** "0.0080" USD → 8000n micros, without float math. */
export function usdStringToMicros(amount: string): bigint {
  const m = amount.trim().match(/^(-?)(\d+)(?:\.(\d{1,6}))?$/);
  if (!m) throw new Error(`Unparseable USD amount: ${amount}`);
  const sign = m[1] === "-" ? -1n : 1n;
  const whole = BigInt(m[2]);
  const frac = BigInt((m[3] ?? "").padEnd(6, "0") || "0");
  return sign * (whole * 1_000_000n + frac);
}
