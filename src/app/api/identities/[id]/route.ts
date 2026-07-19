import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { deleteSesDomainIdentity } from "@/lib/ses-domains";

const patchSchema = z.object({ isDefault: z.literal(true) });

async function findOwned(id: string, workspaceId: string) {
  return prisma.senderIdentity.findFirst({ where: { id, workspaceId } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const identity = await findOwned(params.id, ctx.workspace.id);
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (identity.status !== "VERIFIED" || identity.type !== "ADDRESS") {
    return NextResponse.json({ error: "Only verified addresses can be default" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.senderIdentity.updateMany({
      where: { workspaceId: ctx.workspace.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.senderIdentity.update({ where: { id: identity.id }, data: { isDefault: true } }),
    prisma.workspace.update({
      where: { id: ctx.workspace.id },
      data: { defaultSenderIdentityId: identity.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const identity = await findOwned(params.id, ctx.workspace.id);
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inUse = await prisma.campaign.count({
    where: {
      senderIdentityId: identity.id,
      status: { in: ["SCHEDULED", "SENDING", "PAUSED"] },
    },
  });
  if (inUse > 0) {
    return NextResponse.json(
      { error: "This identity is used by an active campaign. Pause or cancel it first." },
      { status: 409 }
    );
  }

  if (identity.type === "DOMAIN") {
    await deleteSesDomainIdentity(identity.value);
  }
  await prisma.senderIdentity.delete({ where: { id: identity.id } });
  return NextResponse.json({ ok: true });
}
