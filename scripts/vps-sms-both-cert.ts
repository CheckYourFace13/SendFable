/**
 * LIVE BOTH certification (owner pilot workspace only).
 * Exactly 1 email + 1 SMS to the owner-controlled contact. No duplicates.
 *
 * Run on VPS worker: npx tsx scripts/vps-sms-both-cert.ts
 */
import { config } from "dotenv";
config({ path: ".env" });

function shortId(id: string | null | undefined) {
  if (!id) return "NONE";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
function maskPhone(e164: string) {
  if (e164.length < 6) return "***";
  return e164.slice(0, 2) + "***" + e164.slice(-4);
}
function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const workspaceId =
    process.env.SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID?.trim() ||
    "cmrry4tfe0001aqx1xw328ghq";
  const ownerEmail =
    process.env.SENDFABLE_BOTH_CERT_EMAIL?.trim() || "chris@iscreamstudio.com";

  const report: Record<string, unknown> = {
    at: new Date().toISOString(),
    workspaceIdShort: shortId(workspaceId),
  };

  const { prisma } = await import("../src/lib/prisma");
  const { parseOwnerPilotMeta } = await import("../src/lib/sms/owner-pilot-meta");
  const { launchCampaign } = await import("../src/lib/campaign-send");
  const { launchSmsCampaign } = await import("../src/lib/sms/campaign");
  const { compileEmailHtml } = await import("../src/lib/email-compiler");
  const { createSimpleDesign } = await import("../src/lib/simple-design");
  const { isCampaignSendEnabled } = await import("../src/lib/campaign-send-gate");
  const { isOwnerPilotLiveSendingAllowed } = await import("../src/lib/sms/pilot");

  if (!isCampaignSendEnabled()) {
    report.error = "CAMPAIGN_SEND_ENABLED_false";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const liveOk = await isOwnerPilotLiveSendingAllowed(workspaceId);
  if (!liveOk) {
    report.error = "owner_pilot_live_sending_not_allowed";
    console.log(JSON.stringify(report, null, 2));
    process.exit(3);
  }

  const profile = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
  if (!profile) {
    report.error = "no_compliance_profile";
    console.log(JSON.stringify(report, null, 2));
    process.exit(4);
  }
  const meta = parseOwnerPilotMeta(profile.internalNotes);
  if (!meta.pilotPhoneE164) {
    report.error = "pilot_phone_missing";
    console.log(JSON.stringify(report, null, 2));
    process.exit(5);
  }
  report.pilotPhoneMasked = maskPhone(meta.pilotPhoneE164);
  report.ownerEmailMasked = maskEmail(ownerEmail);

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace?.mailingAddress?.trim()) {
    report.error = "mailing_address_required";
    console.log(JSON.stringify(report, null, 2));
    process.exit(6);
  }
  report.workspaceName = workspace.name;

  const sender = await prisma.senderIdentity.findFirst({
    where: { workspaceId, status: "VERIFIED" },
    orderBy: { isDefault: "desc" },
  });
  if (!sender) {
    report.error = "no_verified_sender";
    console.log(JSON.stringify(report, null, 2));
    process.exit(7);
  }
  report.senderMasked = maskEmail(sender.value);

  // Ensure one contact with BOTH email + phone, consent from START (do not flip manually)
  let contact = await prisma.contact.findFirst({
    where: { workspaceId, phoneE164: meta.pilotPhoneE164 },
  });
  if (!contact) {
    report.error = "pilot_contact_missing";
    console.log(JSON.stringify(report, null, 2));
    process.exit(8);
  }

  // Attach owner email if missing (required for email leg) — does not change SMS consent
  if (!contact.email || contact.email.toLowerCase() !== ownerEmail.toLowerCase()) {
    const emailOwner = await prisma.contact.findFirst({
      where: { workspaceId, email: { equals: ownerEmail, mode: "insensitive" } },
    });
    if (emailOwner && emailOwner.id !== contact.id) {
      // Merge: move email onto the phone/consent contact, then remove the email-only row
      // (cannot null email on a phone-less contact — DB check constraint).
      if (emailOwner.phoneE164 && emailOwner.phoneE164 !== meta.pilotPhoneE164) {
        report.error = "email_on_different_phone_contact";
        console.log(JSON.stringify(report, null, 2));
        process.exit(9);
      }
      await prisma.contactTag.deleteMany({ where: { contactId: emailOwner.id } });
      await prisma.contact.delete({ where: { id: emailOwner.id } });
    }
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        email: ownerEmail,
        status: "SUBSCRIBED",
        firstName: contact.firstName || "Owner",
        lastName: contact.lastName || "Pilot",
      },
    });
  }

  report.contact = {
    idShort: shortId(contact.id),
    emailMasked: contact.email ? maskEmail(contact.email) : null,
    smsStatus: contact.smsStatus,
    smsConsentSource: contact.smsConsentSource,
    smsConsentAt: contact.smsConsentAt?.toISOString() ?? null,
    emailStatus: contact.status,
  };

  if (contact.smsStatus !== "SUBSCRIBED") {
    report.error = "sms_not_subscribed_after_start";
    report.note = "Do not manually flip consent — owner must send START";
    console.log(JSON.stringify(report, null, 2));
    process.exit(10);
  }

  const suppression = await prisma.smsSuppression.findFirst({
    where: { workspaceId, phoneE164: meta.pilotPhoneE164 },
  });
  report.suppression = suppression
    ? { reason: suppression.reason, createdAt: suppression.createdAt.toISOString() }
    : null;
  if (suppression) {
    report.error = "still_suppressed_after_start";
    console.log(JSON.stringify(report, null, 2));
    process.exit(11);
  }

  // Audience: dedicated tag so exactly this one contact is targeted
  const tagName = `both-cert-${Date.now()}`;
  const tag = await prisma.tag.create({
    data: { workspaceId, name: tagName },
  });
  await prisma.contactTag.create({
    data: { contactId: contact.id, tagId: tag.id },
  });

  const design = createSimpleDesign({
    headline: "SendFable BOTH certification",
    messageHtml:
      "<p>One email to the owner as part of Email + Text certification. No action required.</p>",
    buttonLabel: "Open SendFable",
    buttonHref: "https://sendfable.com",
  });
  const html = compileEmailHtml(design, {
    businessName: workspace.name,
    mailingAddress: workspace.mailingAddress,
    showSendfableBadge: true,
    previewText: "BOTH cert",
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId,
      name: `BOTH cert ${new Date().toISOString().slice(0, 16)}`,
      channel: "BOTH",
      status: "DRAFT",
      subject: `SendFable BOTH certification ${new Date().toISOString().slice(0, 10)}`,
      previewText: "One email + one text",
      compiledHtml: html,
      designJson: design as object,
      senderIdentityId: sender.id,
      smsBody:
        "SendFable BOTH cert: one text + one email. Msg&data rates may apply. Reply STOP to opt out, HELP for help.",
      audienceType: "tags",
      audienceTagIds: [tag.id],
    },
  });
  report.campaignIdShort = shortId(campaign.id);

  // Pre-count recipients to assert exactly 1 each
  const emailCount = await prisma.contact.count({
    where: {
      workspaceId,
      status: "SUBSCRIBED",
      email: { not: null },
      tags: { some: { tagId: tag.id } },
    },
  });
  const smsEligible = await prisma.contact.count({
    where: {
      workspaceId,
      smsStatus: "SUBSCRIBED",
      phoneE164: { not: null },
      tags: { some: { tagId: tag.id } },
    },
  });
  report.preCounts = { email: emailCount, sms: smsEligible };
  if (emailCount !== 1 || smsEligible !== 1) {
    report.error = "audience_not_exactly_one";
    console.log(JSON.stringify(report, null, 2));
    process.exit(12);
  }

  const emailResult = await launchCampaign(campaign.id);
  const smsResult = await launchSmsCampaign(campaign.id);

  report.emailLaunch = emailResult;
  report.smsLaunch = smsResult;

  // Wait for email worker delivery + SMS carrier delivery updates
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    const er = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { status: true, sesMessageId: true },
    });
    const sr = await prisma.smsRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { status: true, deliveredAt: true },
    });
    const emailDone =
      er.length === 1 &&
      er.every((r) => ["SENT", "DELIVERED", "OPENED", "CLICKED", "FAILED", "BOUNCED"].includes(r.status));
    const smsDone =
      sr.length === 1 &&
      sr.every((r) => ["SENT", "DELIVERED", "FAILED", "SKIPPED"].includes(r.status));
    if (emailDone && smsDone) break;
  }

  const emailRecipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, email: true, status: true, sesMessageId: true, sentAt: true },
  });
  const smsRecipients = await prisma.smsRecipient.findMany({
    where: { campaignId: campaign.id },
    select: {
      id: true,
      phoneE164: true,
      status: true,
      providerMessageId: true,
      sentAt: true,
      deliveredAt: true,
      error: true,
    },
  });
  const updated = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    select: {
      status: true,
      sentCount: true,
      smsSentCount: true,
      recipientCount: true,
      channel: true,
    },
  });

  report.campaign = updated;
  report.emailRecipients = {
    count: emailRecipients.length,
    statuses: emailRecipients.map((r) => r.status),
    hasSesId: emailRecipients.some((r) => Boolean(r.sesMessageId)),
  };
  report.smsRecipients = {
    count: smsRecipients.length,
    statuses: smsRecipients.map((r) => r.status),
    delivered: smsRecipients.some((r) => r.status === "DELIVERED" || Boolean(r.deliveredAt)),
    errors: smsRecipients.map((r) => r.error).filter(Boolean),
  };

  const emailOk =
    emailRecipients.length === 1 &&
    emailRecipients.every((r) => ["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(r.status));
  const smsOk =
    smsRecipients.length === 1 &&
    smsRecipients.every((r) => ["SENT", "DELIVERED"].includes(r.status));
  const noDupes = emailRecipients.length === 1 && smsRecipients.length === 1;

  report.verdict = {
    emailDelivery: emailOk ? "PASS" : "FAIL",
    smsDelivery: smsOk ? "PASS" : "FAIL",
    exactlyOneEach: noDupes ? "PASS" : "FAIL",
    separateResults: emailOk && smsOk ? "PASS" : "FAIL",
    combinedChannel: updated?.channel === "BOTH" ? "PASS" : "FAIL",
  };

  const allPass = Object.values(report.verdict as Record<string, string>).every((v) => v === "PASS");
  report.BOTH = allPass ? "PASS" : "FAIL";

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect().catch(() => {});
  process.exit(allPass ? 0 : 20);
}

main().catch(async (e) => {
  console.error(
    JSON.stringify({ fatal: e instanceof Error ? e.message.slice(0, 500) : "unknown" })
  );
  process.exit(1);
});
