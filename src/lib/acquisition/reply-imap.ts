/**
 * Automatic reply detection via IMAP (Reply-To mailbox).
 * Requires SENDFABLE_ACQUISITION_IMAP_HOST/USER/PASS.
 * Does NOT auto-send sales replies.
 */

import { prisma } from "@/lib/prisma";
import {
  acquisitionImapConfigured,
  acquisitionReplyTo,
} from "@/lib/acquisition/flags";
import { recordAcquisitionReply, type ReplyClass } from "@/lib/acquisition/lifecycle";
import { normalizeEmail } from "@/lib/utils";
import { alertOwnerException } from "@/lib/acquisition/notify";

export function classifyReplyBody(text: string): ReplyClass {
  const t = text.toLowerCase().slice(0, 4000);
  if (
    /\b(unsubscribe|remove me|opt[- ]?out|stop emailing|no thanks|don't contact)\b/.test(t)
  ) {
    return "UNSUBSCRIBE";
  }
  if (
    /\b(not interested|no interest|please stop|leave me alone|don't email)\b/.test(t)
  ) {
    return "NOT_INTERESTED";
  }
  if (/\b(not now|maybe later|next quarter|busy right now|try again later)\b/.test(t)) {
    return "NOT_NOW";
  }
  if (/\?/.test(t) || /\b(how|what|when|where|can you|do you)\b/.test(t)) {
    return "QUESTION";
  }
  if (
    /\b(interested|sounds good|tell me more|demo|let'?s talk|yes please|sure,? let'?s)\b/.test(t)
  ) {
    return "POSITIVE";
  }
  return "OTHER";
}

async function matchProspectFromReply(fromEmail: string, subject: string, body: string) {
  const email = normalizeEmail(fromEmail);
  const domain = email.split("@")[1] || "";

  let prospect = await prisma.acquisitionProspect.findFirst({
    where: {
      contactEmail: email,
      status: {
        in: ["CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "QUEUED", "OUTREACH_COMPLETE"],
      },
    },
  });
  if (!prospect && domain) {
    prospect = await prisma.acquisitionProspect.findFirst({
      where: {
        domain,
        status: {
          in: ["CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "QUEUED", "OUTREACH_COMPLETE"],
        },
      },
      orderBy: { lastContactedAt: "desc" },
    });
  }
  // Subject: Quick question about [Business]
  if (!prospect) {
    const m = subject.match(/quick question about\s+(.+)$/i);
    if (m) {
      const name = m[1].replace(/^re:\s*/i, "").trim();
      prospect = await prisma.acquisitionProspect.findFirst({
        where: {
          businessName: { equals: name, mode: "insensitive" },
          status: {
            in: ["CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "OUTREACH_COMPLETE"],
          },
        },
      });
    }
  }
  void body;
  return prospect;
}

/**
 * Poll IMAP inbox for replies since last UID/watermark.
 * Safe no-op when IMAP not configured.
 */
export async function pollAcquisitionReplies(): Promise<{
  ok: boolean;
  reason?: string;
  processed: number;
}> {
  if (!acquisitionImapConfigured()) {
    return { ok: false, reason: "imap_not_configured", processed: 0 };
  }

  const host = process.env.SENDFABLE_ACQUISITION_IMAP_HOST!.trim();
  const user = process.env.SENDFABLE_ACQUISITION_IMAP_USER!.trim();
  const pass = process.env.SENDFABLE_ACQUISITION_IMAP_PASS!.trim();
  const port = Number(process.env.SENDFABLE_ACQUISITION_IMAP_PORT || 993);

  // Dynamic import so builds without runtime IMAP still work
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
  });

  let processed = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      for await (const msg of client.fetch(
        { seen: false, since },
        { envelope: true, source: true, uid: true }
      )) {
        const fromAddr =
          msg.envelope?.from?.[0]?.address ||
          msg.envelope?.replyTo?.[0]?.address ||
          "";
        if (!fromAddr) continue;
        // Ignore our own sends mirrored
        const replyTo = acquisitionReplyTo().toLowerCase();
        if (normalizeEmail(fromAddr) === normalizeEmail(replyTo)) continue;

        const subject = msg.envelope?.subject || "";
        const raw = msg.source ? msg.source.toString("utf8") : "";
        const bodyMatch = raw.split(/\r?\n\r?\n/).slice(1).join("\n").slice(0, 8000);
        const prospect = await matchProspectFromReply(fromAddr, subject, bodyMatch);
        if (!prospect) continue;

        // Idempotency: skip if already replied/terminal
        if (
          ["REPLIED", "INTERESTED", "NOT_INTERESTED", "UNSUBSCRIBED", "SIGNED_UP", "PAID"].includes(
            prospect.status
          )
        ) {
          continue;
        }

        const replyClass = classifyReplyBody(`${subject}\n${bodyMatch}`);
        await recordAcquisitionReply({ prospectId: prospect.id, replyClass });
        processed++;

        if (replyClass === "POSITIVE" || replyClass === "QUESTION") {
          await alertOwnerException(
            `SendFable acquisition reply: ${replyClass} — ${prospect.businessName}`,
            `Prospect: ${prospect.businessName}\nDomain: ${prospect.domain}\nClass: ${replyClass}\nFrom: ${fromAddr}\n\nReview: /admin/acquisition/${prospect.id}\n\nDo not auto-reply — respond personally.`
          );
        }

        try {
          await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);
        } catch {
          /* ignore */
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, processed };
  } catch (err) {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "imap_error",
      processed,
    };
  }
}
