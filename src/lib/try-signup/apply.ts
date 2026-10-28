import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomToken, slugify } from "@/lib/utils";
import { requirementModeFor } from "@/lib/forms/fields";
import {
  fieldsFromTryConfig,
  sanitizeTryConfig,
  type TrySignupConfig,
} from "@/lib/try-signup/config";

export async function applyTrySignupDraft(opts: {
  workspaceId: string;
  token: string;
}): Promise<{
  ok: boolean;
  formId?: string;
  hostedSlug?: string;
  platform?: TrySignupConfig["platform"];
  display?: TrySignupConfig["display"];
  reason?: string;
}> {
  const draft = await prisma.trySignupDraft.findUnique({ where: { token: opts.token } });
  if (!draft) return { ok: false, reason: "not_found" };
  if (draft.claimedAt && draft.workspaceId && draft.workspaceId !== opts.workspaceId) {
    return { ok: false, reason: "already_claimed" };
  }
  if (draft.claimedAt && draft.workspaceId === opts.workspaceId) {
    const config = sanitizeTryConfig(draft.config);
    const existingForm = await prisma.signupForm.findFirst({
      where: { workspaceId: opts.workspaceId, name: config.audienceName },
      orderBy: { createdAt: "desc" },
      select: { id: true, hostedSlug: true },
    });
    return {
      ok: true,
      formId: existingForm?.id,
      hostedSlug: existingForm?.hostedSlug,
      platform: config.platform,
      display: config.display,
    };
  }

  const config = sanitizeTryConfig(draft.config);
  const primary = await upsertAudience(opts.workspaceId, config.audienceName);
  if (config.extraAudienceName) {
    await upsertAudience(opts.workspaceId, config.extraAudienceName);
  }

  const fields = fieldsFromTryConfig(config);
  const form = await createSignupTool({
    workspaceId: opts.workspaceId,
    config,
    tagId: primary.id,
    fields,
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: opts.workspaceId },
    select: { onboardingData: true },
  });
  const onboarding =
    workspace?.onboardingData && typeof workspace.onboardingData === "object"
      ? (workspace.onboardingData as Record<string, unknown>)
      : {};
  await prisma.workspace.update({
    where: { id: opts.workspaceId },
    data: {
      onboardingData: {
        ...onboarding,
        scribePreferredAudienceTagId: primary.id,
        tryBusinessType: config.businessType,
        tryAudienceName: config.audienceName,
        trySignupFormId: form.id,
        tryPlatform: config.platform,
        tryDisplay: config.display,
      } as Prisma.InputJsonValue,
    },
  });

  const existingScribe = await prisma.marketingAutopilotConfig.findUnique({
    where: { workspaceId: opts.workspaceId },
    select: { audienceChosen: true, audienceType: true },
  });
  if (existingScribe && !existingScribe.audienceChosen && existingScribe.audienceType === "all") {
    await prisma.marketingAutopilotConfig.update({
      where: { workspaceId: opts.workspaceId },
      data: {
        audienceType: "tags",
        audienceTagIds: [primary.id] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.trySignupDraft.update({
    where: { id: draft.id },
    data: {
      claimedAt: new Date(),
      workspaceId: opts.workspaceId,
      followUpCancelledAt: new Date(),
      followUpAt: null,
    },
  });

  if (draft.prospectId) {
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: draft.prospectId,
        type: "first_signup_tool_activated",
        meta: { formId: form.id, audience: config.audienceName },
      },
    });
  }

  return {
    ok: true,
    formId: form.id,
    hostedSlug: form.hostedSlug,
    platform: config.platform,
    display: config.display,
  };
}

async function upsertAudience(workspaceId: string, name: string) {
  const existing = await prisma.tag.findFirst({
    where: { workspaceId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.tag.create({
    data: { workspaceId, name, color: "#4F46E5" },
  });
}

async function createSignupTool(opts: {
  workspaceId: string;
  config: TrySignupConfig;
  tagId: string;
  fields: ReturnType<typeof fieldsFromTryConfig>;
}) {
  let hostedSlug = slugify(opts.config.audienceName) || "signup";
  const clash = await prisma.signupForm.findUnique({ where: { hostedSlug } });
  if (clash) hostedSlug = `${hostedSlug}-${randomToken(4)}`;

  return prisma.signupForm.create({
    data: {
      workspaceId: opts.workspaceId,
      name: opts.config.audienceName,
      fields: opts.fields as unknown as Prisma.InputJsonValue,
      tagIds: [opts.tagId],
      requirementMode: requirementModeFor(opts.fields),
      collectPhone: opts.config.phone,
      smsConsentEnabled: opts.config.smsConsent,
      hostedSlug,
      status: "ACTIVE",
      presentation: {
        display: opts.config.display,
        trigger: opts.config.display === "popup" ? "delay" : "immediate",
        delaySeconds: 5,
        frequency: "once",
      } as Prisma.InputJsonValue,
    },
  });
}
