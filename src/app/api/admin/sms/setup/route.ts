/**
 * Owner/admin secure SMS compliance + pilot setup.
 * EIN is encrypted at rest; never returned in full after save.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { isSmsAdminEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import {
  ENTITY_TYPES,
  SMS_USE_CASES,
  estimateRegistrationFeesCents,
  validateComplianceProfileForSubmit,
} from "@/lib/sms/compliance";
import {
  canEncryptSmsSensitiveData,
  encryptSmsSensitive,
  redactEin,
} from "@/lib/sms/sensitive";
import { normalizeUsPhone, redactPhone } from "@/lib/sms/phone";
import { SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent";
import {
  OWNER_PILOT_EXPECTED_LEGAL_NAME,
  ownerPilotDefaultsForForm,
  parseOwnerPilotMeta,
  writeOwnerPilotMeta,
} from "@/lib/sms/owner-pilot-meta";
import { defaultOwnerPilotWorkspaceId } from "@/lib/sms/pilot";
import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";
import {
  deriveLifecyclePhase,
  humanLifecycleMessage,
  primaryActionForPhase,
  type SmsLifecyclePhase,
} from "@/lib/sms/registration-lifecycle";
import { BrandNotVerifiedError } from "@/lib/sms/registration-lifecycle";

const saveSchema = z.object({
  action: z.enum([
    "save",
    "submit-brand",
    "submit-provider", // alias → advance brand (then campaign only if verified)
    "create-campaign",
    "sync-brand",
    "sync-campaign",
    "sync-status",
    "purchase-pilot-number",
    "enable-live",
  ]),
  legalEntityName: z.string().max(200).optional(),
  dbaBrandName: z.string().max(200).optional(),
  einBrn: z.string().max(40).optional().nullable(),
  entityType: z.enum(ENTITY_TYPES).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(40).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  websiteUrl: z.string().max(500).optional(),
  supportEmail: z.string().max(200).optional(),
  supportPhone: z.string().max(40).optional(),
  industryVertical: z.string().max(80).optional(),
  smsUseCase: z.enum(SMS_USE_CASES).optional(),
  estimatedMonthlyVolume: z.number().int().min(1).max(10_000_000).optional(),
  optInDescription: z.string().max(4000).optional(),
  optInFormUrl: z.string().max(500).optional(),
  optInEvidenceUrl: z.string().max(500).optional(),
  privacyPolicyUrl: z.string().max(500).optional(),
  smsTermsUrl: z.string().max(500).optional(),
  sampleMessage1: z.string().max(1000).optional(),
  sampleMessage2: z.string().max(1000).optional(),
  helpResponse: z.string().max(500).optional(),
  stopResponse: z.string().max(500).optional(),
  selectedPlan: z.enum(["TEXT_ENTRY", "TEXT_ESSENTIALS", "TEXT_ADVANTAGE"]).optional(),
  disclosureAccepted: z.boolean().optional(),
  pilotPhone: z.string().max(40).optional(),
  areaCode: z.string().max(3).optional(),
  confirmPurchase: z.boolean().optional(),
});

function serializeSafe(profile: {
  id: string;
  workspaceId: string;
  legalEntityName: string | null;
  dbaBrandName: string | null;
  einBrnCiphertext: string | null;
  entityType: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  websiteUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  industryVertical: string | null;
  smsUseCase: string | null;
  estimatedMonthlyVolume: number | null;
  optInDescription: string | null;
  optInFormUrl: string | null;
  optInEvidenceUrl: string | null;
  privacyPolicyUrl: string | null;
  smsTermsUrl: string | null;
  sampleMessage1: string | null;
  sampleMessage2: string | null;
  helpResponse: string | null;
  stopResponse: string | null;
  selectedPlan: string | null;
  disclosureAcceptedAt: Date | null;
  reviewStatus: string;
  providerStatus: string;
  brandId: string | null;
  campaignId: string | null;
  numberId: string | null;
  rejectionReason: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  internalNotes: string | null;
}) {
  const meta = parseOwnerPilotMeta(profile.internalNotes);
  const phase =
    (meta.lifecyclePhase as SmsLifecyclePhase | null) ||
    deriveLifecyclePhase({
      brandId: profile.brandId,
      campaignId: profile.campaignId,
      numberId: profile.numberId,
      liveSendingUnlocked: meta.liveSendingUnlocked,
    });
  const primary = primaryActionForPhase(phase);
  return {
    id: profile.id,
    workspaceId: profile.workspaceId,
    legalEntityName: profile.legalEntityName,
    dbaBrandName: profile.dbaBrandName,
    einOnFile: Boolean(profile.einBrnCiphertext),
    einMasked: profile.einBrnCiphertext ? "**-***XXXX (on file)" : null,
    entityType: profile.entityType,
    street: profile.street,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    country: profile.country,
    websiteUrl: profile.websiteUrl,
    supportEmail: profile.supportEmail,
    supportPhone: profile.supportPhone,
    industryVertical: profile.industryVertical,
    smsUseCase: profile.smsUseCase,
    estimatedMonthlyVolume: profile.estimatedMonthlyVolume,
    optInDescription: profile.optInDescription,
    optInFormUrl: profile.optInFormUrl,
    optInEvidenceUrl: profile.optInEvidenceUrl,
    privacyPolicyUrl: profile.privacyPolicyUrl,
    smsTermsUrl: profile.smsTermsUrl,
    sampleMessage1: profile.sampleMessage1,
    sampleMessage2: profile.sampleMessage2,
    helpResponse: profile.helpResponse,
    stopResponse: profile.stopResponse,
    selectedPlan: profile.selectedPlan,
    disclosureAccepted: Boolean(profile.disclosureAcceptedAt),
    reviewStatus: profile.reviewStatus,
    providerStatus: profile.providerStatus,
    brandId: profile.brandId,
    brandIdShort: profile.brandId ? `${profile.brandId.slice(0, 8)}…` : null,
    campaignId: profile.campaignId,
    campaignIdShort: profile.campaignId ? `${profile.campaignId.slice(0, 8)}…` : null,
    numberId: profile.numberId,
    rejectionReason: profile.rejectionReason,
    submittedAt: profile.submittedAt,
    approvedAt: profile.approvedAt,
    pilotPhoneMasked: meta.pilotPhoneE164 ? redactPhone(meta.pilotPhoneE164) : null,
    pilotPhoneOnFile: Boolean(meta.pilotPhoneE164),
    registrationUnlocked: meta.registrationUnlocked,
    numberPurchaseUnlocked: meta.numberPurchaseUnlocked,
    liveSendingUnlocked: meta.liveSendingUnlocked,
    inboundUnlocked: meta.inboundUnlocked,
    lifecyclePhase: phase,
    lifecycleMessage: humanLifecycleMessage(phase),
    primaryAction: primary,
    encryptionReady: canEncryptSmsSensitiveData(),
  };
}

export async function GET() {
  if (!isSmsCodeEnabled() || !isSmsAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workspaceId = defaultOwnerPilotWorkspaceId();
  const profile = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
  const number = await prisma.smsNumber.findFirst({
    where: { workspaceId, status: "ACTIVE" },
  });
  const fees = estimateRegistrationFeesCents();
  const numberMonthlyCents = Number(MOCK_PROVIDER_COSTS.numberMonthlyMicros / 10_000n) / 100;

  return NextResponse.json({
    expectedLegalName: OWNER_PILOT_EXPECTED_LEGAL_NAME,
    workspaceId,
    defaults: ownerPilotDefaultsForForm(),
    profile: profile ? serializeSafe(profile) : null,
    activeNumber: number
      ? { phoneE164: number.phoneE164, monthlyCostMicros: number.monthlyCostMicros.toString() }
      : null,
    feeEstimate: fees,
    expectedNumberMonthlyUsd: numberMonthlyCents,
    publicSms: false,
    encryptionReady: canEncryptSmsSensitiveData(),
  });
}

export async function POST(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const workspaceId = defaultOwnerPilotWorkspaceId();
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) {
    return NextResponse.json({ error: "Owner workspace not found" }, { status: 404 });
  }

  if (parsed.data.action === "sync-status" || parsed.data.action === "sync-brand" || parsed.data.action === "sync-campaign") {
    const existing = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
    if (!existing) {
      return NextResponse.json({ error: "Save compliance profile first" }, { status: 400 });
    }
    // Reconcile orphan brand + advance lifecycle (idempotent)
    const { advanceRegistrationLifecycle } = await import("@/lib/sms/provider-submit");
    const { syncPendingSmsRegistrations } = await import("@/lib/sms/sync-registration");
    let advance: Awaited<ReturnType<typeof advanceRegistrationLifecycle>> | null = null;
    try {
      advance = await advanceRegistrationLifecycle(existing.id);
    } catch (err) {
      if (!(err instanceof BrandNotVerifiedError)) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Sync failed" },
          { status: 502 }
        );
      }
    }
    const sync = await syncPendingSmsRegistrations();
    const profile = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
    return NextResponse.json({
      ok: true,
      sync,
      advance,
      profile: profile ? serializeSafe(profile) : null,
      publicSms: false,
      next: profile
        ? humanLifecycleMessage(
            (parseOwnerPilotMeta(profile.internalNotes).lifecyclePhase as SmsLifecyclePhase) ||
              deriveLifecyclePhase({
                brandId: profile.brandId,
                campaignId: profile.campaignId,
                numberId: profile.numberId,
              })
          )
        : "Synced.",
    });
  }

  if (parsed.data.action === "enable-live") {
    const existing = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
    if (!existing?.numberId || existing.reviewStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Campaign must be APPROVED with an assigned number before live unlock" },
        { status: 409 }
      );
    }
    const notes = writeOwnerPilotMeta(existing.internalNotes, {
      enabled: true,
      workspaceId,
      liveSendingUnlocked: true,
      inboundUnlocked: true,
      numberPurchaseUnlocked: true,
      registrationUnlocked: true,
    });
    const updated = await prisma.smsComplianceProfile.update({
      where: { id: existing.id },
      data: { internalNotes: notes },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: ctx.user.id,
        action: "admin.sms.owner_pilot.enable_live",
        targetType: "SmsComplianceProfile",
        targetId: existing.id,
        meta: { publicSms: false },
      },
    });
    return NextResponse.json({ profile: serializeSafe(updated), publicSms: false });
  }

  if (parsed.data.action === "purchase-pilot-number") {
    if (!parsed.data.confirmPurchase) {
      return NextResponse.json(
        { error: "confirmPurchase=true required — review monthly number cost first" },
        { status: 400 }
      );
    }
    const existing = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
    if (!existing) {
      return NextResponse.json({ error: "Save compliance profile first" }, { status: 400 });
    }
    const meta = parseOwnerPilotMeta(existing.internalNotes);
    const { isOwnerPilotNumberPurchaseAllowed } = await import("@/lib/sms/pilot");
    const { isSmsNumberPurchaseEnabled } = await import("@/lib/sms/flags");
    if (
      !isSmsNumberPurchaseEnabled() &&
      !(await isOwnerPilotNumberPurchaseAllowed(workspaceId)) &&
      existing.reviewStatus !== "APPROVED" &&
      !meta.numberPurchaseUnlocked
    ) {
      return NextResponse.json(
        { error: "Number purchase not unlocked — wait for campaign APPROVED" },
        { status: 403 }
      );
    }
    // Ensure unlock for owner path
    await prisma.smsComplianceProfile.update({
      where: { id: existing.id },
      data: {
        internalNotes: writeOwnerPilotMeta(existing.internalNotes, {
          numberPurchaseUnlocked: true,
          enabled: true,
          workspaceId,
          registrationUnlocked: true,
        }),
      },
    });

    try {
      const { provisionWorkspaceNumber } = await import("@/lib/sms/provider-submit");
      const result = await provisionWorkspaceNumber({
        workspaceId,
        areaCode: parsed.data.areaCode,
        ensureSubscription: true,
      });
      const after = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
      const notes = writeOwnerPilotMeta(after!.internalNotes, {
        liveSendingUnlocked: true,
        inboundUnlocked: true,
        numberPurchaseUnlocked: true,
        enabled: true,
        workspaceId,
      });
      const updated = await prisma.smsComplianceProfile.update({
        where: { id: after!.id },
        data: { internalNotes: notes },
      });
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: ctx.user.id,
          action: "admin.sms.owner_pilot.purchase_number",
          targetType: "SmsNumber",
          targetId: result.providerNumberId,
          meta: { phoneE164: result.phoneE164 },
        },
      });
      return NextResponse.json({
        ok: true,
        phoneE164: result.phoneE164,
        profile: serializeSafe(updated),
        publicSms: false,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Purchase failed" },
        { status: 502 }
      );
    }
  }

  // save or submit-provider
  const data = parsed.data;
  const defaults = ownerPilotDefaultsForForm();

  let pilotPhoneE164: string | null | undefined = undefined;
  if (data.pilotPhone !== undefined) {
    const norm = normalizeUsPhone(data.pilotPhone);
    if (!norm) {
      return NextResponse.json({ error: "Pilot phone must be a valid US number" }, { status: 400 });
    }
    pilotPhoneE164 = norm.e164;
  }

  let einBrnCiphertext: string | null | undefined = undefined;
  if (data.einBrn !== undefined && data.einBrn !== null && data.einBrn !== "") {
    if (!canEncryptSmsSensitiveData()) {
      return NextResponse.json(
        { error: "SMS_SENSITIVE_DATA_KEY is not configured" },
        { status: 503 }
      );
    }
    // Validate format without logging digits
    const digits = data.einBrn.replace(/\D/g, "");
    if (digits.length !== 9) {
      return NextResponse.json({ error: "EIN must be 9 digits" }, { status: 400 });
    }
    einBrnCiphertext = encryptSmsSensitive(digits);
    if (!einBrnCiphertext) {
      return NextResponse.json({ error: "Failed to encrypt EIN" }, { status: 503 });
    }
    void redactEin(digits); // ensure helper stays used for audit style — never log
  }

  const existing = await prisma.smsComplianceProfile.findUnique({ where: { workspaceId } });
  const nextMetaBase = parseOwnerPilotMeta(existing?.internalNotes);
  if (pilotPhoneE164) nextMetaBase.pilotPhoneE164 = pilotPhoneE164;

  const fieldPayload = {
    selectedPlan: data.selectedPlan ?? existing?.selectedPlan ?? defaults.selectedPlan,
    legalEntityName: data.legalEntityName ?? existing?.legalEntityName ?? defaults.legalEntityName,
    dbaBrandName: data.dbaBrandName ?? existing?.dbaBrandName ?? defaults.dbaBrandName,
    registrationType: "10DLC" as const,
    registrationCountry: "US",
    entityType: data.entityType ?? existing?.entityType ?? defaults.entityType,
    street: data.street ?? existing?.street ?? null,
    city: data.city ?? existing?.city ?? null,
    state: data.state ?? existing?.state ?? null,
    postalCode: data.postalCode ?? existing?.postalCode ?? null,
    country: data.country ?? existing?.country ?? "US",
    websiteUrl: data.websiteUrl ?? existing?.websiteUrl ?? defaults.websiteUrl,
    supportEmail: data.supportEmail ?? existing?.supportEmail ?? defaults.supportEmail,
    supportPhone: data.supportPhone ?? existing?.supportPhone ?? null,
    industryVertical:
      data.industryVertical ?? existing?.industryVertical ?? defaults.industryVertical,
    smsUseCase: data.smsUseCase ?? existing?.smsUseCase ?? defaults.smsUseCase,
    estimatedMonthlyVolume:
      data.estimatedMonthlyVolume ??
      existing?.estimatedMonthlyVolume ??
      defaults.estimatedMonthlyVolume,
    optInDescription:
      data.optInDescription ?? existing?.optInDescription ?? defaults.optInDescription,
    optInFormUrl: data.optInFormUrl ?? existing?.optInFormUrl ?? defaults.optInFormUrl,
    optInEvidenceUrl:
      data.optInEvidenceUrl ?? existing?.optInEvidenceUrl ?? defaults.optInEvidenceUrl,
    privacyPolicyUrl:
      data.privacyPolicyUrl ?? existing?.privacyPolicyUrl ?? defaults.privacyPolicyUrl,
    smsTermsUrl: data.smsTermsUrl ?? existing?.smsTermsUrl ?? defaults.smsTermsUrl,
    sampleMessage1: data.sampleMessage1 ?? existing?.sampleMessage1 ?? defaults.sampleMessage1,
    sampleMessage2: data.sampleMessage2 ?? existing?.sampleMessage2 ?? defaults.sampleMessage2,
    helpResponse: data.helpResponse ?? existing?.helpResponse ?? defaults.helpResponse,
    stopResponse: data.stopResponse ?? existing?.stopResponse ?? defaults.stopResponse,
  };

  const disclosureAccepted =
    data.disclosureAccepted === true || Boolean(existing?.disclosureAcceptedAt);

  const validationInput = {
    ...fieldPayload,
    einBrn: einBrnCiphertext || existing?.einBrnCiphertext ? "12-3456789" : data.einBrn ?? null,
    disclosureAccepted,
  };
  const errors = validateComplianceProfileForSubmit(validationInput);
  if (!einBrnCiphertext && !existing?.einBrnCiphertext && fieldPayload.entityType !== "SOLE_PROPRIETOR") {
    errors.einBrn = "EIN is required";
  }
  if (!nextMetaBase.pilotPhoneE164 && !pilotPhoneE164) {
    errors.pilotPhone = "Owner pilot phone is required";
  }
  if (Object.keys(errors).length && (data.action === "submit-provider" || data.action === "submit-brand" || data.action === "create-campaign")) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  const unlockedNotes = writeOwnerPilotMeta(existing?.internalNotes, {
    enabled: true,
    workspaceId,
    pilotPhoneE164: pilotPhoneE164 ?? nextMetaBase.pilotPhoneE164,
    registrationUnlocked: true,
    numberPurchaseUnlocked: nextMetaBase.numberPurchaseUnlocked,
    liveSendingUnlocked: nextMetaBase.liveSendingUnlocked,
    inboundUnlocked: nextMetaBase.inboundUnlocked,
  });

  const profile = await prisma.smsComplianceProfile.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      ...fieldPayload,
      ...(einBrnCiphertext !== undefined ? { einBrnCiphertext } : {}),
      disclosureAcceptedAt: disclosureAccepted ? new Date() : null,
      disclosureVersion: disclosureAccepted ? SMS_CONSENT_DISCLOSURE_VERSION : null,
      reviewStatus: "DRAFT",
      internalNotes: unlockedNotes,
      feeEstimateCents: estimateRegistrationFeesCents().oneTimeCents,
    },
    update: {
      ...fieldPayload,
      ...(einBrnCiphertext !== undefined ? { einBrnCiphertext } : {}),
      ...(disclosureAccepted
        ? {
            disclosureAcceptedAt: new Date(),
            disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
          }
        : {}),
      internalNotes: unlockedNotes,
      feeEstimateCents: estimateRegistrationFeesCents().oneTimeCents,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId,
      userId: ctx.user.id,
      action: "admin.sms.owner_pilot.save",
      targetType: "SmsComplianceProfile",
      targetId: profile.id,
      meta: {
        einOnFile: Boolean(profile.einBrnCiphertext),
        pilotPhoneMasked: redactPhone(pilotPhoneE164 ?? nextMetaBase.pilotPhoneE164),
        action: data.action,
        // never include EIN
      },
    },
  });

  if (data.action === "save") {
    const stillInvalid = Object.keys(errors).length > 0;
    return NextResponse.json({
      profile: serializeSafe(profile),
      validation: stillInvalid ? errors : {},
      readyForProvider: !stillInvalid,
      publicSms: false,
      next: stillInvalid
        ? "Fix validation errors, then Save again."
        : "Profile saved. Click Submit Brand when ready.",
    });
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  await prisma.smsComplianceProfile.update({
    where: { id: profile.id },
    data: {
      reviewStatus:
        profile.reviewStatus === "DRAFT" || profile.reviewStatus === "READY_FOR_PROVIDER"
          ? "READY_FOR_PROVIDER"
          : profile.reviewStatus,
      submittedAt: profile.submittedAt ?? new Date(),
      reviewedAt: new Date(),
      reviewedByUserId: ctx.user.id,
    },
  });

  try {
    const {
      ensureBrandSubmitted,
      ensureCampaignSubmitted,
      advanceRegistrationLifecycle,
    } = await import("@/lib/sms/provider-submit");

    if (data.action === "create-campaign") {
      const camp = await ensureCampaignSubmitted(profile.id);
      const final = await prisma.smsComplianceProfile.findUnique({ where: { id: profile.id } });
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: ctx.user.id,
          action: "admin.sms.owner_pilot.create_campaign",
          targetType: "SmsComplianceProfile",
          targetId: profile.id,
          meta: {
            campaignId: camp.campaignId,
            campaignStatus: camp.campaignStatus,
            brandStatus: camp.brandStatus,
            created: camp.created,
            phase: camp.phase,
            skippedReason: camp.skippedReason ?? null,
          },
        },
      });
      return NextResponse.json({
        profile: final ? serializeSafe(final) : null,
        result: camp,
        publicSms: false,
        next: camp.message,
      });
    }

    // submit-brand / submit-provider: brand first; campaign only if already verified
    if (data.action === "submit-brand") {
      const brand = await ensureBrandSubmitted(profile.id);
      let camp: Awaited<ReturnType<typeof ensureCampaignSubmitted>> | null = null;
      if (brand.brandStatus === "approved") {
        camp = await ensureCampaignSubmitted(profile.id);
      }
      const final = await prisma.smsComplianceProfile.findUnique({ where: { id: profile.id } });
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: ctx.user.id,
          action: "admin.sms.owner_pilot.submit_brand",
          targetType: "SmsComplianceProfile",
          targetId: profile.id,
          meta: {
            brandId: brand.brandId,
            brandStatus: brand.brandStatus,
            brandCreated: brand.created,
            campaignId: camp?.campaignId ?? null,
            campaignCreated: camp?.created ?? false,
            phase: camp?.phase ?? brand.phase,
          },
        },
      });
      return NextResponse.json({
        profile: final ? serializeSafe(final) : null,
        brand,
        campaign: camp,
        publicSms: false,
        next: camp?.message ?? brand.message,
      });
    }

    // submit-provider alias — full advance (still no premature campaign)
    const providerSubmit = await advanceRegistrationLifecycle(profile.id);
    const final = await prisma.smsComplianceProfile.findUnique({ where: { id: profile.id } });
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: ctx.user.id,
        action: "admin.sms.owner_pilot.provider_submit",
        targetType: "SmsComplianceProfile",
        targetId: profile.id,
        meta: {
          brandId: providerSubmit.brandId,
          campaignId: providerSubmit.campaignId,
          brandStatus: providerSubmit.brandStatus,
          campaignStatus: providerSubmit.campaignStatus,
          brandCreated: providerSubmit.brandCreated,
          campaignCreated: providerSubmit.campaignCreated,
          phase: providerSubmit.phase,
        },
      },
    });
    return NextResponse.json({
      profile: final ? serializeSafe(final) : null,
      providerSubmit,
      publicSms: false,
      next: providerSubmit.message,
    });
  } catch (err) {
    if (err instanceof BrandNotVerifiedError) {
      const refreshed = await prisma.smsComplianceProfile.findUnique({ where: { id: profile.id } });
      return NextResponse.json({
        profile: refreshed ? serializeSafe(refreshed) : serializeSafe(profile),
        publicSms: false,
        next: err.message.includes("brand_not_verified")
          ? humanLifecycleMessage("BRAND_PENDING")
          : err.message,
      });
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Provider submission failed",
        profile: serializeSafe(profile),
      },
      { status: 502 }
    );
  }
}
