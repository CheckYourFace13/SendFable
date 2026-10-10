import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { slugify, randomToken } from "@/lib/utils";
import { FORM_PRESETS } from "@/lib/form-presets";
import { normalizeFormFields, requirementModeFor, defaultNewsletterFields } from "@/lib/forms/fields";
import { audienceIds, fieldSummary } from "@/lib/forms/manage";

const fieldSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  type: z.enum(["email", "text", "checkbox", "phone"]),
  required: z.boolean(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  fields: z.array(fieldSchema).min(1).max(20).optional(),
  doubleOptIn: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  /** Preset: "email" (default) | "text" | "email-and-text" */
  preset: z.enum(["email", "text", "email-and-text"]).optional(),
  requirementMode: z
    .enum(["email-required", "phone-required", "either-required", "both-required"])
    .optional(),
  collectPhone: z.boolean().optional(),
});


export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [forms, tags] = await Promise.all([
    prisma.signupForm.findMany({
      where: { workspaceId: ctx.workspace.id, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { id: true, name: true },
    }),
  ]);
  const names = new Map(tags.map((tag) => [tag.id, tag.name]));
  return NextResponse.json({
    forms: forms.map((form) => ({
      ...form,
      audienceName: audienceIds(form.tagIds).map((id) => names.get(id)).find(Boolean) ?? null,
      fieldSummary: fieldSummary(form.fields),
    })),
  });
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

  const preset = FORM_PRESETS[parsed.data.preset ?? "email"];
  const requested = parsed.data.fields ?? (parsed.data.preset ? preset.fields : defaultNewsletterFields());
  const normalized = normalizeFormFields(requested);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }
  const fields = normalized.fields;
  const requirementMode = requirementModeFor(fields);
  const collectPhone = fields.some((field) => field.key === "phone");
  const tagIds = audienceIds(parsed.data.tagIds);
  if (tagIds.length) {
    const owned = await prisma.tag.count({
      where: { workspaceId: ctx.workspace.id, id: { in: tagIds } },
    });
    if (owned !== tagIds.length) {
      return NextResponse.json({ error: "Choose an audience from this business" }, { status: 400 });
    }
  }

  let hostedSlug = slugify(parsed.data.name) || "form";
  const clash = await prisma.signupForm.findUnique({ where: { hostedSlug } });
  if (clash) hostedSlug = `${hostedSlug}-${randomToken(4)}`;

  const form = await prisma.signupForm.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      fields: fields as unknown as Prisma.InputJsonValue,
      doubleOptIn: parsed.data.doubleOptIn ?? false,
      tagIds,
      requirementMode,
      collectPhone,
      hostedSlug,
      status: tagIds.length > 0 ? "ACTIVE" : "PAUSED",
    },
  });

  return NextResponse.json({ form }, { status: 201 });
}
