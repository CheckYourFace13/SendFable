import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { compileEmailHtml, createEmptyDesign, type EmailDesign } from "@/lib/email-compiler";
import { PLANS } from "@/lib/plans";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  designJson: z.any().optional(),
});

export async function GET(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const includePlatform = url.searchParams.get("platform") !== "0";
  const category = url.searchParams.get("category")?.trim() || undefined;
  const goal = url.searchParams.get("goal")?.trim() || undefined;

  const workspaceTemplates = await prisma.template.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: "desc" },
  });

  let platformTemplates: typeof workspaceTemplates = [];
  if (includePlatform) {
    platformTemplates = await prisma.template.findMany({
      where: {
        isPlatform: true,
        workspaceId: null,
        ...(category ? { category } : {}),
        ...(goal ? { goal } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  return NextResponse.json({
    templates: [...platformTemplates, ...workspaceTemplates],
    platform: platformTemplates,
    workspace: workspaceTemplates,
  });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const design = (parsed.data.designJson as EmailDesign) ?? createEmptyDesign();
  const compiledHtml = compileEmailHtml(design, {
    businessName: ctx.workspace.name,
    mailingAddress: ctx.workspace.mailingAddress,
    showSendfableBadge: PLANS[owner.plan].badge,
  });

  const template = await prisma.template.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      designJson: design as unknown as Prisma.InputJsonValue,
      compiledHtml,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
