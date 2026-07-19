import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/session";
import { importBrandFromWebsite } from "@/lib/brand-import";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  url: z.string().url().max(500),
});

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("brandImport", ctx.user.id || clientIp(req), 10, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many import attempts" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid website URL" }, { status: 400 });
  }

  try {
    const suggestions = await importBrandFromWebsite(parsed.data.url);
    await writeAuditLog({
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: "brand.import_preview",
      meta: { url: suggestions.sourceUrl },
      ip: clientIp(req),
    });
    return NextResponse.json({
      suggestions,
      note: "These are suggestions only. Review and save what you want to keep.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not read that website",
        suggestions: null,
      },
      { status: 400 }
    );
  }
}
