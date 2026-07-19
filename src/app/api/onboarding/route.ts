import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { randomToken } from "@/lib/utils";

const patchSchema = z.object({
  step: z.number().int().min(0).max(10).optional(),
  data: z.record(z.unknown()).optional(),
  complete: z.boolean().optional(),
  skip: z.boolean().optional(),
  workspace: z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      websiteUrl: z.string().url().max(500).optional().nullable(),
      mailingAddress: z.string().trim().max(500).optional().nullable(),
      businessDescription: z.string().max(2000).optional().nullable(),
      logoUrl: z.string().max(500).optional().nullable(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ensure referral code exists
  if (!ws.referralCode) {
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { referralCode: randomToken(6).slice(0, 8) },
    });
  }

  const [senders, contacts, campaigns] = await Promise.all([
    prisma.senderIdentity.count({
      where: { workspaceId: ws.id, status: "VERIFIED", type: "ADDRESS" },
    }),
    prisma.contact.count({ where: { workspaceId: ws.id } }),
    prisma.campaign.count({ where: { workspaceId: ws.id } }),
  ]);

  return NextResponse.json({
    step: ws.onboardingStep,
    completedAt: ws.onboardingCompletedAt,
    data: ws.onboardingData,
    workspace: {
      name: ws.name,
      websiteUrl: ws.websiteUrl,
      mailingAddress: ws.mailingAddress,
      logoUrl: ws.logoUrl,
      primaryColor: ws.primaryColor,
      secondaryColor: ws.secondaryColor,
      businessDescription: ws.businessDescription,
    },
    progress: { verifiedSenders: senders, contacts, campaigns },
  });
}

export async function PATCH(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextData = {
    ...((existing.onboardingData as Record<string, unknown>) || {}),
    ...(parsed.data.data || {}),
  };

  const workspace = await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      onboardingStep: parsed.data.step,
      onboardingData: nextData as Prisma.InputJsonValue,
      onboardingCompletedAt:
        parsed.data.complete || parsed.data.skip ? new Date() : undefined,
      name: parsed.data.workspace?.name,
      websiteUrl:
        parsed.data.workspace?.websiteUrl === undefined
          ? undefined
          : parsed.data.workspace.websiteUrl,
      mailingAddress:
        parsed.data.workspace?.mailingAddress === undefined
          ? undefined
          : parsed.data.workspace.mailingAddress,
      businessDescription:
        parsed.data.workspace?.businessDescription === undefined
          ? undefined
          : parsed.data.workspace.businessDescription,
      logoUrl:
        parsed.data.workspace?.logoUrl === undefined
          ? undefined
          : parsed.data.workspace.logoUrl,
      primaryColor: parsed.data.workspace?.primaryColor,
      secondaryColor: parsed.data.workspace?.secondaryColor,
    },
  });

  return NextResponse.json({
    step: workspace.onboardingStep,
    completedAt: workspace.onboardingCompletedAt,
    data: workspace.onboardingData,
  });
}
