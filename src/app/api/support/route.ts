import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { inboxForTopic } from "@/lib/support-inboxes";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { validateInquiryEmail } from "@/lib/inquiry/email";
import { inquiryEmailProblem } from "@/lib/inquiry/email-syntax";
import { classifyInquirySpam, inquiryDuplicateKey, inquiryTokenError } from "@/lib/inquiry/guard";

const schema = z.object({
  email: z.string().max(254),
  name: z.string().trim().max(120).optional().nullable(),
  topic: z.enum(["general", "billing", "abuse", "privacy", "security", "legal"]).default("general"),
  message: z.string().trim().min(10).max(5000),
  websiteTrap: z.string().optional(), // honeypot
  formToken: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  // Honeypot filled → pretend success so a bot does not retry.
  if (parsed.data.websiteTrap) {
    return NextResponse.json({ ok: true });
  }

  if (inquiryEmailProblem(parsed.data.email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const tokenError = inquiryTokenError("support", parsed.data.formToken);
  if (tokenError) {
    return NextResponse.json({ error: tokenError }, { status: 400 });
  }

  const ip = clientIp(req);
  const attempts = await rateLimit("support-attempt", ip, 20, 3600);
  if (!attempts.ok) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429, headers: { "Retry-After": String(attempts.retryAfterSec) } },
    );
  }

  const emailCheck = await validateInquiryEmail(parsed.data.email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  const rl = await rateLimit("support", ip, 8, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const dup = await rateLimit("support-dup", inquiryDuplicateKey(emailCheck.email, parsed.data.message), 1, 3600);
  if (!dup.ok) {
    return NextResponse.json(
      { error: "We already received this message. If you need to add something, change the text and send it again." },
      { status: 429 },
    );
  }

  const email = emailCheck.email;
  const topic = parsed.data.topic;
  const destination = inboxForTopic(topic);
  const spam = classifyInquirySpam(parsed.data.message) === "SPAM";

  const row = await prisma.supportMessage.create({
    data: {
      email,
      name: parsed.data.name || null,
      topic,
      message: parsed.data.message,
      status: spam ? "SPAM" : "NEW",
    },
  });

  if (spam) {
    console.log("[support] classified spam", { id: row.id, topic });
    return NextResponse.json({ ok: true });
  }

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
