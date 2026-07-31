/**
 * MockSmsProvider — the default provider. Never calls Telnyx, AWS, or any
 * network. Outbound messages are written to a local SMS outbox (JSON files)
 * so the full UI/worker stack can be exercised deterministically with zero
 * external activity.
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { calculateSegments } from "@/lib/sms/segments";
import { redactPhone } from "@/lib/sms/phone";
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

/**
 * Cost assumptions for ISV / customer-specific 10DLC (Telnyx pass-through fees
 * as of SF-017; verify against current Telnyx fee tables before launch).
 * Telnyx states 10DLC registry fees are passed through at cost.
 */
export const MOCK_PROVIDER_COSTS: ProviderCosts = {
  outboundPerSegmentMicros: 8_000n, // ~$0.008 platform + carrier blend assumption
  inboundPerSegmentMicros: 8_000n,
  numberMonthlyMicros: 1_500_000n, // ~$1.50/mo local number rental assumption
  // Brand $4.50 + campaign review $15 + enhanced vetting ~$40 + 3×$10 campaign MRC prepaid ≈ $89.50
  registrationOneTimeMicros: 89_500_000n,
  campaignMonthlyMicros: 10_000_000n, // $10/mo standard Marketing/Mixed campaign MRC
  source: "assumption",
};

function outboxDir(): string {
  return process.env.SMS_OUTBOX_DIR?.trim() || join(tmpdir(), "sms-outbox");
}

/** Deterministic id derived from the idempotency key: retries collide. */
function mockMessageId(idempotencyKey: string): string {
  return "mock_" + createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24);
}

export interface MockOutboxRecord {
  providerMessageId: string;
  workspaceId: string;
  fromRedacted: string;
  toRedacted: string;
  body: string;
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  estimatedProviderCostMicros: string;
  campaignId: string | null;
  createdAt: string;
}

export class MockSmsProvider implements SmsProvider {
  readonly name = "mock" as const;

  /** In-memory sent log for deterministic tests. */
  readonly sent: MockOutboxRecord[] = [];

  /** Simulate a failure for destinations ending in these digits (tests). */
  failSuffixes: string[] = ["0000"];

  private writeToDisk: boolean;

  constructor(opts?: { writeToDisk?: boolean }) {
    this.writeToDisk = opts?.writeToDisk ?? true;
  }

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
    const info = calculateSegments(req.body);
    const providerMessageId = mockMessageId(req.idempotencyKey);
    const costMicros = BigInt(info.segments) * MOCK_PROVIDER_COSTS.outboundPerSegmentMicros;

    const shouldFail = this.failSuffixes.some((s) => req.to.endsWith(s));

    const record: MockOutboxRecord = {
      providerMessageId,
      workspaceId: req.workspaceId,
      fromRedacted: redactPhone(req.from),
      toRedacted: redactPhone(req.to),
      body: req.body,
      encoding: info.encoding,
      segments: info.segments,
      estimatedProviderCostMicros: costMicros.toString(),
      campaignId: req.campaignId ?? null,
      createdAt: new Date().toISOString(),
    };
    this.sent.push(record);

    if (this.writeToDisk) {
      try {
        const dir = outboxDir();
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${providerMessageId}.json`), JSON.stringify(record, null, 2));
      } catch {
        // Outbox write is best-effort; the in-memory record is authoritative for tests.
      }
    }

    if (shouldFail) {
      return {
        providerMessageId,
        status: "failed",
        encoding: info.encoding,
        segments: info.segments,
        errorCode: "MOCK_UNDELIVERABLE",
        providerCostMicros: 0n,
      };
    }
    return {
      providerMessageId,
      status: "accepted",
      encoding: info.encoding,
      segments: info.segments,
      providerCostMicros: costMicros,
    };
  }

  validateWebhook(rawBody: string, headers: Record<string, string | null>): SmsWebhookValidation {
    // Mock webhooks are only accepted when explicitly marked as simulated.
    if (headers["x-mock-sms-signature"] === "mock-valid") return { valid: true };
    return { valid: false, reason: "missing mock signature" };
  }

  handleDeliveryEvent(payload: unknown): DeliveryEvent | null {
    const p = payload as Record<string, unknown> | null;
    if (!p || p.kind !== "delivery") return null;
    return {
      providerMessageId: String(p.providerMessageId ?? ""),
      status: (p.status as DeliveryEvent["status"]) ?? "delivered",
      errorCode: p.errorCode ? String(p.errorCode) : undefined,
      providerCostMicros: p.providerCostMicros != null ? BigInt(String(p.providerCostMicros)) : undefined,
      occurredAt: p.occurredAt ? new Date(String(p.occurredAt)) : new Date(),
      eventId: String(p.eventId ?? `mock_evt_${p.providerMessageId}_${p.status}`),
    };
  }

  handleInboundMessage(payload: unknown): InboundMessageEvent | null {
    const p = payload as Record<string, unknown> | null;
    if (!p || p.kind !== "inbound") return null;
    const body = String(p.body ?? "");
    const info = calculateSegments(body);
    return {
      providerMessageId: String(p.providerMessageId ?? `mock_in_${p.eventId ?? Date.now()}`),
      from: String(p.from ?? ""),
      to: String(p.to ?? ""),
      body,
      segments: typeof p.segments === "number" ? p.segments : info.segments,
      encoding: info.encoding,
      occurredAt: p.occurredAt ? new Date(String(p.occurredAt)) : new Date(),
      eventId: String(p.eventId ?? `mock_evt_in_${p.providerMessageId}`),
      providerCostMicros:
        p.providerCostMicros != null
          ? BigInt(String(p.providerCostMicros))
          : BigInt(info.segments) * MOCK_PROVIDER_COSTS.inboundPerSegmentMicros,
    };
  }

  async requestNumber(req: NumberRequest): Promise<NumberResult> {
    // Deterministic fake number in the 555 fictional range.
    const seed = createHash("sha256").update(req.workspaceId).digest();
    const line = String(1000 + (seed.readUInt16BE(0) % 9000));
    const area = req.areaCode && /^\d{3}$/.test(req.areaCode) ? req.areaCode : "312";
    return {
      phoneE164: `+1${area}555${line}`,
      providerNumberId: `mock_num_${seed.toString("hex").slice(0, 12)}`,
      monthlyCostMicros: MOCK_PROVIDER_COSTS.numberMonthlyMicros,
    };
  }

  async releaseNumber(_providerNumberId: string): Promise<void> {
    // No external state to release.
  }

  async submitRegistration(req: RegistrationRequest): Promise<RegistrationResult> {
    return {
      providerReference: `mock_reg_${req.kind}_${createHash("sha256")
        .update(req.workspaceId + req.kind)
        .digest("hex")
        .slice(0, 12)}`,
      status: "submitted",
    };
  }

  async getRegistrationStatus(providerReference: string): Promise<RegistrationResult> {
    return { providerReference, status: "pending" };
  }

  async getProviderCosts(): Promise<ProviderCosts> {
    return MOCK_PROVIDER_COSTS;
  }
}
