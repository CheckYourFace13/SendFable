import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  mailingAddress: z.string().trim().max(500).optional().nullable(),
  timezone: z.string().trim().max(80).optional(),
  defaultSenderIdentityId: z.string().nullable().optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ workspace: ctx.workspace });
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

  const workspace = await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      name: parsed.data.name,
      mailingAddress:
        parsed.data.mailingAddress === undefined ? undefined : parsed.data.mailingAddress,
      timezone: parsed.data.timezone,
      defaultSenderIdentityId:
        parsed.data.defaultSenderIdentityId === undefined
          ? undefined
          : parsed.data.defaultSenderIdentityId,
    },
  });

  return NextResponse.json({ workspace });
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
