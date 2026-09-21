/**
 * Post-send delivery attribution health — verifies SES events land on acquisition messages.
 *
 * Root-cause class for perpetual SENT orphans (e.g. Black Horse 2026-09-16):
 * SES accepted the send; same-minute peers DELIVERED; this recipient never got a
 * Delivery/Bounce/Complaint event. Re-alerting forever with "check SES config"
 * is misleading once the watch window has elapsed — attribution is healthy for
 * new Casey sends; one mailbox simply never terminalized.
 */

import { prisma } from "@/lib/prisma";
import { alertOwnerException } from "@/lib/acquisition/notify";

const DELIVERY_GRACE_MS = 4 * 60 * 60 * 1000;
/** Stop treating a SENT row as an active attribution outage after this age. */
const ATTRIBUTION_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Only watch Casey sends after the SES attribution fix (97766b1) / Sep 4 2026 window.
 * Historical SENT rows from before tagging/normalization are ignored.
 */
const ATTRIBUTION_WATCH_FROM = new Date("2026-09-04T14:00:00.000Z"); // Fri 9am America/Chicago

const STALE_EVENT = "delivery_attribution_stale_excluded";
const ALERT_EVENT = "delivery_events_missing_alert";

/** Pure window used by the stuck-message query (exported for unit tests). */
export function attributionAlertWindow(now = new Date()): {
  /** sentAt must be <= this (older than grace) */
  olderThanOrEqual: Date;
  /** sentAt must be >= this (not older than max age, and not before watch-from) */
  newerThanOrEqual: Date;
} {
  const olderThanOrEqual = new Date(now.getTime() - DELIVERY_GRACE_MS);
  const maxAgeFloor = new Date(now.getTime() - ATTRIBUTION_MAX_AGE_MS);
  const newerThanOrEqual =
    maxAgeFloor > ATTRIBUTION_WATCH_FROM ? maxAgeFloor : ATTRIBUTION_WATCH_FROM;
  return { olderThanOrEqual, newerThanOrEqual };
}

/**
 * One-time record for SENT orphans past max age — explains the row without
 * fabricating DELIVERED. Idempotent per message id.
 */
export async function recordStaleAttributionOrphans(
  now = new Date()
): Promise<{ recorded: number; ids: string[] }> {
  const staleBefore = new Date(now.getTime() - ATTRIBUTION_MAX_AGE_MS);
  const orphans = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      status: "SENT",
      sentAt: {
        not: null,
        lte: staleBefore,
        gte: ATTRIBUTION_WATCH_FROM,
      },
      deliveredAt: null,
      bounceAt: null,
      complaintAt: null,
      sesMessageId: { not: null },
    },
    select: { id: true, sesMessageId: true, sentAt: true },
    take: 50,
  });

  const ids: string[] = [];
  for (const m of orphans) {
    const existing = await prisma.acquisitionEvent.findFirst({
      where: {
        type: STALE_EVENT,
        meta: { path: ["messageId"], equals: m.id },
      },
    });
    if (existing) continue;
    await prisma.acquisitionEvent.create({
      data: {
        type: STALE_EVENT,
        meta: {
          messageId: m.id,
          sesMessageId: m.sesMessageId,
          sentAt: m.sentAt?.toISOString() ?? null,
          reason:
            "No Delivery/Bounce/Complaint within attribution max age. SES accepted the send; peers from the same batch often DELIVERED. Leaving status SENT (not fabricated). Excluded from further >4h attribution alerts.",
          maxAgeHours: ATTRIBUTION_MAX_AGE_MS / 3600000,
        },
      },
    });
    ids.push(m.id);
  }
  return { recorded: ids.length, ids };
}

/**
 * Find SENT acquisition messages in the active alert window (4h–48h) with no
 * delivery/bounce/complaint. Alert owner at most once per ~20h if any remain.
 * Past-max-age orphans are recorded once via recordStaleAttributionOrphans and
 * no longer drive SES-config-style alerts.
 */
export async function checkAcquisitionDeliveryAttribution(
  now = new Date()
): Promise<{ pending: number; alerted: boolean; staleRecorded: number }> {
  const stale = await recordStaleAttributionOrphans(now);

  const { olderThanOrEqual, newerThanOrEqual } = attributionAlertWindow(now);
  // Empty window (watch-from in the future, etc.)
  if (newerThanOrEqual > olderThanOrEqual) {
    return { pending: 0, alerted: false, staleRecorded: stale.recorded };
  }

  const stuck = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      status: "SENT",
      sentAt: {
        lte: olderThanOrEqual,
        gte: newerThanOrEqual,
        not: null,
      },
      deliveredAt: null,
      bounceAt: null,
      complaintAt: null,
      sesMessageId: { not: null },
    },
    select: { id: true, sesMessageId: true, sentAt: true },
    take: 20,
  });

  if (stuck.length === 0) {
    return { pending: 0, alerted: false, staleRecorded: stale.recorded };
  }

  const since = new Date(Date.now() - 20 * 60 * 60_000);
  const recent = await prisma.acquisitionEvent.findFirst({
    where: { type: ALERT_EVENT, createdAt: { gte: since } },
  });
  if (recent) {
    return { pending: stuck.length, alerted: false, staleRecorded: stale.recorded };
  }

  await alertOwnerException(
    "SendFable acquisition: SES Delivery events not attributing",
    `${stuck.length} acquisition message(s) remain SENT >4h (and <48h) with no Delivery/Bounce/Complaint.\n\nThis alert only covers recent sends. Older perpetual SENT orphans are recorded as ${STALE_EVENT} and do not keep firing.\n\nIf many recent peers also fail: SES → Configuration sets → sendfable-events → Event destinations → Delivery / Bounce / Complaint → SNS → https://sendfable.com/api/webhooks/ses\n\nIf only one recipient is stuck while peers DELIVER: likely no terminal SES event for that mailbox (not a global destination outage).`
  );
  await prisma.acquisitionEvent.create({
    data: {
      type: ALERT_EVENT,
      meta: {
        pending: stuck.length,
        sampleIds: stuck.slice(0, 5).map((m) => m.id),
        windowHours: { min: 4, max: 48 },
      },
    },
  });
  return { pending: stuck.length, alerted: true, staleRecorded: stale.recorded };
}

export const ACQUISITION_ATTRIBUTION_CONSTANTS = {
  DELIVERY_GRACE_MS,
  ATTRIBUTION_MAX_AGE_MS,
  ATTRIBUTION_WATCH_FROM,
  STALE_EVENT,
  ALERT_EVENT,
} as const;
