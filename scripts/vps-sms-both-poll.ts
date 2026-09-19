/** Poll BOTH cert SMS for carrier DELIVERED. */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const camp = await prisma.campaign.findFirst({
    where: { channel: "BOTH", name: { startsWith: "BOTH cert" } },
    orderBy: { createdAt: "desc" },
    include: {
      smsRecipients: {
        select: {
          status: true,
          providerMessageId: true,
          sentAt: true,
          deliveredAt: true,
          error: true,
        },
      },
      recipients: {
        select: { status: true, sesMessageId: true, sentAt: true, deliveredAt: true },
      },
    },
  });
  console.log(
    JSON.stringify(
      {
        campaignIdShort: camp?.id.slice(0, 8),
        status: camp?.status,
        sentCount: camp?.sentCount,
        smsSentCount: camp?.smsSentCount,
        email: camp?.recipients,
        sms: camp?.smsRecipients.map((r) => ({
          status: r.status,
          hasProviderId: Boolean(r.providerMessageId),
          sentAt: r.sentAt,
          deliveredAt: r.deliveredAt,
          error: r.error,
        })),
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
