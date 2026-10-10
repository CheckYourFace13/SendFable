import type { Plan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { PLANS } from "@/lib/plans";
import { randomToken, slugify } from "@/lib/utils";
import { FORM_PRESETS } from "@/lib/form-presets";
import { assertSafePublicUrl } from "@/lib/ssrf";

const PLAN_KEYS = new Set<Plan>(["FREE", "STARTER", "GROWTH", "PRO", "PRO_PLUS"]);

export function isPlanKey(v: string): v is Plan {
  return PLAN_KEYS.has(v as Plan);
}

export async function listInternalWorkspaceSummaries() {
  const workspaces = await prisma.workspace.findMany({
    where: { isInternal: true },
    orderBy: { createdAt: "asc" },
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { user: { select: { id: true, email: true, plan: true, name: true } } },
        take: 1,
      },
      marketingAutopilotConfig: {
        select: { enabled: true, pageUrl: true, checkFrequency: true, lastFetchedAt: true },
      },
      _count: { select: { contacts: true, campaigns: true, signupForms: true } },
    },
  });

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  return Promise.all(
    workspaces.map(async (ws) => {
      const owner = ws.memberships[0]?.user ?? null;
      const plan = ws.internalPlanOverride ?? owner?.plan ?? "FREE";
      const emailsThisMonth = await prisma.campaignRecipient.count({
        where: {
          status: "SENT",
          sentAt: { gte: monthStart },
          campaign: { workspaceId: ws.id },
        },
      });
      const smsThisMonth = await prisma.smsMessage.count({
        where: {
          workspaceId: ws.id,
          direction: "OUTBOUND",
          createdAt: { gte: monthStart },
        },
      });
      const lastCampaign = await prisma.campaign.findFirst({
        where: { workspaceId: ws.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true, updatedAt: true, channel: true },
      });
      const defaultIdentity = ws.defaultSenderIdentityId
        ? await prisma.senderIdentity.findUnique({
            where: { id: ws.defaultSenderIdentityId },
            select: {
              id: true,
              value: true,
              displayName: true,
              status: true,
              type: true,
            },
          })
        : null;

      return {
        id: ws.id,
        name: ws.name,
        websiteUrl: ws.websiteUrl,
        internalLabel: ws.internalLabel,
        disabledAt: ws.disabledAt,
        plan,
        planSource: ws.internalPlanOverride ? "INTERNAL_PLAN_OVERRIDE" : "OWNER_PLAN",
        planLimits: PLANS[plan],
        contacts: ws._count.contacts,
        campaigns: ws._count.campaigns,
        forms: ws._count.signupForms,
        emailsThisMonth,
        smsThisMonth,
        autopilot: ws.marketingAutopilotConfig
          ? {
              enabled: ws.marketingAutopilotConfig.enabled,
              pageUrl: ws.marketingAutopilotConfig.pageUrl,
              checkFrequency: ws.marketingAutopilotConfig.checkFrequency,
              lastFetchedAt: ws.marketingAutopilotConfig.lastFetchedAt,
            }
          : null,
        lastCampaign,
        sending: defaultIdentity,
        owner: owner
          ? { id: owner.id, email: owner.email, name: owner.name, accountPlan: owner.plan }
          : null,
      };
    })
  );
}

