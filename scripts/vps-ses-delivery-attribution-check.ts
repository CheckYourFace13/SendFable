/**
 * Focused SES delivery attribution check for Casey acquisition sends (today Chicago).
 * Run inside worker: npx tsx scripts/vps-ses-delivery-attribution-check.ts
 */
import { prisma } from "../src/lib/prisma";

function chicagoYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

/** Start/end UTC for America/Chicago calendar day containing `now`. */
function chicagoDayBounds(now = new Date()) {
  const day = chicagoYmd(now);
  // Walk back/forward from now by minutes to find day edges (precise enough)
  let start = new Date(now);
  while (chicagoYmd(new Date(start.getTime() - 60_000)) === day) {
    start = new Date(start.getTime() - 60_000);
  }
  // snap to second at day start
  while (chicagoYmd(new Date(start.getTime() - 1000)) === day) {
    start = new Date(start.getTime() - 1000);
  }
  const end = new Date(start.getTime() + 24 * 3600_000);
  return { start, end, day };
}

async function main() {
  const { start, end, day } = chicagoDayBounds();
  const msgs = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      sentAt: { gte: start, lt: end },
    },
    include: {
      prospect: {
        select: {
          id: true,
          businessName: true,
          domain: true,
          contactEmail: true,
        },
      },
    },
    orderBy: { sentAt: "asc" },
  });

  const rows = [];
  for (const m of msgs) {
    const events = await prisma.acquisitionEvent.findMany({
      where: {
        prospectId: m.prospectId,
        type: { in: ["ses_accepted", "delivered", "bounced", "complained", "sent"] },
        createdAt: {
          gte: new Date(start.getTime() - 3600_000),
          lt: new Date(end.getTime() + 3600_000),
        },
      },
      orderBy: { createdAt: "asc" },
      select: { type: true, meta: true, createdAt: true },
    });

    const metaMatchesMsg = (e: { meta: unknown }) => {
      const meta = e.meta as { messageId?: string; sesMessageId?: string } | null;
      if (!meta) return false;
      if (meta.messageId === m.id) return true;
      if (m.sesMessageId && meta.sesMessageId === m.sesMessageId) return true;
      return false;
    };

    const sesAccepted =
      events.some((e) => e.type === "ses_accepted" && metaMatchesMsg(e)) ||
      events.some((e) => e.type === "ses_accepted") ||
      Boolean(m.sesMessageId);

    const deliveredEvent = events.some((e) => e.type === "delivered");
    const bouncedEvent = events.some((e) => e.type === "bounced");
    const complaintEvent = events.some((e) => e.type === "complained");

    rows.push({
      messageId: m.id,
      prospect: m.prospect.businessName || m.prospect.domain,
      domain: m.prospect.domain,
      email: m.prospect.contactEmail,
      step: m.step,
      sesMessageId: m.sesMessageId,
      sentAt: m.sentAt?.toISOString() || null,
      sentAtChicago: m.sentAt
        ? m.sentAt.toLocaleString("en-US", { timeZone: "America/Chicago" })
        : null,
      status: m.status,
      deliveredAt: m.deliveredAt?.toISOString() || null,
      bounceAt: m.bounceAt?.toISOString() || null,
      complaintAt: m.complaintAt?.toISOString() || null,
      sesAccepted,
      deliveryEventArrived: Boolean(m.deliveredAt) || deliveredEvent,
      webhookMatchedAcquisition:
        Boolean(m.deliveredAt) ||
        Boolean(m.bounceAt) ||
        Boolean(m.complaintAt) ||
        deliveredEvent ||
        bouncedEvent ||
        complaintEvent,
      events: events.map((e) => ({
        type: e.type,
        at: e.createdAt.toISOString(),
        meta: e.meta,
      })),
    });
  }

  const webhookCount = await prisma.webhookEvent.count({
    where: {
      source: "sns",
      type: "ses",
      processedAt: { gte: start, lt: end },
    },
  });

  console.log(
    JSON.stringify(
      {
        dayChicago: day,
        window: { start: start.toISOString(), end: end.toISOString() },
        summary: {
          sentToday: msgs.length,
          sesAccepted: rows.filter((r) => r.sesAccepted).length,
          delivered: rows.filter((r) => r.status === "DELIVERED" || r.deliveredAt).length,
          bounced: rows.filter((r) => r.status === "BOUNCED" || r.bounceAt).length,
          complaints: rows.filter((r) => r.status === "COMPLAINED" || r.complaintAt).length,
          stillSent: rows.filter((r) => r.status === "SENT" && !r.deliveredAt).length,
          snsWebhookEventsToday: webhookCount,
        },
        messages: rows,
        configSetEnv: process.env.SES_CONFIGURATION_SET || null,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
