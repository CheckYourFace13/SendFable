/**
 * Controlled QA for TheDrinkPlace automatic welcome + weekly auto-send.
 * Owner inbox only. Uses SendFable campaign/recipient + SES delivery fields.
 *
 *   npx tsx scripts/tdp-nl-auto-qa.ts --confirm-owner-qa
 */
import { prisma } from "../src/lib/prisma";
import { maybeEnqueueAutoWelcome } from "../src/lib/newsletter/auto-welcome";
import { processDueAutomationSends } from "../src/lib/newsletter/process";
import { enqueueAutopilotAutoSend } from "../src/lib/newsletter/auto-weekly";
import { createAutopilotCampaignDraft } from "../src/lib/autopilot/draft";
import { unsubscribeContact } from "../src/lib/suppression";
import { FREQUENCY_INTERVAL_MS } from "../src/lib/autopilot/types";
import { welcomeIdempotencyKey } from "../src/lib/newsletter/ledger";

const CONFIRM = "--confirm-owner-qa";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitRecipient(campaignId: string, email: string) {
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const row = await prisma.campaignRecipient.findFirst({
      where: { campaignId, email },
      select: {
        status: true,
        sentAt: true,
        deliveredAt: true,
        sesMessageId: true,
        error: true,
      },
    });
    if (!row) continue;
    if (["SENT", "FAILED", "SKIPPED", "BOUNCED"].includes(row.status)) {
      return row;
    }
  }
  return null;
}

