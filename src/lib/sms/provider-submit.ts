/**
 * Submit a workspace compliance profile to Telnyx (brand + campaign).
 * Never logs EIN. Callers must already pass registration flag + admin checks.
 */

import { prisma } from "@/lib/prisma";
import { decryptSmsSensitive } from "@/lib/sms/sensitive";
import { getSmsProviderOps } from "@/lib/sms/provider-ops-registry";
import { normalizeUsPhone } from "@/lib/sms/phone";
import { buildSmsHelpReply, buildSmsStopReply } from "@/lib/sms/consent";

export async function submitComplianceProfileToProvider(profileId: string): Promise<{
  brandId: string;
  campaignId: string;
  brandStatus: string;
  campaignStatus: string;
}> {
  const profile = await prisma.smsComplianceProfile.findUnique({
    where: { id: profileId },
  });
  if (!profile) throw new Error("Compliance profile not found");

  const required = [
    ["legalEntityName", profile.legalEntityName],
    ["dbaBrandName", profile.dbaBrandName],
    ["entityType", profile.entityType],
    ["street", profile.street],
    ["city", profile.city],
    ["state", profile.state],
    ["postalCode", profile.postalCode],
    ["websiteUrl", profile.websiteUrl],
    ["supportEmail", profile.supportEmail],
    ["supportPhone", profile.supportPhone],
    ["industryVertical", profile.industryVertical],
    ["optInDescription", profile.optInDescription],
    ["sampleMessage1", profile.sampleMessage1],
    ["sampleMessage2", profile.sampleMessage2],
  ] as const;
  for (const [name, val] of required) {
    if (!val?.trim()) throw new Error(`Missing required field for provider submit: ${name}`);
  }

  let ein: string | null = null;
  if (profile.einBrnCiphertext) {
    ein = decryptSmsSensitive(profile.einBrnCiphertext);
    if (!ein) throw new Error("Could not decrypt EIN (SMS_SENSITIVE_DATA_KEY missing or invalid)");
  } else if (profile.entityType !== "SOLE_PROPRIETOR") {
    throw new Error("EIN is required for STANDARD BUSINESS brand registration");
  }

  const phoneNorm = normalizeUsPhone(profile.supportPhone!);
  if (!phoneNorm) throw new Error("supportPhone must be a valid US number in E.164-capable form");

  const ops = getSmsProviderOps();
  const brand = profile.brandId
    ? await ops.retrieveBrand(profile.brandId)
    : await ops.createBrand({
        workspaceId: profile.workspaceId,
        legalEntityName: profile.legalEntityName!,
        displayName: profile.dbaBrandName!,
        entityType: profile.entityType!,
        ein,
        website: profile.websiteUrl!,
        email: profile.supportEmail!,
        phone: phoneNorm.e164,
        street: profile.street!,
        city: profile.city!,
        state: profile.state!,
        postalCode: profile.postalCode!,
        country: profile.country || "US",
        vertical: profile.industryVertical!,
      });

  const brandName = profile.dbaBrandName!;
  const help =
    profile.helpResponse?.trim() ||
    buildSmsHelpReply({
      brandName,
      supportEmail: profile.supportEmail,
      supportPhone: phoneNorm.e164,
    });
  const stop = profile.stopResponse?.trim() || buildSmsStopReply(brandName);

  const campaign = profile.campaignId
    ? await ops.retrieveCampaign(profile.campaignId)
    : await ops.createCampaign({
        workspaceId: profile.workspaceId,
        providerBrandId: brand.providerBrandId,
        usecase: profile.smsUseCase || "MARKETING",
        description:
          profile.optInDescription ||
          `${brandName} sends marketing and conversational texts to opted-in customers.`,
        sample1: profile.sampleMessage1!,
        sample2: profile.sampleMessage2!,
        messageFlow: profile.optInDescription!,
        helpMessage: help,
        optoutMessage: stop,
      });

  await prisma.$transaction(async (tx) => {
    await tx.smsComplianceProfile.update({
      where: { id: profile.id },
      data: {
        brandId: brand.providerBrandId,
        campaignId: campaign.providerCampaignId,
        providerStatus:
          brand.status === "approved" && campaign.status === "approved"
            ? "APPROVED"
            : campaign.status === "rejected" || brand.status === "rejected"
              ? "REJECTED"
              : "SUBMITTED",
        reviewStatus: "PROVIDER_PENDING",
      },
    });

    const existingBrand = await tx.smsRegistration.findFirst({
      where: { workspaceId: profile.workspaceId, kind: "brand" },
    });
    if (existingBrand) {
      await tx.smsRegistration.update({
        where: { id: existingBrand.id },
        data: {
          providerReference: brand.providerBrandId,
          status: brand.status === "approved" ? "APPROVED" : "SUBMITTED",
          submittedAt: new Date(),
        },
      });
    } else {
      await tx.smsRegistration.create({
        data: {
          workspaceId: profile.workspaceId,
          kind: "brand",
          providerReference: brand.providerBrandId,
          status: brand.status === "approved" ? "APPROVED" : "SUBMITTED",
          submittedAt: new Date(),
        },
      });
    }

    const existingCamp = await tx.smsRegistration.findFirst({
      where: { workspaceId: profile.workspaceId, kind: "campaign" },
    });
    if (existingCamp) {
      await tx.smsRegistration.update({
        where: { id: existingCamp.id },
        data: {
          providerReference: campaign.providerCampaignId,
          status: campaign.status === "approved" ? "APPROVED" : "PENDING_CARRIER",
          submittedAt: new Date(),
        },
      });
    } else {
      await tx.smsRegistration.create({
        data: {
          workspaceId: profile.workspaceId,
          kind: "campaign",
          providerReference: campaign.providerCampaignId,
          status: campaign.status === "approved" ? "APPROVED" : "PENDING_CARRIER",
          submittedAt: new Date(),
        },
      });
    }
  });

  return {
    brandId: brand.providerBrandId,
    campaignId: campaign.providerCampaignId,
    brandStatus: brand.status,
    campaignStatus: campaign.status,
  };
}

