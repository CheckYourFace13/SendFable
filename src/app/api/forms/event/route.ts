import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { applyPublicFormCors, publicFormPreflight } from "@/lib/forms/cors";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const eventSchema = z.object({
  slug: z.string().trim().min(2).max(48).regex(/^[a-z0-9-]+$/),
  type: z.enum(["popup_shown", "popup_closed", "form_started", "form_submitted", "badge_clicked"]),
  display: z.enum(["inline", "popup"]).optional(),
});

export function OPTIONS(req: Request) {
  return publicFormPreflight(req);
}

export async function POST(req: Request) {
  const rl = await rateLimit("tracking", clientIp(req), RATE_LIMITS.tracking.limit, RATE_LIMITS.tracking.windowSec);
  if (!rl.ok) {
    return applyPublicFormCors(req, NextResponse.json({ error: "Too many events" }, { status: 429 }));
  }
  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return applyPublicFormCors(req, NextResponse.json({ error: "Invalid" }, { status: 400 }));
  }
  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: parsed.data.slug },
    select: { id: true, workspaceId: true, status: true },
  });
  if (!form || form.status === "ARCHIVED") {
    return applyPublicFormCors(req, NextResponse.json({ ok: true }));
  }
  await prisma.signupFormEvent.create({
    data: {
      workspaceId: form.workspaceId,
      formId: form.id,
      type: parsed.data.type,
      display: parsed.data.display || "inline",
    },
  });
  return applyPublicFormCors(req, NextResponse.json({ ok: true }));
}
