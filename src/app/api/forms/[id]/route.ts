import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { appUrl } from "@/lib/utils";
import { normalizeFormFields, requirementModeFor } from "@/lib/forms/fields";
import { developerInstructions, embedSnippet } from "@/lib/forms/install";
import { AUDIENCE_REQUIRED, audienceIds } from "@/lib/forms/manage";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.string(),
    required: z.boolean(),
  })).min(1).max(12).optional(),
  doubleOptIn: z.boolean().optional(),
  tagIds: z.array(z.string()).max(5).optional(),
  smsConsentEnabled: z.boolean().optional(),
  buttonLabel: z.string().trim().min(1).max(40).optional(),
  successMessage: z.string().trim().min(1).max(240).optional(),
  theme: z.enum(["light", "dark", "inherit"]).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
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
    where: { id: params.id, workspaceId: ctx.workspace.id, status: { not: "ARCHIVED" } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hostedUrl = appUrl(`/f/${form.hostedSlug}`);
  const origin = new URL(hostedUrl).origin;
  const embedCode = embedSnippet(origin, form.hostedSlug);
  const tags = await prisma.tag.findMany({
    where: { workspaceId: ctx.workspace.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const audience = tags.find((tag) => ((form.tagIds as string[]) || []).includes(tag.id));
  const instructions = developerInstructions({
    origin,
    businessName: ctx.workspace.name,
    formName: form.name,
    slug: form.hostedSlug,
    audienceName: audience?.name || "the audience selected on this form",
    fields: Array.isArray(form.fields) ? (form.fields as never) : [],
    smsConsentEnabled: form.smsConsentEnabled,
    successMessage: form.successMessage,
  });

  return NextResponse.json({ form, hostedUrl, embedCode, tags, instructions });
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
    where: { id: params.id, workspaceId: ctx.workspace.id, status: { not: "ARCHIVED" } },
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

  let fields = parsed.data.fields;
  let requirementMode: string | undefined;
  let collectPhone: boolean | undefined;
  if (fields) {
    const normalized = normalizeFormFields(fields);
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    fields = normalized.fields;
    requirementMode = requirementModeFor(normalized.fields);
    collectPhone = normalized.fields.some((field) => field.key === "phone");
  }
  if (parsed.data.tagIds?.length) {
    const owned = await prisma.tag.count({
      where: { workspaceId: ctx.workspace.id, id: { in: parsed.data.tagIds } },
    });
    if (owned !== parsed.data.tagIds.length) {
      return NextResponse.json({ error: "Choose an audience from this business" }, { status: 400 });
    }
  }
  const phoneOn = collectPhone ?? existing.collectPhone;
  const smsConsentEnabled = phoneOn ? parsed.data.smsConsentEnabled : false;
  const nextTags = parsed.data.tagIds !== undefined ? audienceIds(parsed.data.tagIds) : audienceIds(existing.tagIds);
  let status = parsed.data.status ?? existing.status;
  if (status === "ACTIVE" && nextTags.length === 0) {
    if (parsed.data.status === "ACTIVE") {
      return NextResponse.json({ error: AUDIENCE_REQUIRED }, { status: 400 });
    }
    status = "PAUSED";
  }

  const form = await prisma.signupForm.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      fields: fields as never,
      doubleOptIn: parsed.data.doubleOptIn,
      tagIds: parsed.data.tagIds !== undefined ? nextTags : undefined,
      hostedSlug: parsed.data.hostedSlug,
      requirementMode,
      collectPhone,
      smsConsentEnabled,
      buttonLabel: parsed.data.buttonLabel,
      successMessage: parsed.data.successMessage,
      theme: parsed.data.theme,
      status,
    },
  });

  return NextResponse.json({
    form,
    notice: status === "PAUSED" && existing.status === "ACTIVE" && nextTags.length === 0 ? AUDIENCE_REQUIRED : undefined,
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.signupForm.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id, status: { not: "ARCHIVED" } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.signupForm.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });
  return NextResponse.json({ ok: true });
}
