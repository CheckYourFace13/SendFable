import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { PLANS } from "@/lib/plans";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  designJson: z.any().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const template = await prisma.template.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
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

  const existing = await prisma.template.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  let compiledHtml: string | undefined;
  if (parsed.data.designJson) {
    compiledHtml = compileEmailHtml(parsed.data.designJson as EmailDesign, {
      mailingAddress: ctx.workspace.mailingAddress,
      showSendfableBadge: PLANS[owner.plan].badge,
    });
  }

  const template = await prisma.template.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      designJson: parsed.data.designJson,
      compiledHtml,
    },
  });
  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.template.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.template.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
