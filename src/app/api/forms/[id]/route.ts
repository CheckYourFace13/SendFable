import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { appUrl } from "@/lib/utils";

const fieldSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  type: z.enum(["email", "text", "checkbox"]),
  required: z.boolean(),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  fields: z.array(fieldSchema).min(1).max(20).optional(),
  doubleOptIn: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  hostedSlug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await prisma.signupForm.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hostedUrl = appUrl(`/f/${form.hostedSlug}`);
  const embedCode = `<iframe src="${hostedUrl}?embed=1" style="width:100%;max-width:420px;height:360px;border:0;" title="${form.name}"></iframe>`;

  return NextResponse.json({ form, hostedUrl, embedCode });
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

  const existing = await prisma.signupForm.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.hostedSlug && parsed.data.hostedSlug !== existing.hostedSlug) {
    const clash = await prisma.signupForm.findUnique({
      where: { hostedSlug: parsed.data.hostedSlug },
    });
    if (clash) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
  }

  const form = await prisma.signupForm.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      fields: parsed.data.fields,
      doubleOptIn: parsed.data.doubleOptIn,
      tagIds: parsed.data.tagIds,
      hostedSlug: parsed.data.hostedSlug,
    },
  });

  return NextResponse.json({ form });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.signupForm.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.signupForm.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
