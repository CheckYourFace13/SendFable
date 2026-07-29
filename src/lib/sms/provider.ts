/**
 * SmsProvider abstraction — lets SendFable swap/add SMS providers (Telnyx
 * first, others later) without rebuilding the product.
 *
 * Phase 1 scope: plain SMS, US destinations, registered US local 10DLC
 * numbers. No MMS, no international.
 */

export type SmsProviderName = "mock" | "telnyx";

export interface SmsEstimate {
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  /** Estimated provider cost, micros (assumption until reconciliation) */
  estimatedProviderCostMicros: bigint;
}

export interface OutboundSmsRequest {
  workspaceId: string;
  /** Dedicated workspace number, E.164 */
  from: string;
  /** Destination, E.164 (US only in phase 1) */
  to: string;
  body: string;
  /** Ledger/provider idempotency key — retries must not double-send */
  idempotencyKey: string;
  campaignId?: string | null;
  messageId?: string | null;
}

export interface OutboundSmsResult {
  providerMessageId: string;
  status: "accepted" | "failed";
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  errorCode?: string;
  providerCostMicros: bigint;
}

export interface SmsWebhookValidation {
  valid: boolean;
  reason?: string;
}

export interface DeliveryEvent {
  providerMessageId: string;
  status: "sent" | "delivered" | "failed";
  errorCode?: string;
  /** Actual provider cost when the provider reports it, micros */
  providerCostMicros?: bigint;
  occurredAt: Date;
  /** Provider event id for idempotency */
  eventId: string;
}

export interface InboundMessageEvent {
  providerMessageId: string;
  from: string; // sender (customer) E.164
  to: string; // workspace dedicated number E.164
  body: string;
  segments: number;
  encoding: "GSM-7" | "UCS-2";
  occurredAt: Date;
  eventId: string;
  providerCostMicros?: bigint;
}

export interface NumberRequest {
  workspaceId: string;
  areaCode?: string;
  /** US local 10DLC only in phase 1 */
  numberType: "us-local";
}

export interface NumberResult {
  phoneE164: string;
  providerNumberId: string;
  monthlyCostMicros: bigint;
}

export interface RegistrationRequest {
  workspaceId: string;
  kind: "brand" | "campaign";
  /** Provider-specific payload assembled by the registration workflow */
  payload: Record<string, unknown>;
}

export interface RegistrationResult {
  providerReference: string;
  status: "submitted" | "pending" | "approved" | "rejected";
}

export interface ProviderCosts {
  outboundPerSegmentMicros: bigint;
  inboundPerSegmentMicros: bigint;
  numberMonthlyMicros: bigint;
  /** One-time registration/campaign fees the provider charges, micros */
  registrationOneTimeMicros: bigint;
  campaignMonthlyMicros: bigint;
  source: "assumption" | "reconciled";
}

export interface SmsProvider {
  readonly name: SmsProviderName;

  /** Pure estimation — never contacts the provider. */
  estimateMessage(body: string): SmsEstimate;

  /** Send one plain SMS. Live providers must be feature-flag gated. */
  sendMessage(req: OutboundSmsRequest): Promise<OutboundSmsResult>;

  /** Verify webhook authenticity (signature/timestamp). */
  validateWebhook(rawBody: string, headers: Record<string, string | null>): SmsWebhookValidation;

  /** Parse a validated webhook payload into a delivery event, if it is one. */
  handleDeliveryEvent(payload: unknown): DeliveryEvent | null;

  /** Parse a validated webhook payload into an inbound message, if it is one. */
  handleInboundMessage(payload: unknown): InboundMessageEvent | null;

  requestNumber(req: NumberRequest): Promise<NumberResult>;
  releaseNumber(providerNumberId: string): Promise<void>;

  submitRegistration(req: RegistrationRequest): Promise<RegistrationResult>;
  getRegistrationStatus(providerReference: string): Promise<RegistrationResult>;

  /** Current provider cost data (assumption until reconciliation exists). */
  getProviderCosts(): Promise<ProviderCosts>;
}
