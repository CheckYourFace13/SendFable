/**
 * Outbound SMS: marketing campaign sends and inbox replies.
 *
 * Every send is server-side gated:
 *  - consent (SUBSCRIBED + not suppressed) for marketing,
 *  - live-provider access only via SENDFABLE_SMS_LIVE_SENDING_ENABLED
 *    (the provider registry falls back to the mock otherwise),
 *  - usage is recorded on provider ACCEPTANCE with an idempotency key so
 *    provider/worker retries never double-charge.
 */

import { prisma } from "@/lib/prisma";
import { canSendMarketingSms } from "@/lib/sms/consent";
import { assertSmsFlag } from "@/lib/sms/flags";
import { getSmsProvider } from "@/lib/sms/provider-registry";
import { recordOutboundUsage } from "@/lib/sms/usage";
import { redactPhone } from "@/lib/sms/phone";
import type { SmsPlanKey } from "@/lib/sms/pricing";
import type { DeliveryEvent } from "@/lib/sms/provider";

export interface SendMarketingSmsInput {
  workspaceId: string;
  contactId: string;
  body: string;
  campaignId?: string | null;
  /** Stable key, e.g. `camp:<campaignId>:<contactId>` — retries collapse */
  idempotencyKey: string;
}

export interface SendSmsOutcome {
  status: "sent" | "skipped" | "failed";
  reason?: string;
  messageId?: string;
  segments?: number;
}

async function activeSmsContext(workspaceId: string) {
  const [subscription, number] = await Promise.all([
    prisma.smsSubscription.findUnique({ where: { workspaceId } }),
    prisma.smsNumber.findFirst({ where: { workspaceId, status: "ACTIVE" } }),
  ]);
  if (!subscription || subscription.status !== "ACTIVE") {
    return { error: "No active SMS subscription" as const };
  }
  if (!number) return { error: "No active dedicated number" as const };
  return { subscription, number };
}

/** Marketing send to one contact (campaign recipient). */
export async function sendMarketingSms(input: SendMarketingSmsInput): Promise<SendSmsOutcome> {
  assertSmsFlag("SENDFABLE_SMS_CODE_ENABLED");

  const ctx = await activeSmsContext(input.workspaceId);
  if ("error" in ctx) return { status: "skipped", reason: ctx.error };

  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, workspaceId: input.workspaceId },
  });
  if (!contact?.phoneE164) return { status: "skipped", reason: "Contact has no phone" };

  const suppressed = !!(await prisma.smsSuppression.findUnique({
    where: {
      workspaceId_phoneE164: {
        workspaceId: input.workspaceId,
        phoneE164: contact.phoneE164,
      },
    },
  }));
  const decision = canSendMarketingSms(contact.smsStatus, suppressed);
  if (!decision.allowed) return { status: "skipped", reason: decision.reason };

  return dispatchSms({
    workspaceId: input.workspaceId,
    plan: ctx.subscription.plan as SmsPlanKey,
    from: ctx.number.phoneE164,
    to: contact.phoneE164,
    contactId: contact.id,
    body: input.body,
    campaignId: input.campaignId ?? null,
    idempotencyKey: input.idempotencyKey,
  });
}

export interface SendReplySmsInput {
  workspaceId: string;
  contactId: string;
  body: string;
  idempotencyKey: string;
}

/**
 * Inbox reply from the business. Billed at the plan outbound rate. Replies
 * require the reply flag; STOP suppression still blocks marketing but a
 * business may answer an open conversation unless the contact opted out.
 */
export async function sendReplySms(input: SendReplySmsInput): Promise<SendSmsOutcome> {
  assertSmsFlag("SENDFABLE_SMS_CODE_ENABLED");
  assertSmsFlag("SENDFABLE_SMS_REPLY_ENABLED");

  const ctx = await activeSmsContext(input.workspaceId);
  if ("error" in ctx) return { status: "skipped", reason: ctx.error };

  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, workspaceId: input.workspaceId },
  });
  if (!contact?.phoneE164) return { status: "skipped", reason: "Contact has no phone" };
  if (contact.smsStatus === "OPTED_OUT" || contact.smsStatus === "BLOCKED") {
    return { status: "skipped", reason: "Contact has opted out of texts" };
  }

  return dispatchSms({
    workspaceId: input.workspaceId,
    plan: ctx.subscription.plan as SmsPlanKey,
    from: ctx.number.phoneE164,
    to: contact.phoneE164,
    contactId: contact.id,
    body: input.body,
    campaignId: null,
    idempotencyKey: input.idempotencyKey,
  });
}

