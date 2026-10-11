/**
 * Controlled TheDrinkPlace global newsletter QA — owner inbox only.
 *   npx tsx scripts/tdp-global-nl-qa.ts --confirm-owner-qa
 */
import { prisma } from "../src/lib/prisma";
import { maybeEnqueueAutoWelcome } from "../src/lib/newsletter/auto-welcome";
import { processDueAutomationSends } from "../src/lib/newsletter/process";
import { theDrinkPlaceWelcomeHtml } from "../src/lib/newsletter/welcome-html";
import { buildTheDrinkPlaceWeeklyEdition } from "../src/lib/newsletter/tdp-weekly";
import { welcomeIdempotencyKey } from "../src/lib/newsletter/ledger";
import { unsubscribeContact } from "../src/lib/suppression";

const CONFIRM = "--confirm-owner-qa";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitRecipient(campaignId: string, email: string) {
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const row = await prisma.campaignRecipient.findFirst({
      where: { campaignId, email },
      select: { status: true, sentAt: true, deliveredAt: true, sesMessageId: true, error: true },
    });
    if (row && ["SENT", "FAILED", "SKIPPED", "BOUNCED"].includes(row.status)) return row;
  }
  return null;
}

async function main() {
  if (!process.argv.includes(CONFIRM)) {
    console.error("Refusing: pass --confirm-owner-qa");
    process.exit(1);
  }

  const html = theDrinkPlaceWelcomeHtml();
  if (/Chicago drink guide|nationwide claim|not invented prices/i.test(html)) {
    throw new Error("welcome template still has Chicago/QA language");
  }
  if (!/Explore drinks|Choose a destination|Find happy hours/.test(html)) {
    throw new Error("welcome missing required CTAs");
  }

  const weeklyGlobal = buildTheDrinkPlaceWeeklyEdition({ now: new Date() });
  if (!weeklyGlobal) throw new Error("weekly global skipped unexpectedly");
  if (/Coverage stays location-scoped/i.test(weeklyGlobal.bodyHtml)) {
    throw new Error("weekly still has QA language");
  }
  const weeklyLocal = buildTheDrinkPlaceWeeklyEdition({
    now: new Date(),
    newsletterDestination: "london",
  });
  if (!weeklyLocal || !/London/i.test(weeklyLocal.bodyHtml)) {
    throw new Error("weekly local destination section missing");
  }

  const ownerEmail = (process.env.PLATFORM_OWNER_EMAIL || process.env.OWNER_ALERT_EMAIL || "")
    .trim()
    .toLowerCase();
  if (!ownerEmail) throw new Error("owner email env missing");

  const ws = await prisma.workspace.findFirst({
    where: { isInternal: true, name: "TheDrinkPlace" },
  });
  if (!ws?.autoWelcomeEnabled) throw new Error("TheDrinkPlace autoWelcomeEnabled not on");

  let contact = await prisma.contact.findFirst({
    where: { workspaceId: ws.id, email: ownerEmail },
  });
  if (!contact) throw new Error("owner contact missing");

  if (contact.status !== "SUBSCRIBED") {
    await prisma.$transaction([
      prisma.contact.update({
        where: { id: contact.id },
        data: { status: "SUBSCRIBED", unsubscribedAt: null },
      }),
      prisma.suppressionEntry.deleteMany({
        where: { workspaceId: ws.id, email: ownerEmail, reason: "UNSUBSCRIBED" },
      }),
    ]);
  }

  await prisma.automationSendLedger.deleteMany({
    where: {
      workspaceId: ws.id,
      kind: "welcome",
      idempotencyKey: welcomeIdempotencyKey(contact.id),
    },
  });

  const enq1 = await maybeEnqueueAutoWelcome({
    workspaceId: ws.id,
    contactId: contact.id,
    becameSubscribed: true,
  });
  const enqDup = await maybeEnqueueAutoWelcome({
    workspaceId: ws.id,
    contactId: contact.id,
    becameSubscribed: true,
  });
  await processDueAutomationSends(20);
  const welcomeJob = await prisma.automationSendLedger.findFirst({
    where: {
      workspaceId: ws.id,
      kind: "welcome",
      idempotencyKey: welcomeIdempotencyKey(contact.id),
    },
  });
  if (!welcomeJob?.campaignId) throw new Error("welcome job missing campaign");

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: welcomeJob.campaignId },
    select: { compiledHtml: true, subject: true },
  });
  const body = campaign.compiledHtml || "";
  if (/Chicago drink guide|nationwide claim/i.test(body)) {
    throw new Error("sent welcome campaign still contains Chicago default");
  }

  const recip = await waitRecipient(welcomeJob.campaignId, ownerEmail);
  await unsubscribeContact(ws.id, ownerEmail, "tdp_global_nl_qa_unsub");

  console.log(
    JSON.stringify(
      {
        welcomeHtmlOk: true,
        weeklyGlobalOk: true,
        weeklyLocalOk: true,
        enqueued: enq1.enqueued,
        duplicateBlocked: !enqDup.enqueued,
        ledgerStatus: welcomeJob.status,
        campaignId: welcomeJob.campaignId,
        recipient: recip,
        chicagoInCampaign: /chicago/i.test(body),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
