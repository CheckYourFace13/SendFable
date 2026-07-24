/**
 * One-shot controlled SES infrastructure test.
 * Sends exactly one message to the allowlisted sandbox recipient via Sendfable mailer.
 *
 * Usage (inside sendfable-worker): npx tsx scripts/ses-controlled-test.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { platformFrom, sendEmail, isDevMailMode } from "../src/lib/mailer";

const ALLOWED_TO = "chris@iscreamstudio.com";
const SUBJECT = "Sendfable SES controlled test";

async function main() {
  if (isDevMailMode()) {
    throw new Error("AWS credentials not loaded — aborting (would write outbox only)");
  }
  if (process.env.SES_CONFIGURATION_SET !== "sendfable-events") {
    throw new Error("SES_CONFIGURATION_SET must be sendfable-events");
  }
  if ((process.env.PLATFORM_SEND_DOMAIN || "") !== "send.sendfable.com") {
    throw new Error("PLATFORM_SEND_DOMAIN must be send.sendfable.com");
  }

  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL || ALLOWED_TO;
  const user = await prisma.user.findFirst({
    where: { email: ownerEmail },
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { workspace: true },
        take: 1,
      },
    },
  });
  if (!user?.memberships[0]?.workspace) {
    throw new Error(`Owner workspace not found for ${ownerEmail}`);
  }
  const workspace = user.memberships[0].workspace;

  // Ensure contact exists (not an import batch — single allowlisted address).
  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_email: { workspaceId: workspace.id, email: ALLOWED_TO },
    },
    create: {
      workspaceId: workspace.id,
      email: ALLOWED_TO,
      status: "SUBSCRIBED",
      source: "ses-controlled-test",
    },
    update: {},
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: "SES controlled infrastructure test",
      status: "DRAFT",
      subject: SUBJECT,
      previewText: "Controlled SES infrastructure test — not a campaign launch",
      compiledHtml: `<div style="font-family:sans-serif;line-height:1.5">
        <p><strong>Controlled infrastructure test</strong></p>
        <p>This is a single Sendfable SES activation message. It is not a marketing campaign.</p>
        <p>From domain: send.sendfable.com · Configuration set: sendfable-events</p>
        <p>If you did not expect this, you can ignore it.</p>
      </div>`,
      simpleMode: true,
      audienceType: "all",
    },
  });

  const recipient = await prisma.campaignRecipient.create({
    data: {
      campaignId: campaign.id,
      contactId: contact.id,
      email: ALLOWED_TO,
      status: "PENDING",
      mergeData: {},
    },
  });

  const result = await sendEmail({
    from: platformFrom("Sendfable"),
    to: ALLOWED_TO,
    replyTo: ALLOWED_TO,
    subject: SUBJECT,
    html: campaign.compiledHtml!,
    text: "Controlled infrastructure test — Sendfable SES activation. Not a campaign launch.",
    tags: {
      purpose: "controlled-ses-test",
      campaignId: campaign.id,
    },
    // Configuration set applied (do NOT set noConfigurationSet)
  });

  if (!result.messageId || result.dev) {
    throw new Error("SES did not accept the message (missing MessageId or still in dev mode)");
  }

  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      status: "SENT",
      sesMessageId: result.messageId,
      sentAt: new Date(),
      attemptCount: 1,
    },
  });

  await prisma.webhookEvent.create({
    data: {
      source: "ses-controlled-test",
      externalId: result.messageId,
      type: "send-accepted",
    },
  });

  // Safe summary only — no secrets, no full headers.
  console.log(
    JSON.stringify({
      ok: true,
      campaignId: campaign.id,
      recipientId: recipient.id,
      toDomain: ALLOWED_TO.split("@")[1],
      fromDomain: "send.sendfable.com",
      replyToSet: true,
      configurationSet: process.env.SES_CONFIGURATION_SET,
      sesMessageId: result.messageId,
      campaignStatus: "DRAFT",
      launched: false,
    })
  );
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
