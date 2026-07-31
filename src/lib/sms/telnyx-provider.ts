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

import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";
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

const WEBHOOK_TIMESTAMP_TOLERANCE_SEC = 300;

/** Verify Telnyx Ed25519 webhook signature over `{timestamp}|{rawBody}`. */
export function verifyTelnyxEd25519(
  rawBody: string,
  timestamp: string,
  signatureB64: string,
  publicKeyB64: string
): boolean {
  try {
    const raw = Buffer.from(publicKeyB64.trim(), "base64");
    // Telnyx portal key is typically raw 32-byte Ed25519; also accept SPKI DER.
    const key =
      raw.length === 32
        ? createPublicKey({
            key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]),
            format: "der",
            type: "spki",
          })
        : createPublicKey({ key: raw, format: "der", type: "spki" });
    return cryptoVerify(
      null,
      Buffer.from(`${timestamp}|${rawBody}`, "utf8"),
      key,
      Buffer.from(signatureB64.trim(), "base64")
    );
  } catch {
    return false;
  }
}

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
   * Telnyx signs production webhooks with Ed25519
   * (`telnyx-signature-ed25519` + `telnyx-timestamp`) over `{timestamp}|{rawBody}`.
   * Prefer `TELNYX_PUBLIC_KEY`. HMAC via `TELNYX_WEBHOOK_SECRET` remains as a
   * controlled-test fallback only. Validation NEVER makes a network call.
   */
  validateWebhook(rawBody: string, headers: Record<string, string | null>): SmsWebhookValidation {
    const timestamp = headers["telnyx-timestamp"];
    if (!timestamp) return { valid: false, reason: "missing telnyx-timestamp" };

    const ts = Number(timestamp);
    if (
      !Number.isFinite(ts) ||
      Math.abs(Date.now() / 1000 - ts) > WEBHOOK_TIMESTAMP_TOLERANCE_SEC
    ) {
      return { valid: false, reason: "stale or invalid timestamp" };
    }

    const ed25519Sig = headers["telnyx-signature-ed25519"]?.trim();
    const publicKey = process.env.TELNYX_PUBLIC_KEY?.trim();
    if (ed25519Sig && publicKey) {
      const ok = verifyTelnyxEd25519(rawBody, timestamp, ed25519Sig, publicKey);
      return ok ? { valid: true } : { valid: false, reason: "ed25519 signature mismatch" };
    }

    // Controlled-test HMAC fallback (not Telnyx production signing).
    const secret = process.env.TELNYX_WEBHOOK_SECRET?.trim();
    const hmacSig = headers["telnyx-signature-hmac"]?.trim();
    if (secret && hmacSig) {
      const expected = createHmac("sha256", secret).update(`${timestamp}|${rawBody}`).digest("hex");
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(hmacSig, "utf8");
      if (a.length === b.length && timingSafeEqual(a, b)) return { valid: true };
      return { valid: false, reason: "hmac signature mismatch" };
    }

    if (!publicKey && !secret) {
      return { valid: false, reason: "TELNYX_PUBLIC_KEY (or TELNYX_WEBHOOK_SECRET) not configured" };
    }
    return { valid: false, reason: "missing signature headers" };
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
