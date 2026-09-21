/**
 * Simplified customer Text Messaging setup API.
 * Prefills workspace data, auto-generates compliance artifacts, never returns EIN plaintext.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { isSmsControlledAccessWorkspace } from "@/lib/sms/pilot";
import { canEncryptSmsSensitiveData, encryptSmsSensitive } from "@/lib/sms/sensitive";
import { normalizeUsPhone } from "@/lib/sms/phone";
import { SMS_CONSENT_DISCLOSURE_VERSION } from "@/lib/sms/consent";
import { ensureWorkspaceSmsOptInForm } from "@/lib/sms/ensure-sms-optin-form";
import {
  CUSTOMER_SMS_USE_CASES,
  customerStatusLabel,
  customerStatusMessage,
  generateSmsHelpStop,
  generateSmsOptInDescription,
  generateSmsSampleMessages,
  mapLifecycleToCustomerStatus,
  parseMailingAddress,
  translateSmsProviderError,
  labelForSmsUseCase,
  type CustomerSmsUseCaseId,
} from "@/lib/sms/customer-facing";
import { parseOwnerPilotMeta } from "@/lib/sms/owner-pilot-meta";
import { validateEinBrn } from "@/lib/sms/compliance";

async function assertCustomerSmsSetupAccess(workspaceId: string): Promise<NextResponse | null> {
  if (!isSmsCodeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isSmsAccountSignupEnabled()) return null;
  if (await isSmsControlledAccessWorkspace(workspaceId)) return null;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

const saveSchema = z.object({
  action: z.enum(["save", "submit", "claim_number"]),
  legalEntityName: z.string().max(200).optional(),
  dbaBrandName: z.string().max(200).optional(),
  einBrn: z.string().max(40).optional().nullable(),
  entityType: z
    .enum(["PRIVATE_PROFIT", "PUBLIC_PROFIT", "NON_PROFIT", "GOVERNMENT", "SOLE_PROPRIETOR"])
    .optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(40).optional(),
  postalCode: z.string().max(20).optional(),
  websiteUrl: z.string().max(500).optional(),
  supportEmail: z.string().max(200).optional(),
  supportPhone: z.string().max(40).optional(),
  smsUseCase: z
    .enum(["MARKETING", "MIXED", "CUSTOMER_CARE", "ACCOUNT_NOTIFICATION", "DELIVERY_NOTIFICATION", "LOW_VOLUME_MIXED"])
    .optional(),
  disclosureAccepted: z.boolean().optional(),
  /** Optional US area code preference when claiming a number (e.g. "312"). */
  areaCode: z
    .string()
    .regex(/^\d{3}$/)
    .optional(),
});

