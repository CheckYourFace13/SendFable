import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { normalizeHomeTimezone } from "@/lib/home-timezone";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  mailingAddress: z.string().trim().max(500).optional().nullable(),
  timezone: z.string().trim().max(80).optional(),
  defaultSenderIdentityId: z.string().nullable().optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    workspace: {
      ...ctx.workspace,
      homeTimezone: ctx.workspace.timezone,
    },
    accountTimezone: ctx.user.timezone || null,
  });
}

export async function PATCH(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only admins can update settings" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (parsed.data.defaultSenderIdentityId) {
    const identity = await prisma.senderIdentity.findFirst({
      where: {
        id: parsed.data.defaultSenderIdentityId,
        workspaceId: ctx.workspace.id,
        status: "VERIFIED",
        type: "ADDRESS",
      },
    });
    if (!identity) {
      return NextResponse.json({ error: "Invalid default sender" }, { status: 400 });
    }
    await prisma.senderIdentity.updateMany({
      where: { workspaceId: ctx.workspace.id },
      data: { isDefault: false },
    });
    await prisma.senderIdentity.update({
      where: { id: identity.id },
      data: { isDefault: true },
    });
  }

  const homeTimezone =
    parsed.data.timezone === undefined
      ? undefined
      : normalizeHomeTimezone(parsed.data.timezone);
  if (parsed.data.timezone !== undefined && !homeTimezone) {
    return NextResponse.json({ error: "Choose a supported home timezone" }, { status: 400 });
  }

  if (homeTimezone) {
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { timezone: homeTimezone },
    });
  }

  const workspace = await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      name: parsed.data.name,
      mailingAddress:
        parsed.data.mailingAddress === undefined ? undefined : parsed.data.mailingAddress,
      timezone: homeTimezone,
      defaultSenderIdentityId:
        parsed.data.defaultSenderIdentityId === undefined
          ? undefined
          : parsed.data.defaultSenderIdentityId,
    },
  });

  return NextResponse.json({
    workspace: { ...workspace, homeTimezone: workspace.timezone },
  });
}

export async function DELETE() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete the workspace" }, { status: 403 });
  }

  await prisma.workspace.delete({ where: { id: ctx.workspace.id } });
  return NextResponse.json({ ok: true });
}
