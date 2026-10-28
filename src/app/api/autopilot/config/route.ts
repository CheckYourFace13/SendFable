import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { assertSafePublicUrl } from "@/lib/ssrf";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { softwareQuotas } from "@/lib/internal-entitlement";
import { describeAutopilotAccount } from "@/lib/autopilot/commercial-account";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";
import type { Prisma } from "@prisma/client";
import { preferredScribeAudienceTagId, resolveScribeAudience } from "@/lib/autopilot/audience";

function jsonConfig<T extends { estimatedCostMicros: bigint }>(config: T | null) {
  if (!config) return null;
  return { ...config, estimatedCostMicros: config.estimatedCostMicros.toString() };
}

const putSchema = z.object({
  pageUrl: z.string().trim().url().max(2000),
  audienceType: z.enum(["all", "tags", "segment"]).default("all"),
  audienceTagIds: z.array(z.string()).max(50).optional(),
  audienceSegmentId: z.string().cuid().nullable().optional(),
  audienceChosen: z.boolean().optional(),
  checkFrequency: z.enum(["DAILY", "TWICE_DAILY", "WEEKLY"]).default("DAILY"),
  enabled: z.boolean(),
  remindersEnabled: z.boolean().optional(),
  paused: z.boolean().optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ent = await getWorkspaceEntitlement(ctx.workspace.id);
  const quotas = softwareQuotas({
    isInternal: ent.isInternal,
    disabled: ent.disabled,
    plan: ent.plan,
  });
  const [config, audiences, workspace] = await Promise.all([
    prisma.marketingAutopilotConfig.findUnique({
      where: { workspaceId: ctx.workspace.id },
    }),
    prisma.tag.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: { onboardingData: true },
    }),
  ]);
  const scribeAudience = resolveScribeAudience({
    config,
    audiences,
    preferredAudienceTagId: preferredScribeAudienceTagId(workspace?.onboardingData),
  });

  const waiting = await prisma.marketingAutopilotDraft.count({
    where: {
      workspaceId: ctx.workspace.id,
      status: { in: ["AWAITING_APPROVAL", "DRAFTED"] },
    },
  });

  const lastSent = await prisma.marketingAutopilotDraft.findFirst({
    where: { workspaceId: ctx.workspace.id, status: "SENT" },
    orderBy: { decidedAt: "desc" },
    select: { decidedAt: true, subject: true },
  });

  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  );
  const draftsUsedThisMonth = await prisma.marketingAutopilotDraft.count({
    where: { workspaceId: ctx.workspace.id, createdAt: { gte: monthStart } },
  });
  const draftsCap = quotas.autopilotDraftsPerMonth;

  return NextResponse.json({
    config: jsonConfig(config),
    audiences,
    scribeAudience,
    waitingDrafts: waiting,
    lastCampaign: lastSent,
    allowedFrequencies: quotas.autopilotFrequencies,
    plan: ent.plan,
    entitlement: quotas.entitlement,
    entitlementLabel: quotas.label,
    internalUnlimited: quotas.entitlement === "OWNER_INTERNAL_UNLIMITED",
    draftsUsedThisMonth,
    draftsCap,
    draftsLimitReached: draftsCap != null && draftsCap > 0 && draftsUsedThisMonth >= draftsCap,
    commercial: await describeAutopilotAccount(
      ctx.workspace.id,
      ent.plan,
      quotas.entitlement === "OWNER_INTERNAL_UNLIMITED"
    ),
  });
}

export async function PUT(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    await assertSafePublicUrl(parsed.data.pageUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400 }
    );
  }

  const ent = await getWorkspaceEntitlement(ctx.workspace.id);
  const quotas = softwareQuotas({
    isInternal: ent.isInternal,
    disabled: ent.disabled,
    plan: ent.plan,
  });
  const frequency = quotas.autopilotFrequencies.includes(parsed.data.checkFrequency)
    ? parsed.data.checkFrequency
    : quotas.autopilotFrequencies[0]!;

  const [prior, audiences, workspace] = await Promise.all([
    prisma.marketingAutopilotConfig.findUnique({
      where: { workspaceId: ctx.workspace.id },
    }),
    prisma.tag.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.workspace.findUnique({
      where: { id: ctx.workspace.id },
      select: { onboardingData: true },
    }),
  ]);
  const urlChanged = Boolean(prior && prior.pageUrl !== parsed.data.pageUrl);
  const audienceChosen =
    parsed.data.audienceChosen === true ||
    parsed.data.audienceType === "tags" ||
    parsed.data.audienceType === "segment";
  const nextAudience = {
    audienceType: parsed.data.audienceType,
    audienceTagIds: parsed.data.audienceTagIds ?? [],
    audienceSegmentId: parsed.data.audienceSegmentId ?? null,
    audienceChosen,
  };
  const resolved = resolveScribeAudience({
    config: nextAudience,
    audiences,
    preferredAudienceTagId: preferredScribeAudienceTagId(workspace?.onboardingData),
  });
  if (parsed.data.enabled && !resolved.ok) {
    return NextResponse.json(
      { error: resolved.label, scribeAudience: resolved, audiences },
      { status: 400 }
    );
  }

  const config = await prisma.marketingAutopilotConfig.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: {
      workspaceId: ctx.workspace.id,
      pageUrl: parsed.data.pageUrl,
      audienceType: resolved.ok ? resolved.audienceType : nextAudience.audienceType,
      audienceTagIds: (resolved.ok
        ? resolved.audienceTagIds
        : nextAudience.audienceTagIds) as unknown as Prisma.InputJsonValue,
      audienceSegmentId: resolved.ok ? resolved.audienceSegmentId : nextAudience.audienceSegmentId,
      audienceChosen,
      checkFrequency: frequency,
      enabled: parsed.data.enabled,
      remindersEnabled: parsed.data.remindersEnabled ?? true,
      pausedAt: parsed.data.paused ? new Date() : null,
      channel: "EMAIL",
    },
    update: {
      pageUrl: parsed.data.pageUrl,
      audienceType: resolved.ok ? resolved.audienceType : nextAudience.audienceType,
      audienceTagIds: (resolved.ok
        ? resolved.audienceTagIds
        : nextAudience.audienceTagIds) as unknown as Prisma.InputJsonValue,
      audienceSegmentId: resolved.ok ? resolved.audienceSegmentId : nextAudience.audienceSegmentId,
      audienceChosen,
      checkFrequency: frequency,
      enabled: parsed.data.enabled,
      remindersEnabled: parsed.data.remindersEnabled ?? true,
      pausedAt: parsed.data.paused
        ? new Date()
        : parsed.data.paused === false
          ? null
          : undefined,
      ...(urlChanged
        ? {
            lastContentHash: null,
            lastContentText: null,
            lastMeaningfulHash: null,
            lastFetchedAt: null,
          }
        : {}),
    },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_setup_start");
    if (parsed.data.enabled && !prior?.enabled) {
      trackEvent("autopilot_enabled");
    }
  } catch {
    /* fail open */
  }

  return NextResponse.json({
    config: jsonConfig(config),
    allowedFrequencies: quotas.autopilotFrequencies,
    internalUnlimited: quotas.entitlement === "OWNER_INTERNAL_UNLIMITED",
  });
}
