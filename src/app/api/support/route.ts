import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/utils";

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

  await prisma.supportMessage.create({
    data: {
      email,
      name: parsed.data.name || null,
      topic: parsed.data.topic,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ ok: true });
}
