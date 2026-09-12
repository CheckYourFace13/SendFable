/**
 * Ensure a workspace has a hosted Text Signup form for 10DLC opt-in / evidence URLs.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FORM_PRESETS } from "@/lib/form-presets";
import { slugify, randomToken } from "@/lib/utils";

export async function ensureWorkspaceSmsOptInForm(input: {
  workspaceId: string;
  brandName: string;
  appUrl?: string;
}): Promise<{ formId: string; hostedSlug: string; publicUrl: string; evidenceUrl: string }> {
  const appUrl = (input.appUrl || process.env.APP_URL || "https://sendfable.com").replace(/\/$/, "");

  // Prefer an existing phone-collecting form for this workspace.
  const existing = await prisma.signupForm.findFirst({
    where: {
      workspaceId: input.workspaceId,
      OR: [{ collectPhone: true }, { requirementMode: { in: ["phone-required", "either-required", "both-required"] } }],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing?.hostedSlug) {
    const publicUrl = `${appUrl}/f/${existing.hostedSlug}`;
    return {
      formId: existing.id,
      hostedSlug: existing.hostedSlug,
      publicUrl,
      evidenceUrl: publicUrl,
    };
  }

  const preset = FORM_PRESETS.text;
  let hostedSlug = slugify(`${input.brandName}-text-signup`) || "text-signup";
  const clash = await prisma.signupForm.findUnique({ where: { hostedSlug } });
  if (clash) hostedSlug = `${hostedSlug}-${randomToken(4)}`;

  const form = await prisma.signupForm.create({
    data: {
      workspaceId: input.workspaceId,
      name: "Text signup",
      fields: preset.fields as unknown as Prisma.InputJsonValue,
      doubleOptIn: false,
      tagIds: [],
      requirementMode: preset.requirementMode,
      collectPhone: true,
      hostedSlug,
    },
  });

  const publicUrl = `${appUrl}/f/${form.hostedSlug}`;
  return {
    formId: form.id,
    hostedSlug: form.hostedSlug,
    publicUrl,
    evidenceUrl: publicUrl,
  };
}
