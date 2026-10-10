import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { fetchPublicText } from "@/lib/ssrf";
import { normalizeHex } from "@/lib/autopilot/brand";
import { confirmBrand, saveBrand, suggestBrandFromHtml } from "@/lib/autopilot/commercial-account";

const schema = z.object({
  action: z.enum(["refresh", "confirm", "save"]),
  logoUrl: z.string().trim().url().max(2000).nullable().optional(),
  primaryColor: z.string().trim().max(20).optional(),
  accentColor: z.string().trim().max(20).optional(),
  fontLabel: z.enum(["Modern", "Classic"]).optional(),
  buttonStyle: z.enum(["rounded", "square"]).optional(),
});

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners and admins can update the look" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Could not save this look" }, { status: 400 });

  if (parsed.data.action === "confirm") {
    await confirmBrand(ctx.workspace.id);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "refresh") {
    const [config, workspace] = await Promise.all([
      prisma.marketingAutopilotConfig.findUnique({
        where: { workspaceId: ctx.workspace.id },
        select: { pageUrl: true },
      }),
      prisma.workspace.findUnique({
        where: { id: ctx.workspace.id },
        select: { websiteUrl: true },
      }),
    ]);
    const pageUrl = config?.pageUrl || workspace?.websiteUrl;
    if (!pageUrl) {
      return NextResponse.json({ error: "Add the page SendFable should watch first" }, { status: 400 });
    }
    try {
      const fetched = await fetchPublicText(pageUrl);
      await suggestBrandFromHtml(ctx.workspace.id, fetched.body, fetched.url, true);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not read that website" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const primary = normalizeHex(parsed.data.primaryColor);
  const accent = normalizeHex(parsed.data.accentColor);
  if (!primary || !accent || !parsed.data.fontLabel || !parsed.data.buttonStyle) {
    return NextResponse.json({ error: "Choose a color, font, and button style" }, { status: 400 });
  }
  await saveBrand({
    workspaceId: ctx.workspace.id,
    logoUrl: parsed.data.logoUrl ?? null,
    primaryColor: primary,
    accentColor: accent,
    fontLabel: parsed.data.fontLabel,
    buttonStyle: parsed.data.buttonStyle,
  });
  return NextResponse.json({ ok: true });
}
