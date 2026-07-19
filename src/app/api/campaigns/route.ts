import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { compileEmailHtml } from "@/lib/email-compiler";
import { createSimpleDesign } from "@/lib/simple-design";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.string().max(40).optional(),
  simpleMode: z.boolean().optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      subject: true,
      scheduledAt: true,
      sentAt: true,
      completedAt: true,
      recipientCount: true,
      sentCount: true,
      openCount: true,
      clickCount: true,
      bounceCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ campaigns });
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

  const design = createSimpleDesign({
    logoUrl: ctx.workspace.logoUrl,
    primaryColor: ctx.workspace.primaryColor,
  });
  const compiledHtml = compileEmailHtml(design, {
    mailingAddress: ctx.workspace.mailingAddress,
    showSendfableBadge: true,
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      goal: parsed.data.goal,
      simpleMode: parsed.data.simpleMode ?? true,
      designJson: design as unknown as Prisma.InputJsonValue,
      compiledHtml,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
