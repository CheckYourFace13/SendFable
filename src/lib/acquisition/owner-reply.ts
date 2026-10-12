import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { acquisitionReplyTo } from "@/lib/acquisition/flags";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";

function plainToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#1c1917;">${escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;
}

/**
 * Owner-initiated reply from the Casey identity.
 * Nothing here runs unless the admin review page sends it.
 */
export async function sendCaseyOwnerReply(opts: {
  prospectId: string;
  subject: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const subject = opts.subject.trim();
  const body = opts.body.trim();
  if (!subject || !body) return { ok: false, reason: "empty_reply" };

  const prospect = await prisma.acquisitionProspect.findUnique({
    where: { id: opts.prospectId },
    select: { id: true, contactEmail: true, businessName: true },
  });
  if (!prospect?.contactEmail) return { ok: false, reason: "no_recipient" };

  const sender = await verifyAcquisitionSender();
  if (!sender.ok) return { ok: false, reason: `sender_not_verified:${sender.detail}` };

  await sendEmail({
    from: sender.from,
    to: prospect.contactEmail,
    replyTo: acquisitionReplyTo(),
    subject,
    text: body,
    html: plainToHtml(body),
    tags: { kind: "acquisition_owner_reply" },
  });

  await prisma.acquisitionEvent.create({
    data: {
      prospectId: prospect.id,
      type: "owner_casey_reply",
      meta: {
        subject,
        to: prospect.contactEmail,
        sent: true,
      },
    },
  });

  return { ok: true };
}