function customerSerialize(profile: {
  legalEntityName: string | null;
  dbaBrandName: string | null;
  einBrnCiphertext: string | null;
  entityType: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  websiteUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  smsUseCase: string | null;
  disclosureAcceptedAt: Date | null;
  reviewStatus: string;
  rejectionReason: string | null;
  numberId: string | null;
  internalNotes: string | null;
}) {
  const meta = parseOwnerPilotMeta(profile.internalNotes);
  const status = mapLifecycleToCustomerStatus({
    phase: meta.lifecyclePhase,
    reviewStatus: profile.reviewStatus,
    hasNumber: Boolean(profile.numberId),
    liveReady: meta.liveSendingUnlocked,
    rejectionReason: profile.rejectionReason,
  });
  const translated = profile.rejectionReason
    ? translateSmsProviderError(profile.rejectionReason)
    : null;
  return {
    legalEntityName: profile.legalEntityName,
    dbaBrandName: profile.dbaBrandName,
    einOnFile: Boolean(profile.einBrnCiphertext),
    entityType: profile.entityType,
    street: profile.street,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    websiteUrl: profile.websiteUrl,
    supportEmail: profile.supportEmail,
    supportPhone: profile.supportPhone,
    smsUseCase: profile.smsUseCase,
    disclosureAccepted: Boolean(profile.disclosureAcceptedAt),
    status,
    statusLabel: customerStatusLabel(status),
    statusMessage:
      status === "needs_attention" && translated
        ? translated.customerMessage
        : customerStatusMessage(status),
    attentionHint:
      status === "needs_attention"
        ? "Check your business name, EIN, address, or website, then submit again."
        : null,
    // Never expose provider IDs / Telnyx names to customers
  };
}

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await assertCustomerSmsSetupAccess(ctx.workspace.id);
  if (blocked) return blocked;

  const [profile, number, user] = await Promise.all([
    prisma.smsComplianceProfile.findUnique({ where: { workspaceId: ctx.workspace.id } }),
    prisma.smsNumber.findFirst({ where: { workspaceId: ctx.workspace.id, status: "ACTIVE" } }),
    prisma.user.findUnique({ where: { id: ctx.user.id }, select: { email: true, name: true } }),
  ]);

  const addr = parseMailingAddress(ctx.workspace.mailingAddress);
  const prefill = {
    legalEntityName: profile?.legalEntityName || ctx.workspace.name || "",
    dbaBrandName: profile?.dbaBrandName || ctx.workspace.name || "",
    entityType: profile?.entityType || "PRIVATE_PROFIT",
    street: profile?.street || addr.street,
    city: profile?.city || addr.city,
    state: profile?.state || addr.state,
    postalCode: profile?.postalCode || addr.postalCode,
    websiteUrl: profile?.websiteUrl || ctx.workspace.websiteUrl || "https://sendfable.com",
    supportEmail: profile?.supportEmail || user?.email || "",
    supportPhone: profile?.supportPhone || "",
    smsUseCase: profile?.smsUseCase || "MARKETING",
  };

  return NextResponse.json({
    available: true,
    useCases: CUSTOMER_SMS_USE_CASES,
    prefill,
    profile: profile
      ? customerSerialize({ ...profile, numberId: profile.numberId || number?.id || null })
      : null,
    hasActiveNumber: Boolean(number),
    encryptionReady: canEncryptSmsSensitiveData(),
  });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const blocked = await assertCustomerSmsSetupAccess(ctx.workspace.id);
  if (blocked) return blocked;

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Customer claims a texting number after approval (no provider jargon in responses).
  if (parsed.data.action === "claim_number") {
    const { isSmsNumberPurchaseEnabled } = await import("@/lib/sms/flags");
    const { provisionWorkspaceNumber } = await import("@/lib/sms/provider-submit");
    const { parseOwnerPilotMeta } = await import("@/lib/sms/owner-pilot-meta");
    const profile = await prisma.smsComplianceProfile.findUnique({
      where: { workspaceId: ctx.workspace.id },
    });
    if (!profile) {
      return NextResponse.json({ error: "Complete text messaging setup first." }, { status: 400 });
    }
    const meta = parseOwnerPilotMeta(profile.internalNotes);
    const status = mapLifecycleToCustomerStatus({
      phase: meta.lifecyclePhase,
      reviewStatus: profile.reviewStatus,
      hasNumber: Boolean(profile.numberId),
      liveReady: meta.liveSendingUnlocked,
    });
    if (status !== "choose_number" && status !== "approved" && status !== "active") {
      return NextResponse.json(
        { error: "Your texting number is not ready to claim yet." },
        { status: 409 }
      );
    }
    const existingNum = await prisma.smsNumber.findFirst({
      where: { workspaceId: ctx.workspace.id, status: "ACTIVE" },
    });
    if (existingNum) {
      return NextResponse.json({
        ok: true,
        alreadyHadNumber: true,
        phoneMasked:
          existingNum.phoneE164.slice(0, 2) + "***" + existingNum.phoneE164.slice(-4),
        profile: customerSerialize({ ...profile, numberId: existingNum.id }),
      });
    }
    if (!isSmsNumberPurchaseEnabled() && !meta.numberPurchaseUnlocked) {
      return NextResponse.json(
        {
          error:
            "Number assignment is finishing on our side. Refresh this page in a few minutes, or contact support.",
        },
        { status: 503 }
      );
    }
    try {
      const bought = await provisionWorkspaceNumber({
        workspaceId: ctx.workspace.id,
        areaCode: parsed.data.areaCode,
        ensureSubscription: true,
      });
      const refreshed = await prisma.smsComplianceProfile.findUnique({
        where: { workspaceId: ctx.workspace.id },
      });
      return NextResponse.json({
        ok: true,
        phoneMasked: bought.phoneE164.slice(0, 2) + "***" + bought.phoneE164.slice(-4),
        profile: refreshed
          ? customerSerialize({ ...refreshed, numberId: refreshed.numberId })
          : null,
      });
    } catch (e) {
      const translated = translateSmsProviderError(
        e instanceof Error ? e.message : "number claim failed"
      );
      return NextResponse.json({ error: translated.customerMessage }, { status: 400 });
    }
  }

  const existing = await prisma.smsComplianceProfile.findUnique({
    where: { workspaceId: ctx.workspace.id },
  });
  if (
    existing &&
    !["DRAFT", "NEEDS_CUSTOMER_CHANGES"].includes(existing.reviewStatus) &&
    parsed.data.action === "save"
  ) {
    // Allow read-only after submit — return current state
    return NextResponse.json({
      profile: customerSerialize(existing),
      locked: true,
    });
  }
  if (
    existing &&
    !["DRAFT", "NEEDS_CUSTOMER_CHANGES"].includes(existing.reviewStatus) &&
    parsed.data.action === "submit"
  ) {
    return NextResponse.json(
      { error: "Text messaging approval is already in progress." },
      { status: 409 }
    );
  }

  const brandName =
    parsed.data.dbaBrandName?.trim() ||
    existing?.dbaBrandName ||
    ctx.workspace.name ||
    "this business";
  const legalName =
    parsed.data.legalEntityName?.trim() ||
    existing?.legalEntityName ||
    ctx.workspace.name ||
    brandName;
  const useCase = (parsed.data.smsUseCase ||
    existing?.smsUseCase ||
    "MARKETING") as CustomerSmsUseCaseId;
  const supportEmail =
    parsed.data.supportEmail?.trim() || existing?.supportEmail || ctx.user.email || "";
  const supportPhoneRaw =
    parsed.data.supportPhone?.trim() || existing?.supportPhone || "";
  const phoneNorm = supportPhoneRaw ? normalizeUsPhone(supportPhoneRaw) : null;

  // Auto-create real SMS opt-in form (never /privacy)
  const optIn = await ensureWorkspaceSmsOptInForm({
    workspaceId: ctx.workspace.id,
    brandName,
  });
  const samples = generateSmsSampleMessages({ brandName, useCase });
  const helpStop = generateSmsHelpStop({
    brandName,
    supportEmail,
    supportPhone: phoneNorm?.e164 || supportPhoneRaw || null,
  });
  const privacy = "https://sendfable.com/privacy";
  const terms = "https://sendfable.com/terms";
  const optInDescription = generateSmsOptInDescription({
    brandName,
    useCaseLabel: labelForSmsUseCase(useCase),
    optInFormUrl: optIn.publicUrl,
  });

  let einBrnCiphertext: string | null | undefined = undefined;
  if (parsed.data.einBrn !== undefined && parsed.data.einBrn !== null && parsed.data.einBrn !== "") {
    const entityType = parsed.data.entityType || existing?.entityType || "PRIVATE_PROFIT";
    const einErr = validateEinBrn(parsed.data.einBrn, entityType);
    if (einErr) return NextResponse.json({ error: einErr }, { status: 400 });
    if (!canEncryptSmsSensitiveData()) {
      return NextResponse.json(
        { error: "Secure storage is not ready. Please try again shortly." },
        { status: 503 }
      );
    }
    const digits = parsed.data.einBrn.replace(/\D/g, "");
    einBrnCiphertext = encryptSmsSensitive(digits);
    if (!einBrnCiphertext) {
      return NextResponse.json({ error: "Could not save securely" }, { status: 503 });
    }
  }

  const disclosureAccepted =
    parsed.data.disclosureAccepted === true || Boolean(existing?.disclosureAcceptedAt);

  const fieldPayload = {
    selectedPlan: existing?.selectedPlan || "TEXT_ESSENTIALS",
    legalEntityName: legalName,
    dbaBrandName: brandName,
    registrationType: "10DLC" as const,
    registrationCountry: "US",
    entityType: parsed.data.entityType || existing?.entityType || "PRIVATE_PROFIT",
    street: parsed.data.street ?? existing?.street ?? null,
    city: parsed.data.city ?? existing?.city ?? null,
    state: parsed.data.state ?? existing?.state ?? null,
    postalCode: parsed.data.postalCode ?? existing?.postalCode ?? null,
    country: "US",
    websiteUrl:
      parsed.data.websiteUrl?.trim() ||
      existing?.websiteUrl ||
      ctx.workspace.websiteUrl ||
      "https://sendfable.com",
    supportEmail,
    supportPhone: phoneNorm?.e164 || supportPhoneRaw || null,
    industryVertical: existing?.industryVertical || "TECHNOLOGY",
    smsUseCase: useCase,
    estimatedMonthlyVolume: existing?.estimatedMonthlyVolume ?? 100,
    optInDescription,
    optInFormUrl: optIn.publicUrl,
    optInEvidenceUrl: optIn.evidenceUrl,
    privacyPolicyUrl: privacy,
    smsTermsUrl: terms,
    sampleMessage1: samples.sampleMessage1,
    sampleMessage2: samples.sampleMessage2,
    helpResponse: helpStop.helpResponse,
    stopResponse: helpStop.stopResponse,
  };

  if (parsed.data.action === "submit") {
    const missing: string[] = [];
    if (!fieldPayload.legalEntityName) missing.push("legal business name");
    if (!fieldPayload.street) missing.push("street address");
    if (!fieldPayload.city) missing.push("city");
    if (!fieldPayload.state) missing.push("state");
    if (!fieldPayload.postalCode) missing.push("ZIP");
    if (!fieldPayload.supportEmail) missing.push("support email");
    if (!fieldPayload.supportPhone) missing.push("support phone");
    if (!einBrnCiphertext && !existing?.einBrnCiphertext && fieldPayload.entityType !== "SOLE_PROPRIETOR") {
      missing.push("EIN");
    }
    if (!disclosureAccepted) missing.push("consent acknowledgment");
    if (missing.length) {
      return NextResponse.json(
        { error: `Please complete: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
  }

  const profile = await prisma.smsComplianceProfile.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: {
      workspaceId: ctx.workspace.id,
      ...fieldPayload,
      ...(einBrnCiphertext !== undefined ? { einBrnCiphertext } : {}),
      disclosureAcceptedAt: disclosureAccepted ? new Date() : null,
      disclosureVersion: disclosureAccepted ? SMS_CONSENT_DISCLOSURE_VERSION : null,
      reviewStatus: parsed.data.action === "submit" ? "CUSTOMER_SUBMITTED" : "DRAFT",
      submittedAt: parsed.data.action === "submit" ? new Date() : null,
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
      ...(parsed.data.action === "submit"
        ? {
            reviewStatus: "CUSTOMER_SUBMITTED",
            submittedAt: new Date(),
            rejectionReason: null,
          }
        : {}),
    },
  });

  if (parsed.data.action === "submit") {
    await prisma.smsComplianceReviewEvent.create({
      data: {
        profileId: profile.id,
        workspaceId: ctx.workspace.id,
        fromStatus: existing?.reviewStatus ?? "DRAFT",
        toStatus: "CUSTOMER_SUBMITTED",
        actorUserId: ctx.user.id,
        note: "Customer submitted text messaging setup",
      },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action: "sms.setup.submitted",
        targetType: "SmsComplianceProfile",
        targetId: profile.id,
        meta: { optInFormUrl: optIn.publicUrl, useCase },
      },
    });
  }

  return NextResponse.json({
    profile: customerSerialize(profile),
    optInFormUrl: optIn.publicUrl,
    next:
      parsed.data.action === "submit"
        ? customerStatusMessage("submitted")
        : "Saved. You can submit for approval when ready.",
  });
}
