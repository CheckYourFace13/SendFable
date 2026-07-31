import { NextResponse } from "next/server";
import { z } from "zod";
import type { SmsComplianceReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import {
  assertSmsOnboardingSurface,
  SmsBillingGuardError,
} from "@/lib/sms/billing-guards";
import {
  ENTITY_TYPES,
  SMS_USE_CASES,
  estimatePlanMarginBasisPoints,
  estimateRegistrationFeesCents,
  validateComplianceProfileForSubmit,
} from "@/lib/sms/compliance";
import { encryptSmsSensitive, canEncryptSmsSensitiveData } from "@/lib/sms/sensitive";
import { SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent";
import type { SmsPlanKey } from "@/lib/sms/pricing";

const patchSchema = z.object({
  selectedPlan: z.enum(["TEXT_ENTRY", "TEXT_ESSENTIALS", "TEXT_ADVANTAGE"]).optional(),
  legalEntityName: z.string().max(200).optional().nullable(),
  dbaBrandName: z.string().max(200).optional().nullable(),
  einBrn: z.string().max(40).optional().nullable(),
  registrationType: z.enum(["10DLC", "TOLL_FREE", "SOLE_PROPRIETOR"]).optional().nullable(),
  registrationCountry: z.string().max(2).optional().nullable(),
  entityType: z.enum(ENTITY_TYPES).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(40).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  websiteUrl: z.string().max(500).optional().nullable(),
  supportEmail: z.string().max(200).optional().nullable(),
  supportPhone: z.string().max(40).optional().nullable(),
  industryVertical: z.string().max(80).optional().nullable(),
  smsUseCase: z.enum(SMS_USE_CASES).optional().nullable(),
  estimatedMonthlyVolume: z.number().int().min(0).max(10_000_000).optional().nullable(),
  optInDescription: z.string().max(4000).optional().nullable(),
  optInFormUrl: z.string().max(500).optional().nullable(),
  optInEvidenceUrl: z.string().max(500).optional().nullable(),
  privacyPolicyUrl: z.string().max(500).optional().nullable(),
  smsTermsUrl: z.string().max(500).optional().nullable(),
  sampleMessage1: z.string().max(1000).optional().nullable(),
  sampleMessage2: z.string().max(1000).optional().nullable(),
  helpResponse: z.string().max(500).optional().nullable(),
  stopResponse: z.string().max(500).optional().nullable(),
  disclosureAccepted: z.boolean().optional(),
});

function guard() {
  try {
    assertSmsOnboardingSurface();
    return null;
  } catch (e) {
    if (e instanceof SmsBillingGuardError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

function serializeProfile(p: {
  id: string;
  workspaceId: string;
  selectedPlan: string | null;
  legalEntityName: string | null;
  dbaBrandName: string | null;
  einBrnCiphertext: string | null;
  registrationType: string | null;
  registrationCountry: string | null;
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
  disclosureAcceptedAt: Date | null;
  reviewStatus: SmsComplianceReviewStatus;
  rejectionReason: string | null;
  feeEstimateCents: number | null;
  marginEstimateBp: number | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
}) {
  const fees = estimateRegistrationFeesCents();
  return {
    ...p,
    einBrnCiphertext: undefined,
    einOnFile: Boolean(p.einBrnCiphertext),
    feeEstimate: fees,
  };
}

export async function GET() {
  const blocked = guard();
  if (blocked) return blocked;
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.smsComplianceProfile.findUnique({
    where: { workspaceId: ctx.workspace.id },
  });
  return NextResponse.json({
    profile: profile ? serializeProfile(profile) : null,
    fees: estimateRegistrationFeesCents(),
  });
}

export async function PATCH(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.smsComplianceProfile.findUnique({
    where: { workspaceId: ctx.workspace.id },
  });
  if (
    existing &&
    !["DRAFT", "NEEDS_CUSTOMER_CHANGES"].includes(existing.reviewStatus)
  ) {
    return NextResponse.json(
      { error: "Profile is locked while under review" },
      { status: 409 }
    );
  }

  const data = parsed.data;
  let einBrnCiphertext: string | null | undefined = undefined;
  if (data.einBrn !== undefined) {
    if (data.einBrn === null || data.einBrn === "") {
      einBrnCiphertext = null;
    } else {
      if (!canEncryptSmsSensitiveData()) {
        return NextResponse.json(
          { error: "SMS_SENSITIVE_DATA_KEY is not configured; cannot store EIN" },
          { status: 503 }
        );
      }
      einBrnCiphertext = encryptSmsSensitive(data.einBrn);
      if (!einBrnCiphertext) {
        return NextResponse.json({ error: "Failed to encrypt EIN" }, { status: 503 });
      }
    }
  }

  const { einBrn: _omit, disclosureAccepted, ...rest } = data;
  void _omit;

  const profile = await prisma.smsComplianceProfile.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: {
      workspaceId: ctx.workspace.id,
      ...rest,
      ...(einBrnCiphertext !== undefined ? { einBrnCiphertext } : {}),
      disclosureAcceptedAt: disclosureAccepted ? new Date() : null,
      disclosureVersion: disclosureAccepted ? SMS_CONSENT_DISCLOSURE_VERSION : null,
      reviewStatus: "DRAFT",
    },
    update: {
      ...rest,
      ...(einBrnCiphertext !== undefined ? { einBrnCiphertext } : {}),
      ...(disclosureAccepted === true
        ? {
            disclosureAcceptedAt: new Date(),
            disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
          }
        : {}),
    },
  });

  return NextResponse.json({ profile: serializeProfile(profile) });
}

export async function POST(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "submit") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const profile = await prisma.smsComplianceProfile.findUnique({
    where: { workspaceId: ctx.workspace.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Complete the registration form first" }, { status: 400 });
  }
  if (!["DRAFT", "NEEDS_CUSTOMER_CHANGES"].includes(profile.reviewStatus)) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  // EIN not re-validated from ciphertext here — require einOnFile + other fields
  const errors = validateComplianceProfileForSubmit({
    selectedPlan: profile.selectedPlan,
    legalEntityName: profile.legalEntityName,
    dbaBrandName: profile.dbaBrandName,
    einBrn: profile.einBrnCiphertext ? "12-3456789" : null, // presence-only when ciphertext set
    entityType: profile.entityType,
    street: profile.street,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
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
    disclosureAccepted: Boolean(profile.disclosureAcceptedAt),
  });
  if (!profile.einBrnCiphertext && profile.entityType !== "SOLE_PROPRIETOR") {
    errors.einBrn = "EIN / business registration number is required";
  }
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  const fees = estimateRegistrationFeesCents();
  const marginBp = estimatePlanMarginBasisPoints(
    profile.selectedPlan as SmsPlanKey,
    false
  );
  const fromStatus = profile.reviewStatus;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.smsComplianceProfile.update({
      where: { id: profile.id },
      data: {
        reviewStatus: "CUSTOMER_SUBMITTED",
        submittedAt: new Date(),
        feeEstimateCents: fees.oneTimeCents,
        marginEstimateBp: marginBp,
        rejectionReason: null,
      },
    });
    await tx.smsComplianceReviewEvent.create({
      data: {
        profileId: profile.id,
        workspaceId: ctx.workspace.id,
        fromStatus,
        toStatus: "CUSTOMER_SUBMITTED",
        actorUserId: ctx.user.id,
        note: "Customer submitted registration for internal review",
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action: "sms.compliance.submitted",
        targetType: "SmsComplianceProfile",
        targetId: profile.id,
        meta: { reviewStatus: "CUSTOMER_SUBMITTED" },
      },
    });
    return next;
  });

  return NextResponse.json({ profile: serializeProfile(updated) });
}
