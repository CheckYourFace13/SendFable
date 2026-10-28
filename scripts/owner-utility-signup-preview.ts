/**
 * Owner-only preview of the current utility_signup Casey initial.
 * Does not create a prospect, message, click, or follow-up.
 */
import { renderUtilitySignupEmail } from "@/lib/acquisition/utility-email";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";
import { acquisitionReplyTo } from "@/lib/acquisition/flags";
import { sendEmail } from "@/lib/mailer";

const OWNER = "chris@iscreamstudio.com";

async function main() {
  const sender = await verifyAcquisitionSender();
  if (!sender.ok) throw new Error(`sender_not_verified:${sender.detail}`);

  const cta =
    "https://sendfable.com/try/signup-tool?utm_source=casey&utm_medium=email&utm_campaign=acquisition&utm_content=utility_signup&utm_term=owner_test";
  const unsubUrl = "https://sendfable.com/api/acquisition/unsubscribe?owner_test=1";
  const mail = renderUtilitySignupEmail({
    businessName: "KarPool Band",
    category: "band",
    ctaUrl: cta,
    unsubUrl,
  });

  const result = await sendEmail({
    from: sender.from,
    envelopeFrom: sender.envelopeFrom,
    to: OWNER,
    replyTo: acquisitionReplyTo(),
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    tags: { kind: "owner_preview", variant: "utility_signup" },
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>`,
    },
  });

  if (result.dev || !result.messageId) throw new Error("provider_did_not_accept");

  console.log(
    JSON.stringify(
      {
        sentTo: OWNER,
        subject: mail.subject,
        from: sender.from,
        envelopeFrom: sender.envelopeFrom,
        replyTo: acquisitionReplyTo(),
        variant: "utility_signup",
        cta,
        sesMessageId: result.messageId,
        providerAccepted: true,
        prospectCreated: false,
        followUpScheduled: false,
        countedTowardCaps: false,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "owner_preview_failed");
  process.exit(1);
});
