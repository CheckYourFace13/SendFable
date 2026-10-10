import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import { acceptFormSubmission } from "@/lib/forms/accept";
import { applyPublicFormCors, publicFormPreflight } from "@/lib/forms/cors";
import { fillTimingOk, formClientIp, formRateKey } from "@/lib/forms/policy";

const schema = z.object({
  slug: z.string().min(1).max(80),
  fields: z.record(z.union([z.string(), z.boolean()])),
  token: z.string().min(10).max(2000),
  attribution: z
    .object({
      pageUrl: z.string().max(500).optional(),
      referrer: z.string().max(500).optional(),
      utmSource: z.string().max(80).optional(),
      utmMedium: z.string().max(80).optional(),
      utmCampaign: z.string().max(80).optional(),
    })
    .optional(),
});

export function OPTIONS(req: Request) {
  return publicFormPreflight(req);
}

export async function POST(req: Request) {
  const ip = formClientIp(req.headers);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return applyPublicFormCors(req, NextResponse.json({ error: "Invalid input" }, { status: 400 }));
  }

  const perIp = await rateLimit("formSubmit", formRateKey(parsed.data.slug, ip), 10, 60);
  const perForm = await rateLimit("formSubmitTotal", parsed.data.slug, 300, 60);
  if (!perIp.ok || !perForm.ok) {
    return applyPublicFormCors(
      req,
      NextResponse.json({ error: "Too many submissions" }, { status: 429 })
    );
  }

  const token = await verifyToken("form-issue", parsed.data.token);
  if (!token || token.slug !== parsed.data.slug || !token.issuedAt || !fillTimingOk(token.issuedAt)) {
    return applyPublicFormCors(req, NextResponse.json({ error: "Please wait a moment and try again" }, { status: 400 }));
  }

  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: parsed.data.slug },
    include: { workspace: true },
  });
  if (!form) {
    return applyPublicFormCors(req, NextResponse.json({ error: "Form not found" }, { status: 404 }));
  }

  const result = await acceptFormSubmission({
    form,
    values: parsed.data.fields,
    attribution: parsed.data.attribution,
    ip,
    userAgent: req.headers.get("user-agent"),
  });
  if (!result.ok) {
    return applyPublicFormCors(req, NextResponse.json({ error: result.error }, { status: result.status }));
  }
  return applyPublicFormCors(
    req,
    NextResponse.json({ ok: true, pendingConfirm: result.pendingConfirm })
  );
}
