/**
 * Full review-link + schedule + send-now QA on an isolated Cert workspace.
 * Never touches BoatingChicago / Chicago Boating Brief.
 *
 * REVIEW_LINK_FULL_QA=1 npx tsx scripts/vps-review-link-full-qa.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  cancelAutopilotSchedule,
  executeAutopilotAction,
  loadAutopilotReview,
  signAutopilotActionToken,
} from "../src/lib/autopilot/approval";
import { launchCampaign } from "../src/lib/campaign-send";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function chicagoParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const bag: Record<string, string> = {};
  for (const p of parts) bag[p.type] = p.value;
  const hour = Number(bag.hour) % 24;
  return {
    date: `${bag.year}-${bag.month}-${bag.day}`,
    time: `${String(hour).padStart(2, "0")}:${bag.minute}`,
  };
}

async function main() {
  if (process.env.REVIEW_LINK_FULL_QA !== "1") {
    console.error("Set REVIEW_LINK_FULL_QA=1");
    process.exit(2);
  }

  const ws = await prisma.workspace.findFirst({
    where: { name: "Cert WS 1789228540622" },
    include: {
      senderIdentities: { where: { status: "VERIFIED" }, take: 1 },
    },
  });
  assert(ws, "cert workspace missing");
  assert(!/boating/i.test(ws.name), "wrong workspace");
  assert(ws.mailingAddress?.trim(), "cert workspace needs mailing address");
  assert(ws.senderIdentities[0], "cert workspace needs verified sender");

  let tag = await prisma.tag.findFirst({
    where: { workspaceId: ws.id, name: "review-link-safety-cert" },
  });
  if (!tag) {
    tag = await prisma.tag.create({
      data: { workspaceId: ws.id, name: "review-link-safety-cert" },
    });
  }

  const contact = await prisma.contact.findFirst({
    where: { workspaceId: ws.id, status: "SUBSCRIBED" },
  });
  assert(contact, "cert workspace needs one subscribed contact");
  const existingTag = await prisma.contactTag.findUnique({
    where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
  });
  if (!existingTag) {
    await prisma.contactTag.create({
      data: { contactId: contact.id, tagId: tag.id },
    });
  }

  const config =
    (await prisma.marketingAutopilotConfig.findFirst({ where: { workspaceId: ws.id } })) ||
    (await prisma.marketingAutopilotConfig.create({
      data: {
        workspaceId: ws.id,
        enabled: false,
        pageUrl: "https://example.com/review-link-qa",
        audienceType: "tags",
        audienceTagIds: [tag.id],
        audienceChosen: true,
      },
    }));

  async function makeDraft(suffix: string) {
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: ws.id,
        name: `[QA] Review-link ${suffix}`,
        subject: `[QA] Review-link safety ${suffix}`,
        previewText: "qa only",
        status: "DRAFT",
        audienceType: "tags",
        audienceTagIds: [tag!.id],
        senderIdentityId: ws!.senderIdentities[0].id,
        compiledHtml:
          "<html><body><p>Review-link safety QA — isolated cert contact only.</p></body></html>",
      },
    });
    const draft = await prisma.marketingAutopilotDraft.create({
      data: {
        workspaceId: ws.id,
        configId: config.id,
        campaignId: campaign.id,
        status: "AWAITING_APPROVAL",
        sourceUrl: "https://example.com/review-link-qa",
        changeFingerprint: `qa-${suffix}-${Date.now()}`,
        subject: campaign.subject,
        changeSummary: "qa",
        explanation: "Isolated review-link safety QA",
        approvalTokenVersion: 1,
        approvalEmailSentAt: new Date(),
      },
    });
    return { campaign, draft };
  }

  console.log("=== 1. GET never consumes token ===");
  const schedCase = await makeDraft("schedule");
  const tok = await signAutopilotActionToken({
    draftId: schedCase.draft.id,
    workspaceId: ws.id,
    action: "approve",
    version: 1,
  });
  for (let i = 0; i < 5; i++) {
    const g = await loadAutopilotReview(tok);
    assert("outcome" in g && g.outcome === "open", `GET ${i} open`);
  }
  const mid = await prisma.marketingAutopilotDraft.findUnique({
    where: { id: schedCase.draft.id },
  });
  assert(mid?.approvalTokenVersion === 1, "GET must not bump version");
  assert(mid?.status === "AWAITING_APPROVAL", "GET must not decide");
  console.log("PASS GET×5");

  console.log("=== 2. Schedule + simulated response failure reopen ===");
  const when = await chicagoParts(new Date(Date.now() + 10 * 60_000));
  const scheduled = await executeAutopilotAction({
    token: tok,
    confirm: true,
    date: when.date,
    time: when.time,
    timezone: "America/Chicago",
  });
  assert(scheduled.ok && scheduled.result === "scheduled", "schedule must succeed");

  // Simulate browser losing success UI / reopening stale link
  const reopened = await loadAutopilotReview(tok);
  assert("outcome" in reopened && reopened.outcome === "scheduled", "must show scheduled");
  assert(reopened.scheduledLabel, "must include schedule label");
  console.log("PASS reopen →", reopened.scheduledLabel);

  const dup = await executeAutopilotAction({
    token: tok,
    confirm: true,
    date: when.date,
    time: when.time,
    timezone: "America/Chicago",
  });
  assert(dup.ok && dup.result === "scheduled", "double POST idempotent");

  const canceled = await cancelAutopilotSchedule({
    draftId: schedCase.draft.id,
    workspaceId: ws.id,
    confirm: true,
  });
  assert(canceled.ok, "cancel failed");
  const afterCancel = await prisma.campaign.findUnique({ where: { id: schedCase.campaign.id } });
  assert(afterCancel?.status === "DRAFT", "must be DRAFT after cancel");
  console.log("PASS cancel schedule");

  console.log("=== 3. Send Now (cert contact only) + double launch ===");
  const sendCase = await makeDraft("send-now");
  // Keep as DRAFT; launchCampaign is Send Now path
  const first = await launchCampaign(sendCase.campaign.id);
  assert(first.recipientCount === 1, `expected 1 recipient got ${first.recipientCount}`);
  assert(!first.alreadyLaunched, "first launch should be fresh");

  const second = await launchCampaign(sendCase.campaign.id);
  assert(second.alreadyLaunched === true, "second launch must be idempotent");

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: sendCase.campaign.id },
  });
  assert(recipients.length === 1, "exactly one recipient row");
  // Wait briefly for inline/worker send
  for (let i = 0; i < 20; i++) {
    const c = await prisma.campaign.findUnique({ where: { id: sendCase.campaign.id } });
    if (c && ["COMPLETED", "FAILED", "SENDING"].includes(c.status) && (c.sentCount ?? 0) >= 1) {
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const finalCamp = await prisma.campaign.findUnique({ where: { id: sendCase.campaign.id } });
  assert(finalCamp, "campaign gone");
  assert((finalCamp.sentCount ?? 0) <= 1, "must not double-send");
  assert((finalCamp.recipientCount ?? 0) === 1, "recipientCount must stay 1");

  // Mark draft decided so reopen shows sent
  await prisma.marketingAutopilotDraft.update({
    where: { id: sendCase.draft.id },
    data: {
      status: "APPROVED",
      decidedAction: "SCHEDULE",
      decidedAt: new Date(),
      approvalTokenVersion: { increment: 1 },
    },
  });
  const sendTok = await signAutopilotActionToken({
    draftId: sendCase.draft.id,
    workspaceId: ws.id,
    action: "approve",
    version: 1,
  });
  const sentView = await loadAutopilotReview(sendTok);
  assert("outcome" in sentView && sentView.outcome === "sent", "reopen must show sent");
  console.log("PASS send-now idempotent + reopen sent; campaign status=", finalCamp.status);

  console.log("\nALL_FULL_QA_PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
