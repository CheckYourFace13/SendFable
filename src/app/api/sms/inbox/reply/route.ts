import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getApiContext } from "@/lib/session";
import {
  SmsFeatureDisabledError,
  isSmsAccountSignupEnabled,
  isSmsCodeEnabled,
  isSmsReplyEnabled,
} from "@/lib/sms/flags";
import { sendReplySms } from "@/lib/sms/send";

const schema = z.object({
  contactId: z.string().min(1),
  body: z.string().trim().min(1).max(1600),
});

/**
 * Business reply from the SendFable Inbox. Server-side gated by the reply
 * flag; each reply is an outbound message billed at the plan outbound rate.
 */
export async function POST(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled() || !isSmsReplyEnabled()) {
    return NextResponse.json({ error: "Replies are not available yet" }, { status: 403 });
  }
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const outcome = await sendReplySms({
      workspaceId: ctx.workspace.id,
      contactId: parsed.data.contactId,
      body: parsed.data.body,
      idempotencyKey: `reply:${ctx.workspace.id}:${randomUUID()}`,
    });
    if (outcome.status !== "sent") {
      return NextResponse.json({ error: outcome.reason ?? "Reply failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, segments: outcome.segments });
  } catch (err) {
    if (err instanceof SmsFeatureDisabledError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
