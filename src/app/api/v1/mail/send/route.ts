import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { requireIntegrationAuth } from "@/lib/integration-auth";
import { prisma } from "@/lib/prisma";
import { formatWorkspaceFrom, identityAllowsFrom, safeDisplayName } from "@/lib/workspace-from";

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
  /** Display name. The address stays on the shared platform domain unless `from` is set. */
  fromName: z.string().trim().min(1).max(80).optional(),
  /**
   * Optional From address. Honored only when this workspace has a verified
   * identity for that exact address or domain. Other workspaces keep the
   * shared platform sender when this field is omitted.
   */
  from: z.string().email().max(200).optional(),
  /** HTTPS List-Unsubscribe URL. Not used as the From address. */
  listUnsubscribe: z.string().trim().url().max(500).optional(),
  /**
   * When true, send through the SES configuration set so delivery, bounce, and
   * complaint events can be stored for this workspace. Default mail stays off
   * that path.
   */
  trackDelivery: z.boolean().optional(),
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

  const fromName = safeDisplayName(
    parsed.data.fromName?.trim() || auth.workspace.name?.trim() || "SendFable",
  );

  let from = platformFrom(fromName);
  if (parsed.data.from) {
    const fromEmail = normalizeEmail(parsed.data.from);
    if (!isValidEmail(fromEmail)) {
      return NextResponse.json({ error: "Valid from address required" }, { status: 400 });
    }
    const identities = await prisma.senderIdentity.findMany({
      where: { workspaceId: auth.workspace.id },
      select: { type: true, value: true, status: true },
    });
    if (!identityAllowsFrom(identities, fromEmail)) {
      return NextResponse.json(
        { error: "From address is not a verified identity for this workspace" },
        { status: 403 },
      );
    }
    from = formatWorkspaceFrom(fromName, fromEmail);
  }

  const listUnsubscribe = parsed.data.listUnsubscribe;
  if (listUnsubscribe && !listUnsubscribe.startsWith("https://")) {
    return NextResponse.json({ error: "List-Unsubscribe must be https" }, { status: 400 });
  }

  const html = parsed.data.html?.trim() || textToHtml(parsed.data.text);

  try {
    const result = await sendEmail({
      from,
      to,
      replyTo,
      subject: parsed.data.subject,
      text: parsed.data.text,
      html,
      headers: listUnsubscribe ? { "List-Unsubscribe": `<${listUnsubscribe}>` } : undefined,
      noConfigurationSet: parsed.data.trackDelivery !== true,
      tags: {
        purpose: parsed.data.kind,
        workspace: auth.workspace.id.slice(0, 32),
      },
    });

    if (parsed.data.trackDelivery && result.messageId) {
      await prisma.webhookEvent.create({
        data: {
          source: "integration-send",
          externalId: result.messageId,
          type: auth.workspace.id,
        },
      }).catch(() => undefined);
    }

    console.log("[v1/mail/send] accepted", {
      workspaceId: auth.workspace.id,
      kind: parsed.data.kind,
      messageId: result.messageId,
      dev: result.dev,
      trackDelivery: parsed.data.trackDelivery === true,
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
