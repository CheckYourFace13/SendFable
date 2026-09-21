/**
 * Controlled Casey acquisition attribution cert.
 * Creates a real AcquisitionMessage, sends via the acquisition SES path
 * (Casey from + acquisition tags), polls until DELIVERED from live SES events.
 *
 * Gate: ACQUISITION_CASEY_ATTRIBUTION_CERT=1
 * Recipient: owner-controlled inbox only (iscreamstudio.com / sendfable.com).
 *
 * Does NOT mark anything DELIVERED manually.
 * Does NOT flip public flags.
 */
import { prisma } from "../src/lib/prisma";
import { sendEmail } from "../src/lib/mailer";
import {
  acquisitionFromAddress,
  acquisitionPhysicalAddress,
  acquisitionReplyTo,
  acquisitionSendingEnabled,
} from "../src/lib/acquisition/flags";
import { verifyAcquisitionSender } from "../src/lib/acquisition/sender";
import { appUrl } from "../src/lib/utils";
import { signToken } from "../src/lib/tokens";

const OWNER_TO =
  process.env.ACQUISITION_CERT_TO?.trim() || "chris@iscreamstudio.com";

function assertGate() {
  if (process.env.ACQUISITION_CASEY_ATTRIBUTION_CERT !== "1") {
    throw new Error("Set ACQUISITION_CASEY_ATTRIBUTION_CERT=1");
  }
  const domain = OWNER_TO.split("@")[1]?.toLowerCase() || "";
  if (!["iscreamstudio.com", "sendfable.com"].includes(domain)) {
    throw new Error(`Recipient must be owner-controlled domain, got ${domain}`);
  }
  if (!acquisitionSendingEnabled()) {
    throw new Error("ACQUISITION_SENDING_ENABLED must be true");
  }
  if (process.env.SES_CONFIGURATION_SET !== "sendfable-events") {
    throw new Error("SES_CONFIGURATION_SET must be sendfable-events");
  }
}

function plainToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${esc}</pre>
<p style="font-size:11px;color:#6b7280;margin-top:24px;">${acquisitionPhysicalAddress()}</p>`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  assertGate();
  const ts = Date.now();
  const domain = `cert-acq-${ts}.iscreamstudio.com`;

  const prospect = await prisma.acquisitionProspect.create({
    data: {
      domain,
      website: `https://${domain}`,
      category: "cert",
      businessName: "SendFable Attribution Cert",
      contactEmail: OWNER_TO,
      firstName: "Chris",
      status: "QUEUED",
      personalizationClaim: "Controlled attribution certification send",
      personalizationEvidence: "Owner-controlled inbox for SES Delivery proof",
      personalizationSourceUrl: "https://sendfable.com",
      landingPagePath: "/email-marketing-for-small-business",
      state: "IL",
      ownerApproved: true,
      activeWebsite: true,
    },
  });

  const unsubToken = await signToken(
    "acquisition-unsub",
    { prospectId: prospect.id, email: OWNER_TO },
    "365d"
  );
  const unsub = appUrl(
    `/api/acquisition/unsubscribe?token=${encodeURIComponent(unsubToken)}`
  );

  const subject = `Casey attribution cert ${ts}`;
  const bodyText = `Hi Chris —

This is a controlled SendFable acquisition attribution test (not a marketing blast).

Confirm SES Delivery attributes this Casey message automatically.

Unsubscribe: ${unsub}`;

  let msg = await prisma.acquisitionMessage.create({
    data: {
      prospectId: prospect.id,
      step: "INITIAL",
      status: "DRAFT",
      subject,
      bodyText,
      dryRun: false,
      copyVersion: "cert",
      openerType: "cert",
    },
  });

  await prisma.acquisitionEvent.create({
    data: {
      prospectId: prospect.id,
      type: "cert_draft_created",
      meta: { messageId: msg.id },
    },
  });

  const sender = await verifyAcquisitionSender();
  if (!sender.ok) {
    throw new Error(`sender_not_verified:${sender.detail}`);
  }
  const from = sender.from || acquisitionFromAddress();
  if (!/Casey at SendFable/i.test(from)) {
    throw new Error(`Expected Casey from, got: ${from}`);
  }

  const result = await sendEmail({
    from,
    to: OWNER_TO,
    replyTo: acquisitionReplyTo(),
    subject,
    text: bodyText,
    html: plainToHtml(bodyText),
    tags: {
      kind: "acquisition",
      prospectId: prospect.id.slice(0, 64),
      step: "INITIAL",
      purpose: "casey-attribution-cert",
    },
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  const sesId = (result.messageId || "").replace(/^<|>$/g, "").trim();
  if (!sesId || result.dev) {
    throw new Error("SES did not accept the message");
  }

  const sentAt = new Date();
  msg = await prisma.acquisitionMessage.update({
    where: { id: msg.id },
    data: {
      status: "SENT",
      sentAt,
      sesMessageId: sesId,
    },
  });
  await prisma.acquisitionProspect.update({
    where: { id: prospect.id },
    data: { status: "CONTACTED", lastContactedAt: sentAt },
  });
  await prisma.acquisitionEvent.create({
    data: {
      prospectId: prospect.id,
      type: "ses_accepted",
      meta: { messageId: msg.id, sesMessageId: sesId, cert: true },
    },
  });
  await prisma.acquisitionEvent.create({
    data: {
      prospectId: prospect.id,
      type: "sent",
      meta: { messageId: msg.id, sesMessageId: sesId, cert: true },
    },
  });

  let delivered = false;
  let finalStatus = msg.status;
  let deliveredAt: Date | null = null;
  for (let i = 0; i < 36; i++) {
    await sleep(5000);
    const fresh = await prisma.acquisitionMessage.findUnique({
      where: { id: msg.id },
    });
    if (!fresh) break;
    finalStatus = fresh.status;
    deliveredAt = fresh.deliveredAt;
    if (fresh.status === "DELIVERED" && fresh.deliveredAt) {
      delivered = true;
      break;
    }
    if (fresh.status === "BOUNCED" || fresh.status === "COMPLAINED") {
      break;
    }
  }

  // Active alert window should be empty for Black Horse (past 48h) after fix deploy
  const stuckFresh = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      status: "SENT",
      sentAt: {
        lte: new Date(Date.now() - 4 * 3600_000),
        gte: new Date(Date.now() - 48 * 3600_000),
      },
      deliveredAt: null,
      bounceAt: null,
      complaintAt: null,
      sesMessageId: { not: null },
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: delivered,
        from,
        toDomain: OWNER_TO.split("@")[1],
        prospectId: prospect.id,
        messageId: msg.id,
        sesMessageId: sesId,
        path: "DRAFT→SENT→" + finalStatus,
        delivered,
        deliveredAt,
        stuckInActiveAlertWindow: stuckFresh,
        fabricatedDelivery: false,
      },
      null,
      2
    )
  );

  if (!delivered) process.exit(1);
}

main()
  .catch((e) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    );
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
