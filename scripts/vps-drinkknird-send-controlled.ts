/**
 * Send exactly one controlled DrinkKnird EMAIL to the platform owner contact.
 * Uses normal campaign compile + send path (Free badge, unsubscribe, rewrite From).
 */
import { prisma } from "../src/lib/prisma";
import { launchCampaign } from "../src/lib/campaign-send";

async function main() {
  const ownerEmail = (
    process.env.PLATFORM_OWNER_EMAIL ||
    process.env.OWNER_ALERT_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!ownerEmail) throw new Error("owner email env missing");

  const ws = await prisma.workspace.findFirst({
    where: { isInternal: true, name: "DrinkKnird" },
  });
  if (!ws) throw new Error("DrinkKnird missing");

  const contact = await prisma.contact.findFirst({
    where: { workspaceId: ws.id, email: ownerEmail, status: "SUBSCRIBED" },
  });
  if (!contact) throw new Error("Owner contact missing — run controlled form test first");

  const identity = await prisma.senderIdentity.findFirst({
    where: { workspaceId: ws.id, status: "VERIFIED" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!identity) throw new Error("Verified sender identity missing");

  if (!ws.mailingAddress?.trim()) {
    throw new Error("DrinkKnird mailingAddress required for CAN-SPAM — set on workspace first");
  }

  // Minimal designJson so send path compiles with Free SendFable badge + unsubscribe.
  const designJson = {
    version: 1 as const,
    blocks: [
      {
        id: "body",
        type: "text" as const,
        props: {
          html: "<p>This is a controlled DrinkKnird send from SendFable.</p><p>If you can read this, the DrinkKnird Free workspace path (identity, footer, unsubscribe) is live.</p><p>— DrinkKnird</p>",
        },
      },
    ],
  };

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ws.id,
      name: `DrinkKnird controlled ${new Date().toISOString().slice(0, 16)}`,
      subject: "DrinkKnird controlled test",
      previewText: "One controlled owner-only send",
      status: "DRAFT",
      channel: "EMAIL",
      audienceType: "all",
      senderIdentityId: identity.id,
      designJson,
      goal: "announce",
    },
  });

  // Limit audience to the owner contact only via temporary tag.
  const tag = await prisma.tag.upsert({
    where: {
      workspaceId_name: { workspaceId: ws.id, name: "Controlled Test Only" },
    },
    create: { workspaceId: ws.id, name: "Controlled Test Only", color: "#991B1B" },
    update: {},
  });
  await prisma.contactTag.deleteMany({ where: { tagId: tag.id } });
  await prisma.contactTag.create({
    data: { contactId: contact.id, tagId: tag.id },
  });
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      audienceType: "tags",
      audienceTagIds: [tag.id],
    },
  });

  const result = await launchCampaign(campaign.id);
  console.log(
    JSON.stringify(
      {
        campaignId: campaign.id,
        launch: result,
        to: ownerEmail,
        displayName: identity.displayName,
        replyTo: identity.value,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
