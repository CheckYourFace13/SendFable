import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  categoryToTryType,
  defaultTryConfig,
  sanitizeTryConfig,
  TRY_BUSINESS_TYPES,
  TRY_INTENT_EVENTS,
} from "@/lib/try-signup/config";
import { markTryIntent } from "@/lib/try-signup/follow-up";

const saveSchema = z.object({
  token: z.string().trim().min(8).max(64).optional(),
  config: z.record(z.unknown()).optional(),
  event: z.enum(TRY_INTENT_EVENTS).optional(),
  category: z.string().trim().max(40).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    const type = categoryToTryType(url.searchParams.get("type") || url.searchParams.get("category"));
    return NextResponse.json({ config: defaultTryConfig(type), token: null });
  }
  const draft = await prisma.trySignupDraft.findUnique({ where: { token } });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    token: draft.token,
    config: sanitizeTryConfig(draft.config),
    claimed: Boolean(draft.claimedAt),
  });
}

export async function POST(req: Request) {
  const rl = await rateLimit("try-signup", clientIp(req), 40, 3600);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let draft = parsed.data.token
    ? await prisma.trySignupDraft.findUnique({ where: { token: parsed.data.token } })
    : null;

  const type = TRY_BUSINESS_TYPES.includes(parsed.data.category as never)
    ? (parsed.data.category as (typeof TRY_BUSINESS_TYPES)[number])
    : categoryToTryType(parsed.data.category);
  const config = sanitizeTryConfig(parsed.data.config || draft?.config || defaultTryConfig(type));

  if (!draft) {
    draft = await prisma.trySignupDraft.create({
      data: {
        token: randomToken(18),
        config,
      },
    });
  } else if (!draft.claimedAt) {
    draft = await prisma.trySignupDraft.update({
      where: { id: draft.id },
      data: { config },
    });
  }

  if (parsed.data.event && !draft.claimedAt) {
    await markTryIntent({ token: draft.token, event: parsed.data.event });
  }

  return NextResponse.json({
    token: draft.token,
    config: sanitizeTryConfig(draft.config),
    claimed: Boolean(draft.claimedAt),
  });
}
