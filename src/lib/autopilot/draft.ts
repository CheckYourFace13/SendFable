import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compileEmailHtml } from "@/lib/email-compiler";
import { createSimpleDesign } from "@/lib/simple-design";
import type { GeneratedCampaign } from "@/lib/autopilot/generate";
import type { CreationChoice } from "@/lib/autopilot/commercial";
import { lockCreation } from "@/lib/autopilot/commercial-account";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

export async function createAutopilotCampaignDraft(opts: {
  workspaceId: string;
  configId: string;
  sourceUrl: string;
  changeFingerprint: string;
  changeSummary: string;
  changedContent: string;
  generated: GeneratedCampaign;
  audienceType: string;
  audienceTagIds: string[];
  audienceSegmentId: string | null;
  choice: CreationChoice;
  imageUrl?: string | null;
  imageAlt?: string | null;
}): Promise<{ draftId: string; campaignId: string }> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: opts.workspaceId },
  });
  const commercial = await prisma.autopilotCommercial.findUnique({
    where: { workspaceId: opts.workspaceId },
  });

  const designOpts = {
    headline: opts.generated.headline,
    messageHtml: opts.generated.bodyHtml,
    buttonLabel: opts.generated.ctaLabel,
    buttonHref: opts.generated.ctaHref || opts.sourceUrl,
    logoUrl: workspace.logoUrl,
    logoAlt: workspace.name,
    primaryColor: workspace.primaryColor,
    accentColor: workspace.secondaryColor,
    textColor: commercial?.textColor || undefined,
    backgroundColor: commercial?.backgroundColor || undefined,
    fontFamily: workspace.fontStack,
    omitPlaceholderImage: true,
    imageUrl: opts.imageUrl || null,
    imageAlt: opts.imageAlt || opts.generated.headline,
    buttonRadius: (commercial?.buttonStyle === "square" ? "square" : "rounded") as
      | "square"
      | "rounded",
  };

  let design = createSimpleDesign(designOpts);

  let templateSlug = opts.generated.templateSlug;
  if (templateSlug) {
    const tpl = await prisma.template.findFirst({
      where: {
        shareSlug: templateSlug,
        OR: [{ workspaceId: opts.workspaceId }, { isPlatform: true, workspaceId: null }],
      },
    });
    if (tpl?.designJson) {
      // Prefer template shell but inject our headline/body/CTA into simple blocks when possible
      design = createSimpleDesign(designOpts);
    } else {
      templateSlug = null;
    }
  }

  const compiledHtml = compileEmailHtml(design, {
    businessName: workspace.name,
    mailingAddress: workspace.mailingAddress,
    showSendfableBadge: opts.choice.brandingRequired,
  });

  const name = `Scribe: ${opts.generated.headline.slice(0, 60)}`;

  const result = await prisma.$transaction(async (tx) => {
    await lockCreation(tx, opts.workspaceId, opts.choice.source, new Date());
    const campaign = await tx.campaign.create({
      data: {
        workspaceId: opts.workspaceId,
        name,
        status: "DRAFT",
        channel: "EMAIL",
        goal: opts.generated.goal,
        simpleMode: true,
        subject: opts.generated.subject,
        previewText: opts.generated.preheader,
        designJson: design as unknown as Prisma.InputJsonValue,
        compiledHtml,
        audienceType: opts.audienceType,
        audienceTagIds: opts.audienceTagIds as unknown as Prisma.InputJsonValue,
        audienceSegmentId: opts.audienceSegmentId,
        senderIdentityId: workspace.defaultSenderIdentityId,
      },
    });

    const draft = await tx.marketingAutopilotDraft.create({
      data: {
        workspaceId: opts.workspaceId,
        configId: opts.configId,
        campaignId: campaign.id,
        status: "DRAFTED",
        sourceUrl: opts.sourceUrl,
        changeFingerprint: opts.changeFingerprint,
        changeSummary: opts.changeSummary,
        changedContent: opts.changedContent,
        subject: opts.generated.subject,
        preheader: opts.generated.preheader,
        ctaLabel: opts.generated.ctaLabel,
        ctaHref: opts.generated.ctaHref,
        goal: opts.generated.goal,
        templateSlug,
        explanation: opts.generated.explanation,
        expiresAt: null,
        generationCostMicros: BigInt(opts.generated.costMicros),
        generationModel: opts.generated.model,
        creationSource: opts.choice.source,
        brandingRequired: opts.choice.brandingRequired,
      },
    });

    await tx.marketingAutopilotConfig.update({
      where: { id: opts.configId },
      data: {
        generationCount: { increment: 1 },
        estimatedCostMicros: { increment: BigInt(opts.generated.costMicros) },
        lastMeaningfulHash: opts.changeFingerprint,
      },
    });

    return { draftId: draft.id, campaignId: campaign.id };
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_draft_created");
  } catch {
    /* fail open */
  }

  return result;
}
