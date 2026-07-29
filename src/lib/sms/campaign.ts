/**
 * SMS side of campaigns (channel = SMS or BOTH).
 *
 * The email pipeline is untouched: SMS recipients snapshot into their own
 * SmsRecipient table and send through the SmsProvider abstraction. Every
 * recipient's message is rendered individually before segment counting,
 * because merge fields change message length.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSegmentRules, resolveSegmentContactIds } from "@/lib/segments";
import { contactMergeData, type MergeData } from "@/lib/merge";
import { calculateSegments } from "@/lib/sms/segments";
import { outboundChargeMicros, SMS_PLANS, type SmsPlanKey } from "@/lib/sms/pricing";
import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";
import { assertSmsFlag } from "@/lib/sms/flags";
import { sendMarketingSms } from "@/lib/sms/send";
import type { AudienceSelector } from "@/lib/audience";

const SMS_TAG_RE = /\{\{\s*([a-zA-Z0-9_.]+)(?:\s*\|\s*([^}]*))?\s*\}\}/g;

/** Merge-tag rendering for SMS: same syntax as email, NO HTML escaping. */
export function renderSmsMergeTags(template: string, data: MergeData): string {
  return template.replace(SMS_TAG_RE, (_m, key: string, fallback?: string) => {
    const raw = data[key] ?? data[key.toLowerCase()];
    if (raw !== undefined && raw !== null && String(raw).length > 0) return String(raw);
    return fallback !== undefined ? fallback.trim() : "";
  });
}

export interface SmsAudienceContact {
  id: string;
  phoneE164: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  customFields: unknown;
}

/**
 * Resolve SMS-reachable contacts: phone present, smsStatus SUBSCRIBED, and
 * not in the workspace's SMS suppression list. Entirely independent of the
 * email status/suppression path.
 */
export async function resolveSmsAudienceContacts(
  workspaceId: string,
  audience: AudienceSelector
): Promise<SmsAudienceContact[]> {
  let contactIds: string[] | null = null;

  if (audience.audienceType === "tags") {
    const tagIds = audience.audienceTagIds ?? [];
    if (!tagIds.length) return [];
    const rows = await prisma.contactTag.findMany({
      where: { tagId: { in: tagIds }, contact: { workspaceId } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    contactIds = rows.map((r) => r.contactId);
  } else if (audience.audienceType === "segment") {
    if (!audience.audienceSegmentId) return [];
    const segment = await prisma.segment.findFirst({
      where: { id: audience.audienceSegmentId, workspaceId },
    });
    if (!segment) return [];
    contactIds = await resolveSegmentContactIds(workspaceId, parseSegmentRules(segment.rules), {
      subscribedOnly: false,
    });
  }

  const where: Prisma.ContactWhereInput = {
    workspaceId,
    smsStatus: "SUBSCRIBED",
    phoneE164: { not: null },
    ...(contactIds ? { id: { in: contactIds } } : {}),
  };

  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      phoneE164: true,
      firstName: true,
      lastName: true,
      email: true,
      customFields: true,
    },
  });
  if (!contacts.length) return [];

  const numbers = contacts.map((c) => c.phoneE164!).filter(Boolean);
  const suppressed = await prisma.smsSuppression.findMany({
    where: { workspaceId, phoneE164: { in: numbers } },
    select: { phoneE164: true },
  });
  const suppressedSet = new Set(suppressed.map((s) => s.phoneE164));

  return contacts
    .filter((c) => c.phoneE164 && !suppressedSet.has(c.phoneE164))
    .map((c) => ({ ...c, phoneE164: c.phoneE164! }));
}

export interface SmsCampaignEstimate {
  recipientCount: number;
  totalSegments: number;
  maxSegmentsPerRecipient: number;
  anyUcs2: boolean;
  perSegmentPriceMicros: number;
  estimatedChargeMicros: bigint;
  estimatedProviderCostMicros: bigint;
}

