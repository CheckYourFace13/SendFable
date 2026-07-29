import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { submitIndexNow, indexNowEnabled } from "@/lib/indexnow";

const bodySchema = z.object({
  urls: z.array(z.string().min(1).max(500)).min(1).max(100),
});

/** Owner-only IndexNow submission — never auto-spam. */
export async function POST(req: Request) {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!indexNowEnabled()) {
    return NextResponse.json({ error: "INDEXNOW_KEY unset" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await submitIndexNow(parsed.data.urls);
  return NextResponse.json(result, { status: result.ok ? 200 : 429 });
}
