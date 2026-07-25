import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { inboxForTopic } from "@/lib/support-inboxes";
import { platformFrom, sendEmail } from "@/lib/mailer";

const schema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional().nullable(),
  topic: z.enum(["general", "billing", "abuse", "privacy", "security", "legal"]).default("general"),
  message: z.string().trim().min(10).max(5000),
  websiteTrap: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit("support", ip, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Honeypot filled → pretend success (spam)
  if (parsed.data.websiteTrap) {
    return NextResponse.json({ ok: true });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const topic = parsed.data.topic;
  const destination = inboxForTopic(topic);

  const row = await prisma.supportMessage.create({
    data: {
      email,
      name: parsed.data.name || null,
      topic,
      message: parsed.data.message,
    },
  });

  // While SES is sandboxed, topic mailboxes cannot receive SES mail unless
  // verified. Notify the verified OWNER_ALERT_EMAIL and label the intended
  // destination. Never log the message body or submitter email.
  const notifyTo =
    process.env.SUPPORT_NOTIFY_EMAIL?.trim() ||
    process.env.OWNER_ALERT_EMAIL?.trim() ||
    null;

  if (notifyTo) {
    try {
      const safeBody = parsed.data.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      await sendEmail({
        from: platformFrom("Sendfable Support"),
        to: notifyTo,
        replyTo: email,
        subject: `[Sendfable ${topic}] → ${destination} (#${row.id.slice(-8)})`,
        text: [
          `Topic: ${topic}`,
          `Route to: ${destination}`,
          `From name: ${parsed.data.name || "(none)"}`,
          `SupportMessage id: ${row.id}`,
          "",
          parsed.data.message,
        ].join("\n"),
        html: `<p><strong>Topic:</strong> ${topic}<br/><strong>Route to:</strong> ${destination}<br/><strong>Id:</strong> ${row.id}</p><p>${safeBody}</p>`,
        noConfigurationSet: true,
      });
      console.log("[support] notified", { id: row.id, topic, destination });
    } catch {
      console.error("[support] notify failed", { id: row.id, topic });
    }
  } else {
    console.warn("[support] no notify target configured", { id: row.id, topic });
  }

  return NextResponse.json({ ok: true });
}