export async function createInternalWorkspace(opts: {
  adminUserId: string;
  name: string;
  websiteUrl: string;
  internalLabel?: string;
  plan?: Plan;
  mailingAddress?: string | null;
  ip?: string | null;
}) {
  const plan = opts.plan ?? "FREE";
  if (!isPlanKey(plan)) throw new Error("Invalid plan");

  let websiteUrl = opts.websiteUrl.trim();
  if (!/^https?:\/\//i.test(websiteUrl)) websiteUrl = `https://${websiteUrl}`;
  await assertSafePublicUrl(websiteUrl);

  const existing = await prisma.workspace.findFirst({
    where: {
      isInternal: true,
      OR: [
        { name: { equals: opts.name, mode: "insensitive" } },
        { websiteUrl: { equals: websiteUrl, mode: "insensitive" } },
        ...(opts.internalLabel
          ? [{ internalLabel: { equals: opts.internalLabel, mode: "insensitive" as const } }]
          : []),
      ],
    },
  });
  if (existing) {
    return { workspace: existing, created: false as const };
  }

  // Prefer an explicit mailing address; otherwise copy the operator's primary
  // workspace address (CAN-SPAM). Never invent a street address.
  let mailingAddress = opts.mailingAddress?.trim() || null;
  if (!mailingAddress) {
    const home = await prisma.membership.findFirst({
      where: { userId: opts.adminUserId, workspace: { isInternal: false } },
      include: { workspace: { select: { mailingAddress: true } } },
      orderBy: { createdAt: "asc" },
    });
    mailingAddress = home?.workspace.mailingAddress?.trim() || null;
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name: opts.name.trim(),
        websiteUrl,
        isInternal: true,
        internalPlanOverride: plan,
        internalLabel: opts.internalLabel?.trim() || opts.name.trim(),
        mailingAddress,
        timezone: "America/Chicago",
        primaryColor: "#1B4332",
        secondaryColor: "#081C15",
        onboardingCompletedAt: new Date(),
        onboardingStep: 10,
        businessDescription:
          "Recipes, drink ideas, and kitchen guides for cooking and entertaining at home.",
      },
    });

    await tx.membership.create({
      data: {
        userId: opts.adminUserId,
        workspaceId: ws.id,
        role: "OWNER",
      },
    });

    return ws;
  });

  await writeAuditLog({
    workspaceId: workspace.id,
    userId: opts.adminUserId,
    action: "admin.internal_workspace.created",
    targetType: "workspace",
    targetId: workspace.id,
    meta: {
      name: workspace.name,
      websiteUrl,
      internalPlanOverride: plan,
      label: "INTERNAL PLAN OVERRIDE",
    },
    ip: opts.ip,
  });

  return { workspace, created: true as const };
}

export async function setInternalPlanOverride(opts: {
  adminUserId: string;
  workspaceId: string;
  plan: Plan;
  ip?: string | null;
}) {
  if (!isPlanKey(opts.plan)) throw new Error("Invalid plan");
  const ws = await prisma.workspace.findUnique({ where: { id: opts.workspaceId } });
  if (!ws?.isInternal) throw new Error("Not an internal workspace");

  const updated = await prisma.workspace.update({
    where: { id: opts.workspaceId },
    data: { internalPlanOverride: opts.plan },
  });

  await writeAuditLog({
    workspaceId: ws.id,
    userId: opts.adminUserId,
    action: "admin.internal_plan_override",
    targetType: "workspace",
    targetId: ws.id,
    meta: {
      from: ws.internalPlanOverride,
      to: opts.plan,
      label: "INTERNAL PLAN OVERRIDE",
    },
    ip: opts.ip,
  });

  return updated;
}

export async function disableInternalWorkspace(opts: {
  adminUserId: string;
  workspaceId: string;
  disable: boolean;
  ip?: string | null;
}) {
  const ws = await prisma.workspace.findUnique({ where: { id: opts.workspaceId } });
  if (!ws?.isInternal) throw new Error("Not an internal workspace");

  const updated = await prisma.workspace.update({
    where: { id: opts.workspaceId },
    data: { disabledAt: opts.disable ? new Date() : null },
  });

  await writeAuditLog({
    workspaceId: ws.id,
    userId: opts.adminUserId,
    action: opts.disable ? "admin.internal_workspace.disabled" : "admin.internal_workspace.enabled",
    targetType: "workspace",
    targetId: ws.id,
    meta: {},
    ip: opts.ip,
  });

  return updated;
}

