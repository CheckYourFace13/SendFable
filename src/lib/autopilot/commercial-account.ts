import type { Plan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { softwareQuotas } from "@/lib/internal-entitlement";
import {
  AUTOPILOT_CREATION_PACKS,
  type CreationChoice,
  type CreationSource,
  type PromoKind,
  chooseCreation,
  countUsage,
  currentTrialPeriod,
  monthStartUtc,
  packById,
  planIncludedCreations,
  trialMonthsRemaining,
  weekStartUtc,
} from "@/lib/autopilot/commercial";
import { extractEmailBrand, fontLabelForStack, fontStackForLabel } from "@/lib/autopilot/brand";

export async function resolveAutopilotCreation(
  workspaceId: string,
  now = new Date()
): Promise<CreationChoice | null> {
  const snapshot = await loadCreationInputs(workspaceId, now);
  return chooseCreation(snapshot);
}

async function loadCreationInputs(workspaceId: string, now: Date) {
  const ent = await getWorkspaceEntitlement(workspaceId);
  const quotas = softwareQuotas({
    isInternal: ent.isInternal,
    disabled: ent.disabled,
    plan: ent.plan,
  });
  const commercial = await prisma.autopilotCommercial.findUnique({
    where: { workspaceId },
  });
  const lookback = earliestLookback(now, commercial?.trialStartedAt ?? null);
  const drafts = await prisma.marketingAutopilotDraft.findMany({
    where: { workspaceId, createdAt: { gte: lookback } },
    select: { creationSource: true, createdAt: true },
  });
  return {
    now,
    isOwnerInternal: quotas.entitlement === "OWNER_INTERNAL_UNLIMITED",
    plan: ent.plan,
    planShowsBadge: quotas.showSendfableBadge,
    trialStartedAt: commercial?.trialStartedAt ?? null,
    creditBalance: commercial?.creditBalance ?? 0,
    promo: (commercial?.promo as PromoKind) || "NONE",
    used: countUsage(drafts, now, commercial?.trialStartedAt ?? null),
  };
}

function earliestLookback(now: Date, trialStartedAt: Date | null): Date {
  const month = monthStartUtc(now);
  const week = weekStartUtc(now);
  let earliest = month.getTime() < week.getTime() ? month : week;
  if (trialStartedAt) {
    const period = currentTrialPeriod(trialStartedAt, now);
    if (period && period.start.getTime() < earliest.getTime()) earliest = period.start;
  }
  return earliest;
}

/** Authoritative charge. Throws when the entitlement is no longer available. */
export async function lockCreation(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  source: CreationSource,
  now: Date
): Promise<void> {
  if (source === "OWNER_INTERNAL") return;

  if (source === "PAID_CREDIT") {
    const updated = await tx.autopilotCommercial.updateMany({
      where: { workspaceId, creditBalance: { gt: 0 } },
      data: { creditBalance: { decrement: 1 } },
    });
    if (updated.count !== 1) throw new Error("no_creation_entitlement");
    return;
  }

  const commercial = await tx.autopilotCommercial.findUnique({ where: { workspaceId } });
  if (source === "PLAN_INCLUDED") {
    const ent = await getWorkspaceEntitlement(workspaceId);
    const cap = planIncludedCreations(ent.plan);
    const used = await tx.marketingAutopilotDraft.count({
      where: {
        workspaceId,
        creationSource: "PLAN_INCLUDED",
        createdAt: { gte: monthStartUtc(now) },
      },
    });
    if (cap <= 0 || used >= cap) throw new Error("no_creation_entitlement");
    return;
  }

  if (source === "TRIAL") {
    if (!commercial?.trialStartedAt) throw new Error("no_creation_entitlement");
    const period = currentTrialPeriod(commercial.trialStartedAt, now);
    if (!period) throw new Error("no_creation_entitlement");
    const used = await tx.marketingAutopilotDraft.count({
      where: {
        workspaceId,
        creationSource: "TRIAL",
        createdAt: { gte: period.start, lt: period.end },
      },
    });
    if (used >= 1) throw new Error("no_creation_entitlement");
    return;
  }

  if (source === "PROMO_MONTHLY") {
    if (commercial?.promo !== "MONTHLY") throw new Error("no_creation_entitlement");
    const used = await tx.marketingAutopilotDraft.count({
      where: {
        workspaceId,
        creationSource: "PROMO_MONTHLY",
        createdAt: { gte: monthStartUtc(now) },
      },
    });
    if (used >= 1) throw new Error("no_creation_entitlement");
    return;
  }

  if (source === "PROMO_WEEKLY") {
    if (commercial?.promo !== "WEEKLY") throw new Error("no_creation_entitlement");
    const used = await tx.marketingAutopilotDraft.count({
      where: {
        workspaceId,
        creationSource: "PROMO_WEEKLY",
        createdAt: { gte: weekStartUtc(now) },
      },
    });
    if (used >= 1) throw new Error("no_creation_entitlement");
  }
}

export async function sendBadgeForCampaign(
  campaignId: string,
  currentPlanShowsBadge: boolean
): Promise<boolean> {
  const draft = await prisma.marketingAutopilotDraft.findUnique({
    where: { campaignId },
    select: { brandingRequired: true },
  });
  if (!draft) return currentPlanShowsBadge;
  return draft.brandingRequired;
}

export async function describeAutopilotAccount(workspaceId: string, plan: Plan, isInternal: boolean) {
  const now = new Date();
  const commercial = await prisma.autopilotCommercial.findUnique({ where: { workspaceId } });
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      fontStack: true,
    },
  });
  const choice = isInternal ? null : await resolveAutopilotCreation(workspaceId, now);
  const period = commercial?.trialStartedAt
    ? currentTrialPeriod(commercial.trialStartedAt, now)
    : null;
  const trialUsed = period
    ? await prisma.marketingAutopilotDraft.count({
        where: {
          workspaceId,
          creationSource: "TRIAL",
          createdAt: { gte: period.start, lt: period.end },
        },
      })
    : 0;
  const fontLabel = fontLabelForStack(workspace?.fontStack);
  return {
    includedPerMonth: isInternal ? null : planIncludedCreations(plan),
    trialAvailable: !isInternal && plan === "FREE" && !commercial?.trialStartedAt,
    trialActive: Boolean(period),
    trialStartedAt: commercial?.trialStartedAt?.toISOString() ?? null,
    trialCreationsRemaining: period && trialUsed < 1 ? 1 : 0,
    trialMonthsLeft: trialMonthsRemaining(commercial?.trialStartedAt ?? null, now),
    credits: commercial?.creditBalance ?? 0,
    promo: (commercial?.promo as PromoKind) || "NONE",
    nextSource: isInternal ? "OWNER_INTERNAL" : choice?.source ?? null,
    packs: AUTOPILOT_CREATION_PACKS.map((pack) => ({
      id: pack.id,
      credits: pack.credits,
      cents: pack.cents,
      label: pack.label,
    })),
    brand: {
      businessName: workspace?.name || "Your business",
      logoUrl: workspace?.logoUrl || null,
      primaryColor: workspace?.primaryColor || "#4F46E5",
      accentColor: workspace?.secondaryColor || "#0F172A",
      fontLabel,
      buttonLabel: commercial?.buttonStyle === "square" ? "Square" : "Rounded",
      buttonStyle: commercial?.buttonStyle === "square" ? "square" : "rounded",
      confirmed: Boolean(commercial?.brandConfirmedAt),
      suggested: Boolean(commercial?.brandSuggestedAt),
    },
  };
}

