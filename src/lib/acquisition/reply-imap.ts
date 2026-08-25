/**
 * Automatic reply detection via IMAP.
 *
 * Casey (casey@sendfable.com) is an alias into support@sendfable.com.
 * We poll the support mailbox and recognize acquisition replies by:
 * - To/Cc/Delivered-To/X-Original-To including casey@sendfable.com
 * - Subject matching acquisition threads
 * - Matching From to a contacted prospect
 *
 * Does NOT auto-send sales replies.
 */

import { prisma } from "@/lib/prisma";
import {
  ACQUISITION_IMAP_MAILBOX_HINT,
  ACQUISITION_SENDER_EMAIL,
  acquisitionImapConfigured,
  acquisitionImapSecure,
  acquisitionReplyTo,
} from "@/lib/acquisition/flags";
import { recordAcquisitionReply, type ReplyClass } from "@/lib/acquisition/lifecycle";
import { normalizeEmail } from "@/lib/utils";
import { alertOwnerException } from "@/lib/acquisition/notify";

const PLATFORM_IGNORE_SENDERS = new Set([
  ACQUISITION_SENDER_EMAIL,
  ACQUISITION_IMAP_MAILBOX_HINT,
  "support@sendfable.com",
  "noreply@send.sendfable.com",
  "no-reply@send.sendfable.com",
  "chris@sendfable.com",
]);

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

/** Extract recipient addresses from raw headers (To/Cc/Delivered-To/X-Original-To). */
export function extractRecipientEmails(rawSource: string): string[] {
  const headerBlock = rawSource.split(/\r?\n\r?\n/)[0] || rawSource.slice(0, 8000);
  const found = new Set<string>();
  const lines = headerBlock.replace(/\r\n[ \t]/g, " ").split(/\r?\n/);
  for (const line of lines) {
    if (!/^(to|cc|delivered-to|x-original-to|envelope-to):/i.test(line)) continue;
    const matches = line.matchAll(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi);
    for (const m of matches) found.add(normalizeEmail(m[1]));
  }
  return [...found];
}

/**
 * True when this inbox message is a reply to Casey acquisition mail
 * (even though IMAP login is support@).
 */
export function isCaseyAcquisitionInbound(opts: {
  toRecipients: string[];
  subject: string;
  fromEmail: string;
}): boolean {
  const from = normalizeEmail(opts.fromEmail);
  if (!from || PLATFORM_IGNORE_SENDERS.has(from)) return false;
  if (from.endsWith("@send.sendfable.com")) return false;

  const casey = normalizeEmail(ACQUISITION_SENDER_EMAIL);
  const addressedToCasey = opts.toRecipients.some((r) => r === casey);
  const acquisitionSubject =
    /quick question about/i.test(opts.subject) ||
    /last note\s*[—\-–]\s*sendfable/i.test(opts.subject) ||
    (/^re:\s*/i.test(opts.subject) && /sendfable/i.test(opts.subject));

  return addressedToCasey || acquisitionSubject;
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
  if (!prospect) {
    const m = subject.match(/(?:re:\s*)?quick question about\s+(.+)$/i);
    if (m) {
      const name = m[1].trim();
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
 * Poll support@ IMAP inbox for replies to casey@ acquisition mail.
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
  const secure = acquisitionImapSecure();

  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host,
    port,
    secure,
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

        const fromNorm = normalizeEmail(fromAddr);
        if (PLATFORM_IGNORE_SENDERS.has(fromNorm)) continue;
        // Ignore our own platform bounce/system noise
        if (fromNorm === normalizeEmail(acquisitionReplyTo())) continue;

        const subject = msg.envelope?.subject || "";
        const raw = msg.source ? msg.source.toString("utf8") : "";
        const recipients = extractRecipientEmails(raw);
        // Also include envelope to addresses
        for (const t of msg.envelope?.to || []) {
          if (t.address) recipients.push(normalizeEmail(t.address));
        }

        if (
          !isCaseyAcquisitionInbound({
            toRecipients: [...new Set(recipients)],
            subject,
            fromEmail: fromAddr,
          })
        ) {
          continue;
        }

        const bodyMatch = raw.split(/\r?\n\r?\n/).slice(1).join("\n").slice(0, 8000);
        const prospect = await matchProspectFromReply(fromAddr, subject, bodyMatch);
        if (!prospect) continue;

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
            `Prospect: ${prospect.businessName}\nDomain: ${prospect.domain}\nClass: ${replyClass}\nFrom: ${fromAddr}\n\nReview: /admin/acquisition/${prospect.id}\n\nDo not auto-reply — respond personally as Casey.`
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

/** Connectivity-only IMAP login check (no message processing). */
export async function testAcquisitionImapLogin(): Promise<{ ok: boolean; detail: string }> {
  if (!acquisitionImapConfigured()) {
    return { ok: false, detail: "imap_not_configured" };
  }
  const host = process.env.SENDFABLE_ACQUISITION_IMAP_HOST!.trim();
  const user = process.env.SENDFABLE_ACQUISITION_IMAP_USER!.trim();
  const pass = process.env.SENDFABLE_ACQUISITION_IMAP_PASS!.trim();
  const port = Number(process.env.SENDFABLE_ACQUISITION_IMAP_PORT || 993);
  const secure = acquisitionImapSecure();
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
  });
  try {
    await client.connect();
    await client.logout();
    return { ok: true, detail: "imap_login_ok" };
  } catch (err) {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    return { ok: false, detail: err instanceof Error ? err.message : "imap_login_failed" };
  }
}
