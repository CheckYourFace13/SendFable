import { sendEmail, platformFrom } from "@/lib/mailer";
import { acquisitionOwnerAlertEmail } from "@/lib/acquisition/flags";
import { prisma } from "@/lib/prisma";

/**
 * Exception-only owner alerts (no daily noise).
 */
export async function alertOwnerException(subject: string, body: string): Promise<void> {
  const to = acquisitionOwnerAlertEmail();
  if (!to) {
    console.warn("[acquisition] alert skipped — no OWNER_ALERT_EMAIL", subject);
    return;
  }
  try {
    await sendEmail({
      from: platformFrom("SendFable Acquisition"),
      to,
      subject,
      text: body,
      html: `<pre style="font-family:monospace;font-size:13px;">${body.replace(/</g, "&lt;")}</pre>`,
      tags: { kind: "acquisition_alert" },
    });
    await prisma.acquisitionEvent.create({
      data: { type: "owner_alert", meta: { subject } },
    });
  } catch (err) {
    console.error("[acquisition] alert failed", err);
  }
}