export async function startAutopilotTrial(workspaceId: string, plan: Plan, isInternal: boolean) {
  if (isInternal) return { ok: false as const, error: "Internal workspaces already include Autopilot" };
  if (plan !== "FREE") return { ok: false as const, error: "Paid plans already include Autopilot creations" };
  const existing = await prisma.autopilotCommercial.findUnique({ where: { workspaceId } });
  if (existing?.trialStartedAt) {
    return { ok: true as const, already: true, startedAt: existing.trialStartedAt.toISOString() };
  }
  const row = await prisma.autopilotCommercial.upsert({
    where: { workspaceId },
    create: { workspaceId, trialStartedAt: new Date() },
    update: { trialStartedAt: new Date() },
  });
  return { ok: true as const, already: false, startedAt: row.trialStartedAt?.toISOString() ?? null };
}

export async function redeemAutopilotPromo(workspaceId: string, promo: PromoKind) {
  if (promo === "NONE") return { ok: false as const, error: "That code is not valid" };
  await prisma.autopilotCommercial.upsert({
    where: { workspaceId },
    create: { workspaceId, promo, promoRedeemedAt: new Date() },
    update: { promo, promoRedeemedAt: new Date() },
  });
  return { ok: true as const, promo };
}

export async function grantAutopilotCredits(input: {
  workspaceId: string;
  packId: string;
  paymentId: string;
  amountCents: number | null;
}) {
  const pack = packById(input.packId);
  if (!pack) return { ok: false as const, error: "unknown_pack" };
  if (input.amountCents != null && input.amountCents !== pack.cents) {
    return { ok: false as const, error: "amount_mismatch" };
  }
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { id: true },
  });
  if (!workspace) return { ok: false as const, error: "unknown_workspace" };

  return prisma.$transaction(async (tx) => {
    try {
      await tx.autopilotCreditGrant.create({
        data: {
          workspaceId: input.workspaceId,
          paymentId: input.paymentId,
          packId: pack.id,
          credits: pack.credits,
        },
      });
    } catch {
      return { ok: true as const, duplicate: true, credits: pack.credits };
    }
    await tx.autopilotCommercial.upsert({
      where: { workspaceId: input.workspaceId },
      create: { workspaceId: input.workspaceId, creditBalance: pack.credits },
      update: { creditBalance: { increment: pack.credits } },
    });
    return { ok: true as const, duplicate: false, credits: pack.credits };
  });
}

