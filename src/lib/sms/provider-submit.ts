/**
 * Sequenced Telnyx brand → campaign submission.
 * Brand is persisted immediately. Campaign is created ONLY after brand VERIFIED.
 * Never logs EIN. Idempotent: safe to call repeatedly.
 */

import { prisma } from "@/lib/prisma";
import { decryptSmsSensitive } from "@/lib/sms/sensitive";
import { getSmsProviderOps } from "@/lib/sms/provider-ops-registry";
import { normalizeUsPhone } from "@/lib/sms/phone";
import { buildSmsHelpReply, buildSmsStopReply } from "@/lib/sms/consent";
import {
  BrandNotVerifiedError,
  brandPhaseFromStatus,
  campaignPhaseFromStatus,
  canCreateCampaignForBrandStatus,
  deriveLifecyclePhase,
  humanLifecycleMessage,
  type SmsLifecyclePhase,
} from "@/lib/sms/registration-lifecycle";
import {
  parseOwnerPilotMeta,
  writeOwnerPilotMeta,
} from "@/lib/sms/owner-pilot-meta";
import type { BrandRecord, CampaignRecord } from "@/lib/sms/provider-ops";

function normName(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function persistLifecycle(
  profileId: string,
  internalNotes: string | null | undefined,
  phase: SmsLifecyclePhase,
  extra?: Partial<ReturnType<typeof parseOwnerPilotMeta>>
) {
  const notes = writeOwnerPilotMeta(internalNotes, {
    lifecyclePhase: phase,
    ...extra,
  });
  await prisma.smsComplianceProfile.update({
    where: { id: profileId },
    data: { internalNotes: notes },
  });
  return notes;
}

async function upsertRegistration(input: {
  workspaceId: string;
  kind: "brand" | "campaign";
  providerReference: string;
  status: "SUBMITTED" | "PENDING_CARRIER" | "APPROVED" | "REJECTED" | "PREPARING";
  rejectionReason?: string | null;
}) {
  const existing = await prisma.smsRegistration.findFirst({
    where: { workspaceId: input.workspaceId, kind: input.kind },
  });
  if (existing) {
    return prisma.smsRegistration.update({
      where: { id: existing.id },
      data: {
        providerReference: input.providerReference,
        status: input.status,
        rejectionReason: input.rejectionReason ?? existing.rejectionReason,
        submittedAt: existing.submittedAt ?? new Date(),
      },
    });
  }
  return prisma.smsRegistration.create({
    data: {
      workspaceId: input.workspaceId,
      kind: input.kind,
      providerReference: input.providerReference,
      status: input.status,
      rejectionReason: input.rejectionReason ?? null,
      submittedAt: new Date(),
    },
  });
}

/** Find an existing Telnyx brand matching this profile (orphan recovery). */
async function findMatchingProviderBrand(profile: {
  legalEntityName: string | null;
  dbaBrandName: string | null;
  websiteUrl: string | null;
  brandId: string | null;
}): Promise<BrandRecord | null> {
  const ops = getSmsProviderOps({ forceLive: true });
  if (profile.brandId) {
    return ops.retrieveBrand(profile.brandId);
  }
  if (!ops.listBrands) return null;
  const listed = await ops.listBrands();
  const legal = normName(profile.legalEntityName);
  const dba = normName(profile.dbaBrandName);
  const site = normName(profile.websiteUrl);
  const match = listed.find((b) => {
    if (!b.providerBrandId) return false;
    const company = normName(b.companyName);
    const display = normName(b.displayName);
    const website = normName(b.website);
    const nameOk =
      (legal && company === legal) ||
      (dba && display === dba) ||
      (legal && display === legal);
    const siteOk = !site || !website || website === site;
    return Boolean(nameOk && siteOk);
  });
  if (!match) return null;
  return {
    providerBrandId: match.providerBrandId,
    status: match.status,
    failureReason: match.failureReason ?? null,
  };
}

/**
 * STEP 1–3: create or reconcile Brand, persist ID immediately, sync status.
 * Never creates a duplicate when a matching brand already exists.
 */
export async function ensureBrandSubmitted(profileId: string): Promise<{
  brandId: string;
  brandStatus: BrandRecord["status"];
  created: boolean;
  phase: SmsLifecyclePhase;
  message: string;
}> {
  const profile = await prisma.smsComplianceProfile.findUnique({ where: { id: profileId } });
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
  ] as const;
  for (const [name, val] of required) {
    if (!val?.trim()) throw new Error(`Missing required field for brand submit: ${name}`);
  }

  const ops = getSmsProviderOps({ forceLive: true });
  let created = false;
  let brand: BrandRecord | null = await findMatchingProviderBrand(profile);

  if (!brand) {
    let ein: string | null = null;
    if (profile.einBrnCiphertext) {
      ein = decryptSmsSensitive(profile.einBrnCiphertext);
      if (!ein) throw new Error("Could not decrypt EIN (SMS_SENSITIVE_DATA_KEY missing or invalid)");
    } else if (profile.entityType !== "SOLE_PROPRIETOR") {
      throw new Error("EIN is required for STANDARD BUSINESS brand registration");
    }
    const phoneNorm = normalizeUsPhone(profile.supportPhone!);
    if (!phoneNorm) throw new Error("supportPhone must be a valid US number in E.164-capable form");

    brand = await ops.createBrand({
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
    created = true;
  }

  // Persist brand ID immediately — before any campaign attempt.
  const phase = brandPhaseFromStatus(brand.status);
  const reviewStatus =
    brand.status === "rejected"
      ? "REJECTED"
      : brand.status === "approved"
        ? "PROVIDER_PENDING"
        : "PROVIDER_PENDING";
  const providerStatus =
    brand.status === "rejected"
      ? "REJECTED"
      : brand.status === "approved"
        ? "PENDING_CARRIER"
        : "SUBMITTED";

  await prisma.smsComplianceProfile.update({
    where: { id: profile.id },
    data: {
      brandId: brand.providerBrandId,
      reviewStatus: reviewStatus as never,
      providerStatus: providerStatus as never,
      submittedAt: profile.submittedAt ?? new Date(),
      rejectionReason: brand.status === "rejected" ? brand.failureReason ?? profile.rejectionReason : null,
    },
  });

  await upsertRegistration({
    workspaceId: profile.workspaceId,
    kind: "brand",
    providerReference: brand.providerBrandId,
    status:
      brand.status === "approved"
        ? "APPROVED"
        : brand.status === "rejected"
          ? "REJECTED"
          : "SUBMITTED",
    rejectionReason: brand.failureReason,
  });

  await persistLifecycle(profile.id, profile.internalNotes, phase, {
    submittedToProviderAt: new Date().toISOString(),
    registrationUnlocked: true,
    enabled: true,
    workspaceId: profile.workspaceId,
  });

  return {
    brandId: brand.providerBrandId,
    brandStatus: brand.status,
    created,
    phase,
    message: humanLifecycleMessage(phase),
  };
}

/**
 * STEP 4–5: create Campaign ONLY when Brand is VERIFIED. Idempotent.
 */
export async function ensureCampaignSubmitted(profileId: string): Promise<{
  campaignId: string | null;
  campaignStatus: CampaignRecord["status"] | null;
  brandStatus: BrandRecord["status"];
  created: boolean;
  phase: SmsLifecyclePhase;
  message: string;
  skippedReason?: string;
}> {
  const profile = await prisma.smsComplianceProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new Error("Compliance profile not found");
  if (!profile.brandId) {
    throw new BrandNotVerifiedError("brand_not_verified (no brandId)");
  }

  const ops = getSmsProviderOps({ forceLive: true });
  const brand = await ops.retrieveBrand(profile.brandId);

  // Refresh brand phase in DB
  const brandPhase = brandPhaseFromStatus(brand.status);
  await prisma.smsComplianceProfile.update({
    where: { id: profile.id },
    data: {
      rejectionReason:
        brand.status === "rejected" ? brand.failureReason ?? profile.rejectionReason : profile.rejectionReason,
      providerStatus:
        brand.status === "rejected"
          ? "REJECTED"
          : brand.status === "approved"
            ? "PENDING_CARRIER"
            : "SUBMITTED",
      reviewStatus: brand.status === "rejected" ? "REJECTED" : "PROVIDER_PENDING",
    },
  });
  await upsertRegistration({
    workspaceId: profile.workspaceId,
    kind: "brand",
    providerReference: brand.providerBrandId,
    status:
      brand.status === "approved"
        ? "APPROVED"
        : brand.status === "rejected"
          ? "REJECTED"
          : "SUBMITTED",
    rejectionReason: brand.failureReason,
  });

  if (!canCreateCampaignForBrandStatus(brand.status)) {
    await persistLifecycle(profile.id, profile.internalNotes, brandPhase);
    if (brand.status === "rejected") {
      return {
        campaignId: profile.campaignId,
        campaignStatus: null,
        brandStatus: brand.status,
        created: false,
        phase: "BRAND_FAILED",
        message: humanLifecycleMessage("BRAND_FAILED"),
        skippedReason: brand.failureReason || "brand_failed",
      };
    }
    // Pending is NOT an application error
    return {
      campaignId: null,
      campaignStatus: null,
      brandStatus: brand.status,
      created: false,
      phase: brandPhase,
      message: humanLifecycleMessage(brandPhase),
      skippedReason: "brand_not_verified",
    };
  }

  // Brand verified — create campaign once, or retrieve existing
  if (profile.campaignId) {
    const campaign = await ops.retrieveCampaign(profile.campaignId);
    const phase = campaignPhaseFromStatus(campaign.status);
    const bothApproved = campaign.status === "approved";
    await prisma.smsComplianceProfile.update({
      where: { id: profile.id },
      data: {
        campaignId: campaign.providerCampaignId,
        reviewStatus: bothApproved ? "APPROVED" : campaign.status === "rejected" ? "REJECTED" : "PROVIDER_PENDING",
        providerStatus: bothApproved
          ? "APPROVED"
          : campaign.status === "rejected"
            ? "REJECTED"
            : "PENDING_CARRIER",
        ...(bothApproved ? { approvedAt: new Date() } : {}),
        ...(campaign.status === "rejected"
          ? { rejectionReason: campaign.failureReason ?? profile.rejectionReason }
          : {}),
      },
    });
    await upsertRegistration({
      workspaceId: profile.workspaceId,
      kind: "campaign",
      providerReference: campaign.providerCampaignId,
      status:
        campaign.status === "approved"
          ? "APPROVED"
          : campaign.status === "rejected"
            ? "REJECTED"
            : "PENDING_CARRIER",
      rejectionReason: campaign.failureReason,
    });
    const finalPhase = bothApproved ? "NUMBER_READY" : phase;
    await persistLifecycle(profile.id, profile.internalNotes, finalPhase, {
      numberPurchaseUnlocked: bothApproved,
    });
    return {
      campaignId: campaign.providerCampaignId,
      campaignStatus: campaign.status,
      brandStatus: brand.status,
      created: false,
      phase: finalPhase,
      message: humanLifecycleMessage(finalPhase),
    };
  }

  // App-side guard (also enforced in TelnyxSmsProviderOps.createCampaign)
  if (!canCreateCampaignForBrandStatus(brand.status)) {
    throw new BrandNotVerifiedError("brand_not_verified");
  }

  for (const name of [
    "optInDescription",
    "sampleMessage1",
    "sampleMessage2",
  ] as const) {
    if (!profile[name]?.trim()) throw new Error(`Missing required field for campaign: ${name}`);
  }

  const phoneNorm = normalizeUsPhone(profile.supportPhone || "");
  const brandName = profile.dbaBrandName!;
  const help =
    profile.helpResponse?.trim() ||
    buildSmsHelpReply({
      brandName,
      supportEmail: profile.supportEmail,
      supportPhone: phoneNorm?.e164,
    });
  const stop = profile.stopResponse?.trim() || buildSmsStopReply(brandName);

  let campaign;
  try {
    campaign = await ops.createCampaign({
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Do not recreate Brand. Soft-defer when provider balance blocks campaign registration.
    if (/20100|insufficient funds|at least \$30/i.test(msg)) {
      await persistLifecycle(profile.id, profile.internalNotes, "BRAND_VERIFIED");
      return {
        campaignId: null,
        campaignStatus: null,
        brandStatus: brand.status,
        created: false,
        phase: "BRAND_VERIFIED",
        message:
          "Text messaging registration is ready, but the provider account needs additional balance before the campaign can be submitted.",
        skippedReason: "insufficient_funds",
      };
    }
    throw err;
  }

  const phase = campaignPhaseFromStatus(campaign.status);
  await prisma.smsComplianceProfile.update({
    where: { id: profile.id },
    data: {
      campaignId: campaign.providerCampaignId,
      reviewStatus: campaign.status === "approved" ? "APPROVED" : "PROVIDER_PENDING",
      providerStatus: campaign.status === "approved" ? "APPROVED" : "PENDING_CARRIER",
      ...(campaign.status === "approved" ? { approvedAt: new Date() } : {}),
    },
  });
  await upsertRegistration({
    workspaceId: profile.workspaceId,
    kind: "campaign",
    providerReference: campaign.providerCampaignId,
    status: campaign.status === "approved" ? "APPROVED" : "PENDING_CARRIER",
  });
  const finalPhase = campaign.status === "approved" ? "NUMBER_READY" : phase;
  await persistLifecycle(profile.id, profile.internalNotes, finalPhase, {
    numberPurchaseUnlocked: campaign.status === "approved",
  });

  return {
    campaignId: campaign.providerCampaignId,
    campaignStatus: campaign.status,
    brandStatus: brand.status,
    created: true,
    phase: finalPhase,
    message: humanLifecycleMessage(finalPhase),
  };
}

/**
 * Idempotent orchestrator:
 * - ensure brand exists (reconcile orphans)
 * - sync brand
 * - create campaign only when verified
 * - sync campaign
 */
export async function advanceRegistrationLifecycle(profileId: string): Promise<{
  brandId: string | null;
  campaignId: string | null;
  brandStatus: string | null;
  campaignStatus: string | null;
  brandCreated: boolean;
  campaignCreated: boolean;
  phase: SmsLifecyclePhase;
  message: string;
}> {
  const brandResult = await ensureBrandSubmitted(profileId);
  if (brandResult.brandStatus === "rejected") {
    return {
      brandId: brandResult.brandId,
      campaignId: null,
      brandStatus: brandResult.brandStatus,
      campaignStatus: null,
      brandCreated: brandResult.created,
      campaignCreated: false,
      phase: brandResult.phase,
      message: brandResult.message,
    };
  }

  const campResult = await ensureCampaignSubmitted(profileId);
  return {
    brandId: brandResult.brandId,
    campaignId: campResult.campaignId,
    brandStatus: campResult.brandStatus,
    campaignStatus: campResult.campaignStatus,
    brandCreated: brandResult.created,
    campaignCreated: campResult.created,
    phase: campResult.phase,
    message: campResult.message,
  };
}

/** @deprecated Prefer advanceRegistrationLifecycle — kept for older admin callers. */
export async function submitComplianceProfileToProvider(profileId: string): Promise<{
  brandId: string;
  campaignId: string;
  brandStatus: string;
  campaignStatus: string;
}> {
  const result = await advanceRegistrationLifecycle(profileId);
  if (!result.brandId) throw new Error("Brand submission did not return a brandId");
  if (!result.campaignId) {
    if (result.phase === "BRAND_PENDING" || result.phase === "BRAND_SUBMITTED") {
      // Return brand-only success shape with empty campaign — callers should handle
      throw new BrandNotVerifiedError(result.message);
    }
    throw new Error(result.message || "Campaign not created");
  }
  return {
    brandId: result.brandId,
    campaignId: result.campaignId,
    brandStatus: result.brandStatus || "pending",
    campaignStatus: result.campaignStatus || "pending",
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
    throw new Error("Workspace has no provider campaignId — wait for campaign approval first");
  }
  if (profile.reviewStatus === "SUSPENDED" || profile.reviewStatus === "CANCELLED") {
    throw new Error("Compliance profile is suspended/cancelled");
  }
  if (profile.reviewStatus !== "APPROVED" && profile.providerStatus !== "APPROVED") {
    // Soft check — also allow NUMBER_READY lifecycle
    const meta = parseOwnerPilotMeta(profile.internalNotes);
    if (meta.lifecyclePhase !== "NUMBER_READY" && meta.lifecyclePhase !== "CAMPAIGN_APPROVED") {
      if (!meta.numberPurchaseUnlocked) {
        throw new Error("Campaign must be APPROVED before purchasing a number");
      }
    }
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

  const ops = getSmsProviderOps({ forceLive: true });
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

  const notes = writeOwnerPilotMeta(profile.internalNotes, {
    lifecyclePhase: "NUMBER_ASSIGNED",
    numberPurchaseUnlocked: true,
  });
  await prisma.smsComplianceProfile.update({
    where: { id: profile.id },
    data: { numberId: row.id, internalNotes: notes },
  });

  if (input.ensureSubscription) {
    const plan =
      (profile.selectedPlan as "TEXT_ENTRY" | "TEXT_ESSENTIALS" | "TEXT_ADVANTAGE") || "TEXT_ENTRY";
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

export function getRegistrationSnapshot(profile: {
  brandId: string | null;
  campaignId: string | null;
  numberId: string | null;
  internalNotes: string | null;
  brandStatus?: string | null;
  campaignStatus?: string | null;
}) {
  const meta = parseOwnerPilotMeta(profile.internalNotes);
  const phase: SmsLifecyclePhase =
    (meta.lifecyclePhase as SmsLifecyclePhase | null) ||
    deriveLifecyclePhase({
      brandId: profile.brandId,
      campaignId: profile.campaignId,
      numberId: profile.numberId,
      brandStatus: profile.brandStatus,
      campaignStatus: profile.campaignStatus,
      liveSendingUnlocked: meta.liveSendingUnlocked,
    });
  return {
    phase,
    message: humanLifecycleMessage(phase),
    brandIdShort: profile.brandId ? `${profile.brandId.slice(0, 8)}…` : null,
    campaignIdShort: profile.campaignId ? `${profile.campaignId.slice(0, 8)}…` : null,
  };
}
