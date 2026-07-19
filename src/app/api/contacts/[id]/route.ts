import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { unsubscribeContact } from "@/lib/suppression";

const patchSchema = z.object({
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  customFields: z.record(z.string()).optional(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "PENDING_CONFIRM"]).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: { tags: { include: { tag: true } } },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.status === "UNSUBSCRIBED" && existing.status !== "UNSUBSCRIBED") {
    await unsubscribeContact(ctx.workspace.id, existing.email, "manual");
  }

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      firstName: parsed.data.firstName === undefined ? undefined : parsed.data.firstName,
      lastName: parsed.data.lastName === undefined ? undefined : parsed.data.lastName,
      customFields: parsed.data.customFields,
      status: parsed.data.status,
      unsubscribedAt: parsed.data.status === "UNSUBSCRIBED" ? new Date() : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
