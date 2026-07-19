import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { tagSchema } from "@/lib/validators/audience";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = tagSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.tag.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tag = await prisma.tag.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
    },
  });
  return NextResponse.json({ tag });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.tag.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tag.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
