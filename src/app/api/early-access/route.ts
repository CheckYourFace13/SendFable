import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().max(100).optional().nullable(),
  businessName: z.string().trim().max(200).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  contactCountApprox: z.string().trim().max(50).optional().nullable(),
  currentPlatform: z.string().trim().max(100).optional().nullable(),
  mainGoal: z.string().trim().max(500).optional().nullable(),
  consent: z.literal(true),
  websiteTrap: z.string().optional(), // honeypot — if filled, ignore as spam
  source: z.string().trim().max(80).optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit("early-access", ip, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
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
    return NextResponse.json({ ok: true, duplicate: false });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const existing = await prisma.earlyAccessLead.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await prisma.earlyAccessLead.create({
    data: {
      email,
      firstName: parsed.data.firstName || null,
      businessName: parsed.data.businessName || null,
      website: parsed.data.website || null,
      contactCountApprox: parsed.data.contactCountApprox || null,
      currentPlatform: parsed.data.currentPlatform || null,
      mainGoal: parsed.data.mainGoal || null,
      consentAt: new Date(),
      source: parsed.data.source || "early-access",
    },
  });

  // No notification email while SES is inactive (admin reviews in /admin/early-access).
  return NextResponse.json({ ok: true, duplicate: false });
}
