/**
 * One-shot owner-workspace campaign send for SES pipeline verification.
 * Requires: SES_CONTROLLED_TEST_ENABLED=true AND CAMPAIGN_SEND_ENABLED=true
 * Recipient: chris@iscreamstudio.com only.
 *
 * Usage (worker container):
 *   npx tsx scripts/ses-controlled-campaign-test.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  assertCampaignSendEnabled,
  assertSesControlledTestEnabled,
} from "../src/lib/campaign-send-gate";
import { launchCampaign, sendOneRecipient } from "../src/lib/campaign-send";
import { createEmptyDesign } from "../src/lib/email-compiler";
import { isDevMailMode } from "../src/lib/mailer";

const OWNER_TO = "chris@iscreamstudio.com";
const TAG_NAME = "ses-controlled-test-2026-07-29";

async function main() {
  assertSesControlledTestEnabled();
  assertCampaignSendEnabled();
  if (isDevMailMode()) throw new Error("SES credentials missing");

  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL || OWNER_TO).toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { workspace: true },
        take: 1,
      },
    },
  });
  if (!user?.memberships[0]) throw new Error(`Owner user/workspace not found for ${ownerEmail}`);
  const workspace = user.memberships[0].workspace;
  if (!workspace.mailingAddress?.trim()) {
    throw new Error("Workspace mailing address required");
  }

  const sender =
    (await prisma.senderIdentity.findFirst({
      where: { workspaceId: workspace.id, status: "VERIFIED" },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.senderIdentity.create({
      data: {
        workspaceId: workspace.id,
        type: "ADDRESS",
        value: OWNER_TO.toLowerCase(),
        displayName: "SendFable Controlled Test",
        status: "VERIFIED",
        verifiedAt: new Date(),
        isDefault: true,
        rewriteRequired: false,
      },
    }));

  // Campaign footer requires a physical address. If still a launch placeholder,
  // set a temporary owner-controlled footer for this pipeline check only.
  if (!workspace.mailingAddress?.trim() || /pending/i.test(workspace.mailingAddress)) {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        mailingAddress:
          "iScream Studio INC (SendFable controlled SES test), Glenview, IL — update in Settings",
      },
    });
  }

  const tag = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: TAG_NAME } },
    create: { workspaceId: workspace.id, name: TAG_NAME },
    update: {},
  });

  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_email: { workspaceId: workspace.id, email: OWNER_TO.toLowerCase() },
    },
    create: {
      workspaceId: workspace.id,
      email: OWNER_TO.toLowerCase(),
      status: "SUBSCRIBED",
      source: "ses-controlled-test",
    },
    update: { status: "SUBSCRIBED", unsubscribedAt: null },
  });

  await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
    create: { contactId: contact.id, tagId: tag.id },
    update: {},
  });

  await prisma.suppressionEntry.deleteMany({
    where: { workspaceId: workspace.id, email: OWNER_TO.toLowerCase() },
  });

  const design = createEmptyDesign();
  design.blocks = [
    {
      id: "h1",
      type: "heading",
      props: { text: "Controlled campaign test", level: 1, align: "left" },
    },
    {
      id: "t1",
      type: "text",
      props: {
        html: "<p>Single owner recipient. Not a customer send.</p>",
        align: "left",
      },
    },
    {
      id: "b1",
      type: "button",
      props: {
        label: "Pricing",
        href: "https://sendfable.com/pricing",
        backgroundColor: "#E85A4F",
        textColor: "#ffffff",
        align: "center",
      },
    },
  ];

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: `SES controlled campaign ${new Date().toISOString()}`,
      subject: "SendFable controlled campaign delivery test",
      previewText: "Owner-only SES pipeline check",
      status: "DRAFT",
      audienceType: "tags",
      audienceTagIds: [tag.id],
      senderIdentityId: sender.id,
      designJson: JSON.parse(JSON.stringify(design)),
    },
  });

  const { recipientCount } = await launchCampaign(campaign.id);
  if (recipientCount !== 1) {
    throw new Error(`Expected 1 recipient, got ${recipientCount}`);
  }

  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id, status: "PENDING" },
  });
  for (const r of pending) {
    await sendOneRecipient(r.id);
  }

  // Give SNS a moment; caller may wait longer for deliveredAt.
  await new Promise((r) => setTimeout(r, 3000));

  const after = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id },
  });
  const updated = await prisma.campaign.findUnique({ where: { id: campaign.id } });

  console.log(
    JSON.stringify({
      ok: true,
      campaignId: campaign.id,
      campaignStatus: updated?.status,
      workspaceId: workspace.id,
      recipientCount,
      recipients: after.map((r) => ({
        emailDomain: r.email.split("@")[1],
        status: r.status,
        sesMessageId: r.sesMessageId,
        deliveredAt: r.deliveredAt,
        error: r.error,
      })),
    })
  );
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) })
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
