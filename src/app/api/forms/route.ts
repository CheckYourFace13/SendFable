import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { slugify, randomToken } from "@/lib/utils";

const fieldSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  type: z.enum(["email", "text", "checkbox"]),
  required: z.boolean(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  fields: z.array(fieldSchema).min(1).max(20).optional(),
  doubleOptIn: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const forms = await prisma.signupForm.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ forms });
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

  const fields = parsed.data.fields ?? [
    { key: "email", label: "Email", type: "email" as const, required: true },
    { key: "firstName", label: "First name", type: "text" as const, required: false },
  ];

  let hostedSlug = slugify(parsed.data.name) || "form";
  const clash = await prisma.signupForm.findUnique({ where: { hostedSlug } });
  if (clash) hostedSlug = `${hostedSlug}-${randomToken(4)}`;

  const form = await prisma.signupForm.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      fields,
      doubleOptIn: parsed.data.doubleOptIn ?? false,
      tagIds: parsed.data.tagIds ?? [],
      hostedSlug,
    },
  });

  return NextResponse.json({ form }, { status: 201 });
}