/** Render per recipient and estimate segments + customer charge + provider cost. */
export async function estimateSmsCampaign(
  workspaceId: string,
  plan: SmsPlanKey,
  smsBody: string,
  audience: AudienceSelector
): Promise<SmsCampaignEstimate> {
  const contacts = await resolveSmsAudienceContacts(workspaceId, audience);
  let totalSegments = 0;
  let maxSegments = 0;
  let anyUcs2 = false;

  for (const contact of contacts) {
    const rendered = renderSmsMergeTags(
      smsBody,
      contactMergeData({ ...contact, email: contact.email ?? "" })
    );
    const info = calculateSegments(rendered);
    totalSegments += info.segments;
    if (info.segments > maxSegments) maxSegments = info.segments;
    if (info.encoding === "UCS-2") anyUcs2 = true;
  }

  return {
    recipientCount: contacts.length,
    totalSegments,
    maxSegmentsPerRecipient: maxSegments,
    anyUcs2,
    perSegmentPriceMicros: SMS_PLANS[plan].outboundSegmentPriceMicros,
    estimatedChargeMicros: outboundChargeMicros(plan, totalSegments),
    estimatedProviderCostMicros:
      BigInt(totalSegments) * MOCK_PROVIDER_COSTS.outboundPerSegmentMicros,
  };
}

/**
 * Launch the SMS leg of a campaign: snapshot recipients with rendered bodies,
 * then dispatch through the provider abstraction. Each recipient send uses a
 * stable idempotency key so relaunch/retry never texts anyone twice.
 */
export async function launchSmsCampaign(campaignId: string): Promise<{ recipientCount: number }> {
  assertSmsFlag("SENDFABLE_SMS_CODE_ENABLED");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { workspace: true },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.channel === "EMAIL") throw new Error("Campaign has no SMS leg");
  if (!campaign.smsBody?.trim()) throw new Error("Text message body required");

  const subscription = await prisma.smsSubscription.findUnique({
    where: { workspaceId: campaign.workspaceId },
  });
  if (!subscription || subscription.status !== "ACTIVE") {
    throw new Error("An active SMS subscription is required to send texts");
  }

  const contacts = await resolveSmsAudienceContacts(campaign.workspaceId, {
    audienceType: campaign.audienceType as "all" | "tags" | "segment",
    audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
    audienceSegmentId: campaign.audienceSegmentId,
  });
  if (!contacts.length) throw new Error("SMS audience is empty after consent and suppression");

  // Snapshot with individually rendered bodies + segment counts
  for (const contact of contacts) {
    const mergeData = contactMergeData({ ...contact, email: contact.email ?? "" });
    const rendered = renderSmsMergeTags(campaign.smsBody, mergeData);
    const info = calculateSegments(rendered);
    await prisma.smsRecipient.upsert({
      where: { campaignId_contactId: { campaignId, contactId: contact.id } },
      create: {
        campaignId,
        contactId: contact.id,
        phoneE164: contact.phoneE164,
        mergeData: mergeData as Prisma.InputJsonValue,
        renderedBody: rendered,
        encoding: info.encoding,
        segments: info.segments,
        status: "PENDING",
      },
      update: {},
    });
  }

  const pending = await prisma.smsRecipient.findMany({
    where: { campaignId, status: "PENDING" },
  });

  let sent = 0;
  for (const recipient of pending) {
    const outcome = await sendMarketingSms({
      workspaceId: campaign.workspaceId,
      contactId: recipient.contactId,
      body: recipient.renderedBody ?? campaign.smsBody,
      campaignId,
      idempotencyKey: `camp:${campaignId}:${recipient.contactId}`,
    });
    await prisma.smsRecipient.update({
      where: { id: recipient.id },
      data:
        outcome.status === "sent"
          ? { status: "SENT", sentAt: new Date(), providerMessageId: outcome.messageId ? undefined : undefined }
          : outcome.status === "failed"
            ? { status: "FAILED", error: outcome.reason ?? "send failed", failedAt: new Date() }
            : { status: "SKIPPED", error: outcome.reason ?? "skipped" },
    });
    if (outcome.status === "sent") sent += 1;
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { smsSentCount: { increment: sent } },
  });

  return { recipientCount: pending.length };
}