export async function suggestBrandFromHtml(
  workspaceId: string,
  html: string,
  pageUrl: string,
  force = false
) {
  const commercial = await prisma.autopilotCommercial.findUnique({ where: { workspaceId } });
  if (!force && (commercial?.brandConfirmedAt || commercial?.brandSuggestedAt)) return;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, logoUrl: true, primaryColor: true },
  });
  const brand = extractEmailBrand(html, pageUrl, workspace?.name);
  const replaceColors = force || !workspace?.primaryColor || workspace.primaryColor.toLowerCase() === "#4f46e5";
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(force || !workspace?.logoUrl ? { logoUrl: brand.logoUrl || undefined } : {}),
      ...(replaceColors
        ? {
            primaryColor: brand.primaryColor,
            secondaryColor: brand.accentColor,
            fontStack: brand.fontFamily,
          }
        : {}),
    },
  });
  await prisma.autopilotCommercial.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      buttonStyle: brand.buttonStyle,
      backgroundColor: brand.backgroundColor,
      textColor: brand.textColor,
      brandSuggestedAt: new Date(),
    },
    update: {
      buttonStyle: brand.buttonStyle,
      backgroundColor: brand.backgroundColor,
      textColor: brand.textColor,
      brandSuggestedAt: new Date(),
      ...(force ? { brandConfirmedAt: null } : {}),
    },
  });
}

export async function confirmBrand(workspaceId: string) {
  await prisma.autopilotCommercial.upsert({
    where: { workspaceId },
    create: { workspaceId, brandConfirmedAt: new Date(), brandSuggestedAt: new Date() },
    update: { brandConfirmedAt: new Date() },
  });
}

export async function saveBrand(input: {
  workspaceId: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  fontLabel: "Modern" | "Classic";
  buttonStyle: "rounded" | "square";
}) {
  await prisma.workspace.update({
    where: { id: input.workspaceId },
    data: {
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      secondaryColor: input.accentColor,
      fontStack: fontStackForLabel(input.fontLabel),
    },
  });
  await prisma.autopilotCommercial.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      buttonStyle: input.buttonStyle,
      brandConfirmedAt: new Date(),
      brandSuggestedAt: new Date(),
    },
    update: {
      buttonStyle: input.buttonStyle,
      brandConfirmedAt: new Date(),
    },
  });
}
