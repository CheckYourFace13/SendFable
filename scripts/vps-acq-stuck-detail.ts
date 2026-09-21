/**
 * Detail dump for the stuck acquisition message + siblings.
 * Run inside sendfable-worker on VPS.
 */
import { prisma } from "../src/lib/prisma";

const STUCK_ID = "cmtmg0kdq00c9uv6sbu7sijtu";
const SES_ID = "010001a0aa4decac-b8ecfc01-d7e2-442b-956d-1a21a781d35f-000000";

async function main() {
  const m = await prisma.acquisitionMessage.findUnique({
    where: { id: STUCK_ID },
    include: { prospect: true },
  });
  if (!m) {
    console.log(JSON.stringify({ error: "not_found", STUCK_ID }));
    return;
  }

  const events = await prisma.acquisitionEvent.findMany({
    where: { prospectId: m.prospectId },
    orderBy: { createdAt: "asc" },
  });

  const siblings = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      sentAt: {
        gte: new Date("2026-09-16T13:00:00.000Z"),
        lte: new Date("2026-09-16T13:01:00.000Z"),
      },
    },
    select: {
      id: true,
      status: true,
      sesMessageId: true,
      sentAt: true,
      deliveredAt: true,
      bounceAt: true,
      complaintAt: true,
      prospect: { select: { contactEmail: true, businessName: true } },
    },
    orderBy: { sentAt: "asc" },
  });

  // WebhookEvent schema may not have payload filter — sample recent SES events around send time
  const webhookAround = await prisma.webhookEvent.findMany({
    where: {
      source: { contains: "ses" },
      processedAt: {
        gte: new Date("2026-09-16T12:55:00.000Z"),
        lte: new Date("2026-09-16T14:00:00.000Z"),
      },
    },
    take: 50,
    orderBy: { processedAt: "asc" },
    select: {
      id: true,
      source: true,
      type: true,
      externalId: true,
      processedAt: true,
    },
  });

  const matchingExternal = webhookAround.filter(
    (w) =>
      (w.externalId || "").includes("010001a0aa4decac") ||
      (w.externalId || "") === SES_ID,
  );

  const alerts = await prisma.acquisitionEvent.findMany({
    where: { type: "delivery_events_missing_alert" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, createdAt: true, meta: true },
  });

  const ageHours = m.sentAt
    ? (Date.now() - m.sentAt.getTime()) / 3600000
    : null;

  // Status distribution last 14d
  const recent = await prisma.acquisitionMessage.groupBy({
    by: ["status"],
    where: {
      dryRun: false,
      sentAt: { gte: new Date(Date.now() - 14 * 24 * 3600_000) },
    },
    _count: true,
  });

  const stillStuck = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      status: "SENT",
      sentAt: { not: null, lte: new Date(Date.now() - 4 * 3600_000) },
      deliveredAt: null,
      bounceAt: null,
      complaintAt: null,
      sesMessageId: { not: null },
    },
  });

  console.log(
    JSON.stringify(
      {
        stuck: {
          id: m.id,
          status: m.status,
          sesMessageId: m.sesMessageId,
          sentAt: m.sentAt,
          deliveredAt: m.deliveredAt,
          bounceAt: m.bounceAt,
          complaintAt: m.complaintAt,
          ageHours,
          prospect: {
            id: m.prospect.id,
            email: m.prospect.contactEmail,
            business: m.prospect.businessName,
            status: m.prospect.status,
          },
        },
        eventTypes: events.map((e) => ({
          type: e.type,
          at: e.createdAt,
        })),
        siblingsSameMinute: siblings.map((s) => ({
          id: s.id,
          status: s.status,
          email: s.prospect.contactEmail,
          deliveredAt: s.deliveredAt,
          sesShort: (s.sesMessageId || "").slice(0, 24),
        })),
        webhookAroundSendCount: webhookAround.length,
        webhookMatchingSesId: matchingExternal,
        webhookSampleExternalIds: webhookAround.slice(0, 15).map((w) => ({
          type: w.type,
          externalId: w.externalId,
          at: w.processedAt,
        })),
        recentAlerts: alerts,
        status14d: recent,
        stillStuckCount: stillStuck,
        rootCauseHypothesis:
          "G+H: One recipient never received a terminal SES Delivery/Bounce/Complaint event (or it never reached us). Same-minute peers DELIVERED proves config/webhook/normalization work. Alert correctly re-fires every ~20h on this perpetual SENT orphan — not a systemic SES outage.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