/** Ensure DrinkKnird audience tag + newsletter form + brand sender baseline. */
export async function provisionDrinkKnirdProductSurface(opts: {
  workspaceId: string;
  adminUserId: string;
  replyToEmail: string;
  ip?: string | null;
}) {
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: opts.workspaceId } });

  const tag = await prisma.tag.upsert({
    where: {
      workspaceId_name: { workspaceId: opts.workspaceId, name: "DrinkKnird Subscribers" },
    },
    create: {
      workspaceId: opts.workspaceId,
      name: "DrinkKnird Subscribers",
      color: "#1B4332",
    },
    update: {},
  });

  let form = await prisma.signupForm.findFirst({
    where: { workspaceId: opts.workspaceId, name: "DrinkKnird Newsletter" },
  });
  if (!form) {
    let hostedSlug = slugify("drinkknird-newsletter") || "drinkknird-newsletter";
    const clash = await prisma.signupForm.findUnique({ where: { hostedSlug } });
    if (clash) hostedSlug = `${hostedSlug}-${randomToken(4)}`;
    const preset = FORM_PRESETS.email;
    form = await prisma.signupForm.create({
      data: {
        workspaceId: opts.workspaceId,
        name: "DrinkKnird Newsletter",
        fields: preset.fields as unknown as Prisma.InputJsonValue,
        doubleOptIn: false,
        tagIds: [tag.id],
        requirementMode: preset.requirementMode,
        collectPhone: false,
        hostedSlug,
      },
    });
  }

  // Reply-To = authenticated owner mailbox. From is rewritten to the platform
  // send domain (Free plan / no DrinkKnird custom domain yet). Mark verified
  // only because this is an OWNER_ADMIN-provisioned internal workspace and the
  // address is the signed-in platform owner (no invented mailbox).
  const replyTo = opts.replyToEmail.trim().toLowerCase();
  let identity = await prisma.senderIdentity.findFirst({
    where: { workspaceId: opts.workspaceId, value: replyTo },
  });
  if (!identity) {
    identity = await prisma.senderIdentity.create({
      data: {
        workspaceId: opts.workspaceId,
        type: "ADDRESS",
        value: replyTo,
        displayName: "DrinkKnird",
        status: "VERIFIED",
        rewriteRequired: true,
        verifiedAt: new Date(),
        isDefault: true,
      },
    });
  } else {
    identity = await prisma.senderIdentity.update({
      where: { id: identity.id },
      data: {
        displayName: "DrinkKnird",
        status: "VERIFIED",
        rewriteRequired: true,
        verifiedAt: identity.verifiedAt ?? new Date(),
        isDefault: true,
      },
    });
  }

  if (ws.defaultSenderIdentityId !== identity.id) {
    await prisma.workspace.update({
      where: { id: opts.workspaceId },
      data: {
        defaultSenderIdentityId: identity.id,
        name: "DrinkKnird",
        websiteUrl: ws.websiteUrl || "https://drinkknird.com",
      },
    });
  }

  const watchUrl = "https://drinkknird.com";
  await assertSafePublicUrl(watchUrl);

  const tagIdsJson = [tag.id] as unknown as Prisma.InputJsonValue;
  const autopilot = await prisma.marketingAutopilotConfig.upsert({
    where: { workspaceId: opts.workspaceId },
    create: {
      workspaceId: opts.workspaceId,
      pageUrl: watchUrl,
      enabled: true,
      checkFrequency: "WEEKLY",
      audienceType: "tags",
      audienceTagIds: tagIdsJson,
      channel: "EMAIL",
      remindersEnabled: true,
    },
    update: {
      pageUrl: watchUrl,
      enabled: true,
      checkFrequency: "WEEKLY",
      audienceType: "tags",
      audienceTagIds: tagIdsJson,
    },
  });

  // Welcome campaign draft (never auto-launched)
  let welcome = await prisma.campaign.findFirst({
    where: {
      workspaceId: opts.workspaceId,
      name: "Welcome to DrinkKnird",
      status: "DRAFT",
    },
  });
  if (!welcome) {
    const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#081C15;line-height:1.6;padding:24px;">
<p>Welcome to DrinkKnird.</p>
<p>Thanks for joining. You’ll get recipes, drink ideas, kitchen guides, and new stories from the site when there’s something worth sharing.</p>
<p>— DrinkKnird</p>
</body></html>`;
    welcome = await prisma.campaign.create({
      data: {
        workspaceId: opts.workspaceId,
        name: "Welcome to DrinkKnird",
        subject: "Welcome to DrinkKnird",
        previewText: "Recipes, drink ideas, and kitchen guides worth sharing.",
        status: "DRAFT",
        channel: "EMAIL",
        audienceType: "tags",
        audienceTagIds: [tag.id] as unknown as Prisma.InputJsonValue,
        senderIdentityId: identity.id,
        compiledHtml: html,
        designJson: { blocks: [], note: "welcome-draft" },
        goal: "welcome",
      },
    });
  }

  await writeAuditLog({
    workspaceId: opts.workspaceId,
    userId: opts.adminUserId,
    action: "admin.internal_workspace.provisioned",
    targetType: "workspace",
    targetId: opts.workspaceId,
    meta: {
      formId: form.id,
      formSlug: form.hostedSlug,
      tagId: tag.id,
      identityId: identity.id,
      autopilotId: autopilot.id,
      welcomeCampaignId: welcome.id,
    },
    ip: opts.ip,
  });

  return { tag, form, identity, autopilot, welcome };
}
