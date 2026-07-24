/**
 * Operational alert sender — emails the owner via SES.
 *
 * Usage: node scripts/ops-alert.js "<subject>" "<body>"
 *
 * Requires OWNER_ALERT_EMAIL (a verified identity while SES is in sandbox).
 * Sends from alerts@PLATFORM_SEND_DOMAIN. Never include contact-level PII,
 * message bodies, or credentials in alert text.
 */
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

async function main() {
  const [subject, body] = process.argv.slice(2);
  if (!subject) {
    console.error("Usage: node scripts/ops-alert.js <subject> [body]");
    process.exit(2);
  }
  const to = process.env.OWNER_ALERT_EMAIL;
  if (!to) {
    console.error("OWNER_ALERT_EMAIL is not set — alert not sent:", subject);
    process.exit(3);
  }
  const domain = process.env.PLATFORM_SEND_DOMAIN || "send.sendfable.com";
  const ses = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: `Sendfable Ops <alerts@${domain}>`,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: `[sendfable-ops] ${subject}`.slice(0, 200) },
          Body: {
            Text: {
              Data: `${body || subject}\n\nHost: sendfable VPS\nTime: ${new Date().toISOString()}`,
            },
          },
        },
      },
      ConfigurationSetName: process.env.SES_CONFIGURATION_SET || undefined,
    })
  );
  console.log("alert sent:", subject);
}

main().catch((err) => {
  console.error("ops-alert failed:", err.message);
  process.exit(1);
});
