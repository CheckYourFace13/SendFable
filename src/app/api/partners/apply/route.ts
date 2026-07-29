import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(160).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  partnerType: z.string().trim().min(2).max(64),
  audienceNote: z.string().trim().max(2000).optional().nullable(),
  website_url: z.string().optional().nullable(), // honeypot
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit("partner-apply", ip, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }

  if (parsed.data.website_url) {
    return NextResponse.json({ ok: true }); // honeypot
  }

  await prisma.partnerApplication.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company || null,
      website: parsed.data.website || null,
      partnerType: parsed.data.partnerType,
      audienceNote: parsed.data.audienceNote || null,
      status: "NEW",
    },
  });

  return NextResponse.json({ ok: true });
}