/**
 * Search + purchase one US local number, assign to campaign, bind SmsNumber + optional ACTIVE sub.
 */
export async function provisionWorkspaceNumber(input: {
  workspaceId: string;
  areaCode?: string;
  ensureSubscription?: boolean;
}): Promise<{ phoneE164: string; providerNumberId: string }> {
  const profile = await prisma.smsComplianceProfile.findUnique({
    where: { workspaceId: input.workspaceId },
  });
  if (!profile?.campaignId) {
    throw new Error("Workspace has no provider campaignId — submit brand/campaign first");
  }
  if (profile.reviewStatus === "SUSPENDED" || profile.reviewStatus === "CANCELLED") {
    throw new Error("Compliance profile is suspended/cancelled");
  }

  const existing = await prisma.smsNumber.findFirst({
    where: { workspaceId: input.workspaceId, status: "ACTIVE" },
  });
  if (existing) {
    return {
      phoneE164: existing.phoneE164,
      providerNumberId: existing.providerNumberId || existing.id,
    };
  }

  const ops = getSmsProviderOps();
  const found = await ops.searchNumbers({
    numberType: "us-local",
    areaCode: input.areaCode,
    limit: 5,
  });
  if (!found.length) throw new Error("No available SMS numbers for the requested area code");

  const bought = await ops.purchaseNumber(found[0]!.phoneE164, input.workspaceId);
  await ops.assignNumber(bought.providerNumberId, profile.campaignId);

  const row = await prisma.smsNumber.create({
    data: {
      workspaceId: input.workspaceId,
      phoneE164: bought.phoneE164,
      provider: "telnyx",
      providerNumberId: bought.providerNumberId,
      status: "ACTIVE",
      monthlyCostMicros: bought.monthlyCostMicros,
      purchasedAt: new Date(),
    },
  });

  await prisma.smsComplianceProfile.update({
    where: { id: profile.id },
    data: { numberId: row.id },
  });

  if (input.ensureSubscription) {
    const plan = (profile.selectedPlan as "TEXT_ENTRY" | "TEXT_ESSENTIALS" | "TEXT_ADVANTAGE") || "TEXT_ENTRY";
    await prisma.smsSubscription.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        workspaceId: input.workspaceId,
        plan,
        status: "ACTIVE",
        baseMonthlyPriceCents: 0,
        appliedMonthlyPriceCents: 0,
        bundleDiscountPercent: 0,
      },
      update: { status: "ACTIVE", plan },
    });
  }

  return { phoneE164: bought.phoneE164, providerNumberId: bought.providerNumberId };
}
