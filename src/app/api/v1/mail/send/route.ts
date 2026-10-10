import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { requireIntegrationAuth } from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

/**
 * First-party transactional owner notify (not campaign mail).
 * Uses the existing SES mailer path. Authenticated via integration credentials.
 *
 * POST /api/v1/mail/send
 *
 * Acceptance means SES (or the configured transport) accepted the message —
 * not confirmed inbox delivery.
 */
const schema = z.object({
  to: z.string().email().max(200),
  replyTo: z.string().email().max(200).optional(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(50_000),
  html: z.string().trim().max(100_000).optional(),
  /** Display name only; From always uses PLATFORM_SEND_DOMAIN. */
  fromName: z.string().trim().min(1).max(80).optional(),
  kind: z.enum(["owner_notify", "transactional"]).default("owner_notify"),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return `<pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111827;margin:0;">${escapeHtml(text)}</pre>`;
}

export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const to = normalizeEmail(parsed.data.to);
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Valid to address required" }, { status: 400 });
  }

  const replyTo = parsed.data.replyTo
    ? normalizeEmail(parsed.data.replyTo)
    : undefined;
  if (replyTo && !isValidEmail(replyTo)) {
    return NextResponse.json({ error: "Valid replyTo required" }, { status: 400 });
  }

  const fromName =
    parsed.data.fromName?.trim() ||
    auth.workspace.name?.trim() ||
    "Sendfable";

  const html = parsed.data.html?.trim() || textToHtml(parsed.data.text);

  try {
    const result = await sendEmail({
      from: platformFrom(fromName),
      to,
      replyTo,
      subject: parsed.data.subject,
      text: parsed.data.text,
      html,
      noConfigurationSet: true,
      tags: {
        purpose: parsed.data.kind,
        workspace: auth.workspace.id.slice(0, 32),
        source: (auth.source || "integration").slice(0, 32),
      },
    });

    console.log("[v1/mail/send] accepted", {
      workspaceId: auth.workspace.id,
      kind: parsed.data.kind,
      messageId: result.messageId,
      dev: result.dev,
    });

    return NextResponse.json({
      ok: true,
      accepted: true,
      /** SES MessageId (or local outbox id in dev). Not inbox confirmation. */
      messageId: result.messageId,
      inboxConfirmed: false,
      provider: result.dev ? "dev_outbox" : "ses",
    });
  } catch (err) {
    console.error("[v1/mail/send] provider rejected", {
      workspaceId: auth.workspace.id,
      kind: parsed.data.kind,
      name: err instanceof Error ? err.name : "error",
    });
    return NextResponse.json(
      { error: "Email provider rejected the message", accepted: false },
      { status: 502 }
    );
  }
}
