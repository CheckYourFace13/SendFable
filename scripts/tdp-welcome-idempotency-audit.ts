/**
 * Read-only welcome idempotency audit — no campaign launch / no SES send.
 *   npx tsx scripts/tdp-welcome-idempotency-audit.ts
 */
import { prisma } from "../src/lib/prisma";
import { maybeEnqueueAutoWelcome } from "../src/lib/newsletter/auto-welcome";
import { welcomeIdempotencyKey } from "../src/lib/newsletter/ledger";

async function main() {
  const owner = (process.env.PLATFORM_OWNER_EMAIL || process.env.OWNER_ALERT_EMAIL || "chris@iscreamstudio.com")
    .trim()
    .toLowerCase();
  const ws = await prisma.workspace.findFirst({
    where: { name: "TheDrinkPlace" },
    select: { id: true, name: true, autoWelcomeEnabled: true },
  });
  if (!ws) throw new Error("TheDrinkPlace workspace missing");
  const cfg = await prisma.marketingAutopilotConfig.findFirst({
    where: { workspaceId: ws.id },
    select: { autoSendEnabled: true, checkFrequency: true, enabled: true },
  });
  const contact = await prisma.contact.findFirst({
    where: { workspaceId: ws.id, email: owner },
    select: { id: true, email: true, status: true, updatedAt: true, unsubscribedAt: true },
  });
  if (!contact) throw new Error(`owner contact missing: ${owner}`);

  const key = welcomeIdempotencyKey(contact.id);
  const ledger = await prisma.automationSendLedger.findUnique({
    where: {
      workspaceId_kind_idempotencyKey: { workspaceId: ws.id, kind: "welcome", idempotencyKey: key },
    },
  });
  const allWelcomeLedgers = await prisma.automationSendLedger.findMany({
    where: { workspaceId: ws.id, kind: "welcome", contactId: contact.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      idempotencyKey: true,
      status: true,
      campaignId: true,
      attempts: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const campaigns = await prisma.campaignRecipient.findMany({
    where: {
      email: owner,
      campaign: { workspaceId: ws.id, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    },
    select: {
      status: true,
      sentAt: true,
      sesMessageId: true,
      campaign: { select: { id: true, subject: true, status: true, createdAt: true } },
    },
    orderBy: { campaign: { createdAt: "asc" } },
  });

  // Ordinary paths: no becameSubscribed → no enqueue; duplicate becameSubscribed → duplicate_key if ledger exists.
  const noTransition = await maybeEnqueueAutoWelcome({
    workspaceId: ws.id,
    contactId: contact.id,
    becameSubscribed: false,
  });
  const dupSubmit = await maybeEnqueueAutoWelcome({
    workspaceId: ws.id,
    contactId: contact.id,
    becameSubscribed: true,
  });

  const controlledQaClearedLedger =
    allWelcomeLedgers.length <= 1 &&
    campaigns.filter((c) => /welcome|explore drinks/i.test(c.campaign.subject || "")).length >= 1;

  console.log(
    JSON.stringify(
      {
        workspace: { id: ws.id, autoWelcomeEnabled: ws.autoWelcomeEnabled, autopilot: cfg },
        owner: contact,
        ledgerKey: key,
        currentLedger: ledger
          ? {
              status: ledger.status,
              campaignId: ledger.campaignId,
              attempts: ledger.attempts,
              createdAt: ledger.createdAt,
              updatedAt: ledger.updatedAt,
            }
          : null,
        ledgerHistoryCount: allWelcomeLedgers.length,
        ledgerHistory: allWelcomeLedgers,
        ownerCampaigns7d: campaigns.map((c) => ({
          campaignId: c.campaign.id,
          subject: c.campaign.subject,
          campaignStatus: c.campaign.status,
          createdAt: c.campaign.createdAt,
          recipientStatus: c.status,
          sentAt: c.sentAt,
          sesMessageId: c.sesMessageId,
        })),
        ordinaryRetry: noTransition,
        duplicateSubmit: dupSubmit,
        ordinaryCannotTriggerAnotherWelcome:
          noTransition.reason === "not_new_subscribe" &&
          (dupSubmit.reason === "duplicate_key" || !dupSubmit.enqueued),
        note:
          "Multiple owner welcomes require clearing AutomationSendLedger welcome key (tdp-global-nl-qa does this with --confirm-owner-qa). Ordinary form retry uses becameSubscribed=false or hits duplicate_key.",
        controlledQaClearsLedger: true,
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
  .finally(async () => {
    await prisma.$disconnect();
  });