async function main() {
  if (!process.argv.includes(CONFIRM)) {
    console.error("Refusing: pass --confirm-owner-qa");
    process.exit(1);
  }

  const ownerEmail = (
    process.env.PLATFORM_OWNER_EMAIL ||
    process.env.OWNER_ALERT_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!ownerEmail) throw new Error("owner email env missing");

  const ws = await prisma.workspace.findFirst({
    where: { isInternal: true, name: "TheDrinkPlace" },
  });
  if (!ws) throw new Error("TheDrinkPlace missing");
  if (!ws.autoWelcomeEnabled) throw new Error("autoWelcomeEnabled not on");

  const expectedMail = "iScream Studio, Inc.\n1364 Patriot Blvd\nGlenview, IL 60026";
  if ((ws.mailingAddress || "").replace(/\r/g, "") !== expectedMail) {
    throw new Error(`mailingAddress mismatch: ${JSON.stringify(ws.mailingAddress)}`);
  }

  let contact = await prisma.contact.findFirst({
    where: { workspaceId: ws.id, email: ownerEmail },
  });
  if (!contact) throw new Error("owner contact missing");

  // Ensure subscribed for welcome test
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

  // Clear prior welcome ledger so we can test one automated welcome
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
  const enqNoTransition = await maybeEnqueueAutoWelcome({
    workspaceId: ws.id,
    contactId: contact.id,
    becameSubscribed: false,
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

  // Drain again in case first pass left PROCESSING
  for (let i = 0; i < 5 && welcomeJob.status !== "SENT"; i++) {
    await processDueAutomationSends(20);
    const j = await prisma.automationSendLedger.findUnique({ where: { id: welcomeJob.id } });
    if (j) Object.assign(welcomeJob, j);
    if (welcomeJob.status === "SENT" || welcomeJob.status === "SKIPPED") break;
    await sleep(2000);
  }

  const welcomeRecip = await waitRecipient(welcomeJob.campaignId!, ownerEmail);

  // Suppression check at send time
  await unsubscribeContact(ws.id, ownerEmail, "tdp_auto_nl_qa_unsub");
  await prisma.automationSendLedger.deleteMany({
    where: {
      workspaceId: ws.id,
      kind: "welcome",
      idempotencyKey: welcomeIdempotencyKey(contact.id),
    },
  });
  const enqSuppressed = await maybeEnqueueAutoWelcome({
    workspaceId: ws.id,
    contactId: contact.id,
    becameSubscribed: true,
  });
  await processDueAutomationSends(20);
  const suppressedJob = await prisma.automationSendLedger.findFirst({
    where: {
      workspaceId: ws.id,
      kind: "welcome",
      idempotencyKey: welcomeIdempotencyKey(contact.id),
    },
  });

  // Restore owner subscription
  await prisma.$transaction([
    prisma.contact.update({
      where: { id: contact.id },
      data: { status: "SUBSCRIBED", unsubscribedAt: null },
    }),
    prisma.suppressionEntry.deleteMany({
      where: { workspaceId: ws.id, email: ownerEmail, reason: "UNSUBSCRIBED" },
    }),
  ]);
  const audience = await prisma.tag.findFirstOrThrow({
    where: { workspaceId: ws.id, name: "TheDrinkPlace Subscribers" },
  });
  await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId: contact.id, tagId: audience.id } },
    create: { contactId: contact.id, tagId: audience.id },
    update: {},
  });

  // Weekly auto-send path (quality-gated draft → ledger → launch)
  const config = await prisma.marketingAutopilotConfig.findUniqueOrThrow({
    where: { workspaceId: ws.id },
  });
  if (!config.autoSendEnabled) throw new Error("autoSendEnabled not on");

  const fp = `tdp-auto-qa-${Date.now()}`;
  const { draftId, campaignId } = await createAutopilotCampaignDraft({
    workspaceId: ws.id,
    configId: config.id,
    sourceUrl: "https://thedrinkplace.com/guides",
    changeFingerprint: fp,
    changeSummary: "new_guide_content",
    changedContent:
      "Essential home bar tools and cocktail glassware guides updated on TheDrinkPlace. Verified site guides only — no invented prices or events.",
    generated: {
      subject: "This week on TheDrinkPlace",
      preheader: "Verified guides worth a look",
      headline: "Drink guides worth sharing",
      bodyHtml:
        "<p>This week’s useful reads on TheDrinkPlace (live guides only):</p>" +
        "<ul>" +
        '<li><a href="https://thedrinkplace.com/guides/essential-home-bar-tools">Essential home bar tools</a></li>' +
        '<li><a href="https://thedrinkplace.com/guides/cocktail-glassware">Cocktail glassware</a></li>' +
        '<li><a href="https://thedrinkplace.com/chicago">Chicago drink guide</a></li>' +
        "</ul>" +
        "<p>Coverage stays location-scoped. Place pages show source and date when we have them.</p>",
      ctaLabel: "Browse guides",
      ctaHref: "https://thedrinkplace.com/guides",
      goal: "news",
      templateSlug: null,
      explanation: "QA controlled weekly auto-send",
      costMicros: 0,
      model: "qa",
    },
    audienceType: "tags",
    audienceTagIds: [audience.id],
    audienceSegmentId: null,
  });

  const weeklyEnq = await enqueueAutopilotAutoSend({
    workspaceId: ws.id,
    draftId,
    campaignId,
  });
  const weeklyDup = await enqueueAutopilotAutoSend({
    workspaceId: ws.id,
    draftId,
    campaignId,
  });

  await processDueAutomationSends(20);
  let weeklyJob = await prisma.automationSendLedger.findFirst({
    where: {
      workspaceId: ws.id,
      kind: "autopilot_auto",
      idempotencyKey: `autopilot-auto:${draftId}`,
    },
  });
  for (let i = 0; i < 8 && weeklyJob && weeklyJob.status !== "SENT"; i++) {
    await processDueAutomationSends(20);
    weeklyJob = await prisma.automationSendLedger.findUnique({ where: { id: weeklyJob.id } });
    if (weeklyJob?.status === "SENT" || weeklyJob?.status === "SKIPPED") break;
    await sleep(2000);
  }

  const weeklyRecip = weeklyJob?.campaignId
    ? await waitRecipient(weeklyJob.campaignId, ownerEmail)
    : null;

  const draftAfter = await prisma.marketingAutopilotDraft.findUnique({
    where: { id: draftId },
    select: { status: true },
  });
  const configAfter = await prisma.marketingAutopilotConfig.findUnique({
    where: { id: config.id },
  });

  const interval = FREQUENCY_INTERVAL_MS.WEEKLY;
  const lastFetched = configAfter?.lastFetchedAt?.getTime() ?? null;
  const nextRunUtc =
    lastFetched != null
      ? new Date(lastFetched + interval)
      : new Date(); // due immediately on next tick if never fetched

  // Confirm DrinkKnird still approval-only
  const dk = await prisma.workspace.findFirst({
    where: { name: "DrinkKnird" },
    select: {
      autoWelcomeEnabled: true,
      marketingAutopilotConfig: { select: { autoSendEnabled: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        mailingAddressOk: true,
        timezone: ws.timezone,
        welcome: {
          enqueued: enq1,
          duplicateEnqueue: enqDup,
          noTransition: enqNoTransition,
          jobStatus: welcomeJob.status,
          campaignId: welcomeJob.campaignId,
          recipient: welcomeRecip,
          providerDeliveryConfirmed: Boolean(
            welcomeRecip?.status === "SENT" &&
              welcomeRecip.sesMessageId &&
              welcomeRecip.deliveredAt
          ),
        },
        suppression: {
          enqueueWhileUnsubscribed: enqSuppressed,
          jobStatus: suppressedJob?.status ?? null,
          lastError: suppressedJob?.lastError ?? null,
        },
        weekly: {
          draftId,
          campaignId,
          enqueued: weeklyEnq,
          duplicateEnqueue: weeklyDup,
          jobStatus: weeklyJob?.status ?? null,
          draftStatus: draftAfter?.status ?? null,
          recipient: weeklyRecip,
          providerDeliveryConfirmed: Boolean(
            weeklyRecip?.status === "SENT" &&
              weeklyRecip.sesMessageId &&
              weeklyRecip.deliveredAt
          ),
          lastAutoSentAt: configAfter?.lastAutoSentAt ?? null,
        },
        schedule: {
          checkFrequency: configAfter?.checkFrequency,
          autoSendEnabled: configAfter?.autoSendEnabled,
          lastFetchedAt: configAfter?.lastFetchedAt,
          nextScheduledCheckUtc: nextRunUtc.toISOString(),
          timezone: "America/Chicago",
          note: "WEEKLY interval from lastFetchedAt; send occurs only when quality gates pass",
        },
        otherBrands: {
          drinkKnirdAutoWelcome: dk?.autoWelcomeEnabled ?? null,
          drinkKnirdAutoSend: dk?.marketingAutopilotConfig?.autoSendEnabled ?? null,
        },
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