interface DispatchInput {
  workspaceId: string;
  plan: SmsPlanKey;
  from: string;
  to: string;
  contactId: string | null;
  body: string;
  campaignId: string | null;
  idempotencyKey: string;
}

async function dispatchSms(input: DispatchInput): Promise<SendSmsOutcome> {
  const provider = getSmsProvider();

  // Idempotency: if a message for this key already exists, do not resend.
  const priorLedger = await prisma.smsUsageLedger.findUnique({
    where: { idempotencyKey: `out:${input.idempotencyKey}` },
  });
  if (priorLedger) {
    return { status: "sent", reason: "duplicate (already sent)", segments: priorLedger.segments };
  }

  const result = await provider.sendMessage({
    workspaceId: input.workspaceId,
    from: input.from,
    to: input.to,
    body: input.body,
    idempotencyKey: input.idempotencyKey,
    campaignId: input.campaignId,
  });

  const message = await prisma.smsMessage.upsert({
    where: { providerMessageId: result.providerMessageId },
    create: {
      workspaceId: input.workspaceId,
      contactId: input.contactId,
      campaignId: input.campaignId,
      direction: "OUTBOUND",
      fromE164: input.from,
      toE164: input.to,
      body: input.body,
      encoding: result.encoding,
      segments: result.segments,
      status: result.status === "accepted" ? "ACCEPTED" : "FAILED",
      providerMessageId: result.providerMessageId,
      provider: provider.name,
      errorCode: result.errorCode ?? null,
      customerChargeMicros: 0n,
      providerCostMicros: result.providerCostMicros,
      acceptedAt: result.status === "accepted" ? new Date() : null,
      failedAt: result.status === "failed" ? new Date() : null,
    },
    update: {},
  });

  if (result.status === "failed") {
    console.warn(
      `[sms] send failed to ${redactPhone(input.to)} (${result.errorCode ?? "unknown"})`
    );
    return { status: "failed", reason: result.errorCode, messageId: message.id };
  }

  // Billed on acceptance (see docs/SMS_BILLING_ARCHITECTURE.md)
  await recordOutboundUsage({
    workspaceId: input.workspaceId,
    plan: input.plan,
    segments: result.segments,
    idempotencyKey: `out:${input.idempotencyKey}`,
    campaignId: input.campaignId,
    messageId: message.id,
    providerMessageId: result.providerMessageId,
    providerCostMicros: result.providerCostMicros,
  });

  return { status: "sent", messageId: message.id, segments: result.segments };
}

// ─── Delivery events ──────────────────────────────────────────────────────────

export interface DeliveryProcessResult {
  outcome: "processed" | "duplicate" | "unknown-message";
}

export async function processDeliveryEvent(
  providerName: string,
  event: DeliveryEvent
): Promise<DeliveryProcessResult> {
  const source = `sms:${providerName}`;
  try {
    await prisma.webhookEvent.create({
      data: { source, externalId: event.eventId, type: `delivery.${event.status}` },
    });
  } catch {
    return { outcome: "duplicate" };
  }

  const message = await prisma.smsMessage.findUnique({
    where: { providerMessageId: event.providerMessageId },
  });
  if (!message) return { outcome: "unknown-message" };

  await prisma.smsMessage.update({
    where: { id: message.id },
    data: {
      status: event.status === "delivered" ? "DELIVERED" : event.status === "failed" ? "FAILED" : "SENT",
      deliveredAt: event.status === "delivered" ? event.occurredAt : message.deliveredAt,
      failedAt: event.status === "failed" ? event.occurredAt : message.failedAt,
      errorCode: event.errorCode ?? message.errorCode,
      // Reconcile actual provider cost when reported
      ...(event.providerCostMicros !== undefined
        ? { providerCostMicros: event.providerCostMicros }
        : {}),
    },
  });

  if (message.campaignId) {
    await prisma.campaign.update({
      where: { id: message.campaignId },
      data:
        event.status === "delivered"
          ? { smsDeliveredCount: { increment: 1 } }
          : event.status === "failed"
            ? { smsFailedCount: { increment: 1 } }
            : {},
    });
    if (event.providerMessageId) {
      await prisma.smsRecipient.updateMany({
        where: { providerMessageId: event.providerMessageId },
        data:
          event.status === "delivered"
            ? { deliveredAt: event.occurredAt }
            : event.status === "failed"
              ? { failedAt: event.occurredAt, status: "FAILED", error: event.errorCode ?? "delivery failed" }
              : {},
      });
    }
  }

  return { outcome: "processed" };
}
