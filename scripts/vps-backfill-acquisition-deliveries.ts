/**
 * One-shot: mark acquisition messages DELIVERED when SES Delivery webhooks
 * were received but the handler crashed before attribution.
 *
 * Usage (worker): npx tsx scripts/vps-backfill-acquisition-deliveries.ts
 */
import { prisma } from "../src/lib/prisma";

/** Confirmed Delivery webhook messageIds from app logs (2026-09-04). */
const CONFIRMED_DELIVERY_IDS = [
  "010001a06c820cd7-f7c3a3b9-0794-4e33-9d9b-2fa2e53095f4-000000",
  "010001a06c820d88-88bc0feb-55f8-45fd-9bf2-34093c1cd88d-000000",
  "010001a06c820e3a-5a1f7943-36b1-438a-bace-2e7c00f7e9fe-000000",
  "010001a06c820ee8-01f8a518-4dbd-46b6-ad74-7dbcefbd2973-000000",
  "010001a06c820f8d-025ede4f-69cd-487d-9c78-867ba6e547f1-000000",
];

async function main() {
  const now = new Date();
  let updated = 0;
  for (const sesMessageId of CONFIRMED_DELIVERY_IDS) {
    const msg = await prisma.acquisitionMessage.findFirst({
      where: { sesMessageId, dryRun: false },
    });
    if (!msg) {
      console.log(JSON.stringify({ sesMessageId, result: "not_found" }));
      continue;
    }
    if (msg.status === "DELIVERED" && msg.deliveredAt) {
      console.log(JSON.stringify({ sesMessageId, result: "already_delivered", id: msg.id }));
      continue;
    }
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: { status: "DELIVERED", deliveredAt: msg.deliveredAt || now },
    });
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: msg.prospectId,
        type: "delivered",
        meta: {
          sesMessageId,
          messageId: msg.id,
          backfill: true,
          reason: "ses_delivery_webhook_confirmed_handler_crash",
        },
      },
    });
    updated++;
    console.log(
      JSON.stringify({
        sesMessageId,
        result: "backfilled_delivered",
        id: msg.id,
        previousStatus: msg.status,
      })
    );
  }
  console.log(JSON.stringify({ updated, total: CONFIRMED_DELIVERY_IDS.length }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
