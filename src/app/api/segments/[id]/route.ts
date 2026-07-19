import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { segmentSchema } from "@/lib/validators/audience";
import { countSegmentContacts, parseSegmentRules } from "@/lib/segments";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segment = await prisma.segment.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await countSegmentContacts(ctx.workspace.id, parseSegmentRules(segment.rules));
  return NextResponse.json({ segment, count });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = segmentSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.segment.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const segment = await prisma.segment.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      rules: parsed.data.rules,
    },
  });
  return NextResponse.json({ segment });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.segment.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.segment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
