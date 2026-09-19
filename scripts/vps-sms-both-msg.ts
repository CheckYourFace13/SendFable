/** Inspect SmsMessage rows for latest BOTH cert. */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const camp = await prisma.campaign.findFirst({
    where: { channel: "BOTH", name: { startsWith: "BOTH cert" } },
    orderBy: { createdAt: "desc" },
  });
  if (!camp) {
    console.log(JSON.stringify({ error: "no_campaign" }));
    process.exit(1);
  }
  const msgs = await prisma.smsMessage.findMany({
    where: { campaignId: camp.id },
    orderBy: { createdAt: "desc" },
    select: {
      direction: true,
      status: true,
      providerMessageId: true,
      deliveredAt: true,
      createdAt: true,
      errorCode: true,
      body: true,
    },
  });
  console.log(
    JSON.stringify(
      {
        campaignIdShort: camp.id.slice(0, 8),
        messages: msgs.map((m) => ({
          direction: m.direction,
          status: m.status,
          hasProviderId: Boolean(m.providerMessageId),
          providerIdShort: m.providerMessageId?.slice(0, 10),
          deliveredAt: m.deliveredAt,
          createdAt: m.createdAt,
          errorCode: m.errorCode,
          bodyPreview: m.body.slice(0, 40),
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
