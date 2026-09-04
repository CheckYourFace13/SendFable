/**
 * Post-send delivery attribution health — verifies SES events land on acquisition messages.
 */

import { prisma } from "@/lib/prisma";
import { alertOwnerException } from "@/lib/acquisition/notify";

const DELIVERY_GRACE_MS = 4 * 60 * 60 * 1000;

/**
 * Find SENT acquisition messages older than 4h with no delivery/bounce/complaint.
 * Alert owner once with exact AWS console path if SNS Delivery may be missing.
 */
export async function checkAcquisitionDeliveryAttribution(
  now = new Date()
): Promise<{ pending: number; alerted: boolean }> {
  const cutoff = new Date(now.getTime() - DELIVERY_GRACE_MS);
  const stuck = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      status: "SENT",
      sentAt: { lte: cutoff, not: null },
      deliveredAt: null,
      bounceAt: null,
      complaintAt: null,
      sesMessageId: { not: null },
    },
    select: { id: true, sesMessageId: true, sentAt: true },
    take: 20,
  });

  if (stuck.length === 0) return { pending: 0, alerted: false };

  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const recent = await prisma.acquisitionEvent.findFirst({
    where: { type: "delivery_events_missing_alert", createdAt: { gte: since } },
  });
  if (recent) return { pending: stuck.length, alerted: false };

  await alertOwnerException(
    "SendFable acquisition: SES Delivery events not attributing",
    `${stuck.length} acquisition message(s) remain SENT >4h with no Delivery/Bounce/Complaint.\n\nExact AWS check (one place):\nSES → Configuration sets → sendfable-events → Event destinations → confirm Event types include Delivery (and Bounce, Complaint) → SNS topic → https://sendfable.com/api/webhooks/ses\n\nAfter enabling Delivery, new Casey sends should move SENT → DELIVERED automatically.`
  );
  await prisma.acquisitionEvent.create({
    data: {
      type: "delivery_events_missing_alert",
      meta: { pending: stuck.length, sampleIds: stuck.slice(0, 5).map((m) => m.id) },
    },
  });
  return { pending: stuck.length, alerted: true };
}
