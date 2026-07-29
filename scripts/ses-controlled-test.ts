/**
 * Controlled SES production tests (owner / AWS mailbox simulator only).
 *
 * Modes:
 *   delivery  — one message to PLATFORM_OWNER / chris@iscreamstudio.com
 *   bounce    — one message to bounce@simulator.amazonses.com
 *   complaint — one message to complaint@simulator.amazonses.com
 *   all       — runs delivery + bounce + complaint sequentially
 *
 * Usage (inside sendfable-app or worker, with SES_CONTROLLED_TEST_ENABLED=true):
 *   npx tsx scripts/ses-controlled-test.ts
 *   npx tsx scripts/ses-controlled-test.ts --mode=bounce
 *   npx tsx scripts/ses-controlled-test.ts --mode=all
 *
 * Does NOT launch a public campaign. Does NOT flip launch flags.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { platformFrom, sendEmail, isDevMailMode } from "../src/lib/mailer";
import { assertSesControlledTestEnabled } from "../src/lib/campaign-send-gate";

const OWNER_TO = "chris@iscreamstudio.com";
const BOUNCE_TO = "bounce@simulator.amazonses.com";
const COMPLAINT_TO = "complaint@simulator.amazonses.com";

type Mode = "delivery" | "bounce" | "complaint" | "all";

function parseMode(): Mode {
  const arg = process.argv.find((a) => a.startsWith("--mode="));
  const raw = (arg?.split("=")[1] || "delivery").toLowerCase();
  if (raw === "bounce" || raw === "complaint" || raw === "all" || raw === "delivery") {
    return raw;
  }
  throw new Error(`Unknown mode: ${raw}`);
}

function assertEnv() {
  assertSesControlledTestEnabled();
  if (isDevMailMode()) {
    throw new Error("AWS credentials not loaded — aborting (would write outbox only)");
  }
  if (process.env.SES_CONFIGURATION_SET !== "sendfable-events") {
    throw new Error("SES_CONFIGURATION_SET must be sendfable-events");
  }
  if ((process.env.PLATFORM_SEND_DOMAIN || "") !== "send.sendfable.com") {
    throw new Error("PLATFORM_SEND_DOMAIN must be send.sendfable.com");
  }
  if (process.env.AWS_REGION !== "us-east-1") {
    throw new Error("AWS_REGION must be us-east-1 for this controlled test");
  }
}

async function sendOne(opts: {
  to: string;
  purpose: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}) {
  const result = await sendEmail({
    from: platformFrom("Sendfable"),
    to: opts.to,
    replyTo: OWNER_TO,
    subject: opts.subject,
    html: opts.bodyHtml,
    text: opts.bodyText,
    tags: { purpose: opts.purpose },
  });
  if (!result.messageId || result.dev) {
    throw new Error("SES did not accept the message");
  }
  await prisma.webhookEvent.create({
    data: {
      source: "ses-controlled-test",
      externalId: result.messageId,
      type: opts.purpose,
    },
  });
  return {
    purpose: opts.purpose,
    toDomain: opts.to.split("@")[1],
    sesMessageId: result.messageId,
  };
}

async function runDelivery() {
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL || OWNER_TO;
  if (ownerEmail.toLowerCase() !== OWNER_TO.toLowerCase()) {
    // Still allow PLATFORM_OWNER_EMAIL if it matches the documented owner domain.
    if (!ownerEmail.toLowerCase().endsWith("@iscreamstudio.com") &&
        !ownerEmail.toLowerCase().endsWith("@sendfable.com")) {
      throw new Error("Controlled delivery recipient must be an owner-controlled domain");
    }
  }
  const to = OWNER_TO;
  return sendOne({
    to,
    purpose: "controlled-delivery",
    subject: "Sendfable SES controlled delivery test",
    bodyHtml: `<div style="font-family:sans-serif;line-height:1.5">
      <p><strong>Controlled delivery test</strong></p>
      <p>Single owner-controlled SES production message. Not a marketing campaign.</p>
      <p><a href="https://sendfable.com/pricing">Pricing</a></p>
    </div>`,
    bodyText: "Controlled delivery test — Sendfable. Not a campaign launch.",
  });
}

async function runBounce() {
  return sendOne({
    to: BOUNCE_TO,
    purpose: "controlled-bounce-sim",
    subject: "Sendfable SES bounce simulator test",
    bodyHtml: `<p>AWS SES mailbox simulator bounce test — Sendfable controlled.</p>`,
    bodyText: "AWS SES mailbox simulator bounce test — Sendfable controlled.",
  });
}

async function runComplaint() {
  return sendOne({
    to: COMPLAINT_TO,
    purpose: "controlled-complaint-sim",
    subject: "Sendfable SES complaint simulator test",
    bodyHtml: `<p>AWS SES mailbox simulator complaint test — Sendfable controlled.</p>`,
    bodyText: "AWS SES mailbox simulator complaint test — Sendfable controlled.",
  });
}

async function main() {
  assertEnv();
  const mode = parseMode();
  const results = [];
  if (mode === "delivery" || mode === "all") results.push(await runDelivery());
  if (mode === "bounce" || mode === "all") results.push(await runBounce());
  if (mode === "complaint" || mode === "all") results.push(await runComplaint());

  console.log(
    JSON.stringify({
      ok: true,
      mode,
      region: process.env.AWS_REGION,
      configurationSet: process.env.SES_CONFIGURATION_SET,
      fromDomain: "send.sendfable.com",
      emailsSent: results.length,
      results,
      launched: false,
      publicFlagsUntouched: true,
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
