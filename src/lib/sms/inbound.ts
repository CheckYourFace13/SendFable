/**
 * Inbound SMS processing: inbox storage, STOP/HELP compliance, usage
 * accounting and business email notification.
 *
 * Idempotent: keyed on the provider event id via WebhookEvent plus the unique
 * SmsMessage.providerMessageId — a redelivered webhook changes nothing.
 *
 * Compliance behavior: STOP/HELP handling is NEVER blocked by consent state
 * or by the customer exceeding the inbound allowance. STOP/HELP segments
 * still count toward provider cost and the included allowance.
 */

import { prisma } from "@/lib/prisma";
import { applyOptOut, isHelpMessage, isStopMessage } from "@/lib/sms/consent";
import { redactPhone } from "@/lib/sms/phone";
import { billingPeriodFor, recordInboundUsage } from "@/lib/sms/usage";
import type { InboundMessageEvent } from "@/lib/sms/provider";
import { SMS_PLANS, crossedInboundThresholds, type SmsPlanKey } from "@/lib/sms/pricing";
import {
  alreadyAlertedThreshold,
  sendSmsAllowanceAlert,
  sendSmsInboundNotification,
} from "@/lib/sms/notifications";

export interface InboundProcessResult {
  outcome:
    | "processed"
    | "duplicate"
    | "unknown-number"
    | "no-subscription";
  messageId?: string;
  optOut?: boolean;
  help?: boolean;
  contactId?: string | null;
}

export async function processInboundSms(
  providerName: string,
  event: InboundMessageEvent
): Promise<InboundProcessResult> {
  // 1. Webhook-level idempotency
  const source = `sms:${providerName}`;
  const already = await prisma.webhookEvent.findUnique({
    where: { source_externalId: { source, externalId: event.eventId } },
  });
  if (already) return { outcome: "duplicate" };

  // Message-level idempotency (same message re-sent under a new event id)
  if (event.providerMessageId) {
    const existingMsg = await prisma.smsMessage.findUnique({
      where: { providerMessageId: event.providerMessageId },
    });
    if (existingMsg) {
      await recordWebhookEvent(source, event.eventId, "message.received.duplicate");
      return { outcome: "duplicate", messageId: existingMsg.id };
    }
  }

  // 2. Resolve the workspace via its dedicated number
  const number = await prisma.smsNumber.findFirst({
    where: { phoneE164: event.to, status: "ACTIVE" },
  });
  if (!number) {
    // Unknown destination — record the event so retries stay idempotent,
    // but there is no workspace to bill or notify. Log redacted only.
    await recordWebhookEvent(source, event.eventId, "message.received.unknown-number");
    console.warn(
      `[sms] inbound for unknown number ${redactPhone(event.to)} (event ${event.eventId})`
    );
    return { outcome: "unknown-number" };
  }
  const workspaceId = number.workspaceId;

  // 3. Resolve contact (may be null — unknown senders still reach the inbox)
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_phoneE164: { workspaceId, phoneE164: event.from } },
  });

  const stop = isStopMessage(event.body);
  const help = isHelpMessage(event.body);

  // 4. Store the inbox message
  const message = await prisma.smsMessage.create({
    data: {
      workspaceId,
      contactId: contact?.id ?? null,
      direction: "INBOUND",
      fromE164: event.from,
      toE164: event.to,
      body: event.body,
      encoding: event.encoding,
      segments: event.segments,
      status: "RECEIVED",
      providerMessageId: event.providerMessageId || null,
      provider: providerName,
      isOptOutKeyword: stop,
      isHelpKeyword: help,
      providerCostMicros: event.providerCostMicros ?? 0n,
      createdAt: event.occurredAt,
    },
  });

  // 5. STOP: opt out + channel suppression + audit — always, regardless of allowance
  if (stop) {
    const { nextStatus } = applyOptOut();
    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { smsStatus: nextStatus, smsOptedOutAt: new Date() },
      });
    }
    await prisma.smsSuppression.upsert({
      where: { workspaceId_phoneE164: { workspaceId, phoneE164: event.from } },
      create: { workspaceId, phoneE164: event.from, reason: "stop" },
      update: {},
    });
    await prisma.smsConsentEvent.create({
      data: {
        workspaceId,
        contactId: contact?.id ?? null,
        phoneE164: event.from,
        action: "OPT_OUT",
        source: "provider:stop",
        providerEventRef: event.eventId,
        evidence: { keyword: event.body.trim().toUpperCase().slice(0, 20) },
      },
    });
  }

  // 6. Usage accounting (counts STOP/HELP too; splits included vs. overage)
  const subscription = await prisma.smsSubscription.findUnique({ where: { workspaceId } });
  if (subscription && (subscription.status === "ACTIVE" || subscription.status === "PAST_DUE")) {
    const plan = subscription.plan as SmsPlanKey;
    const usage = await recordInboundUsage({
      workspaceId,
      plan,
      segments: event.segments,
      idempotencyKey: `in:${providerName}:${event.providerMessageId || event.eventId}`,
      messageId: message.id,
      providerMessageId: event.providerMessageId || null,
      providerCostMicros: event.providerCostMicros,
      at: event.occurredAt,
    });

    // Allowance alerts at 75% / 90% / 100% (each fires once per month)
    if (usage) {
      const included = SMS_PLANS[plan].includedInboundSegments;
      const month = billingPeriodFor(event.occurredAt);
      for (const threshold of crossedInboundThresholds(plan, usage.monthlyInboundTotal)) {
        const alerted = await alreadyAlertedThreshold(workspaceId, month, threshold);
        if (!alerted) {
          try {
            await sendSmsAllowanceAlert({
              workspaceId,
              thresholdPercent: threshold,
              usedSegments: usage.monthlyInboundTotal,
              includedSegments: included,
            });
          } catch (err) {
            console.error(`[sms] allowance alert failed for workspace ${workspaceId}`, err);
          }
        }
      }
    }
  }

  // 7. Email notification for ordinary replies (not STOP/HELP keywords)
  if (!stop && !help) {
    try {
      await sendSmsInboundNotification({
        workspaceId,
        messageId: message.id,
        fromRedacted: redactPhone(event.from),
        contactName:
          [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || null,
        preview: event.body.slice(0, 120),
      });
    } catch (err) {
      console.error(`[sms] inbound notification failed for message ${message.id}`, err);
    }
  }

  await recordWebhookEvent(source, event.eventId, "message.received");
  return {
    outcome: "processed",
    messageId: message.id,
    optOut: stop,
    help,
    contactId: contact?.id ?? null,
  };
}

async function recordWebhookEvent(source: string, externalId: string, type: string) {
  await prisma.webhookEvent.upsert({
    where: { source_externalId: { source, externalId } },
    create: { source, externalId, type },
    update: {},
  });
}
