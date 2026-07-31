import { NextResponse } from "next/server";
import { z } from "zod";
import type { SmsComplianceReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { isSmsAdminEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import {
  SMS_COMPLIANCE_REVIEW_STATUSES,
  canTransitionCompliance,
  estimatePlanMarginBasisPoints,
  estimateRegistrationFeesCents,
  toComplianceListItem,
} from "@/lib/sms/compliance";
import type { SmsPlanKey } from "@/lib/sms/pricing";

/**
 * Admin compliance review queue. Never returns EIN ciphertext or plaintext.
 */
export async function GET(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as SmsComplianceReviewStatus | null;
  const profileId = url.searchParams.get("id");

  if (profileId) {
    const profile = await prisma.smsComplianceProfile.findUnique({
      where: { id: profileId },
      include: {
        workspace: { select: { id: true, name: true } },
        reviewEvents: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { einBrnCiphertext: _omit, ...safe } = profile;
    void _omit;
    const fees = estimateRegistrationFeesCents();
    const marginBp = profile.selectedPlan
      ? estimatePlanMarginBasisPoints(profile.selectedPlan as SmsPlanKey, false)
      : null;
    return NextResponse.json({
      profile: {
        ...safe,
        einOnFile: Boolean(profile.einBrnCiphertext),
        feeEstimate: fees,
        marginEstimateBp: profile.marginEstimateBp ?? marginBp,
      },
    });
  }

  const where =
    status && (SMS_COMPLIANCE_REVIEW_STATUSES as readonly string[]).includes(status)
      ? { reviewStatus: status }
      : {};

  const rows = await prisma.smsComplianceProfile.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      workspaceId: true,
      legalEntityName: true,
      dbaBrandName: true,
      reviewStatus: true,
      selectedPlan: true,
      submittedAt: true,
      einBrnCiphertext: true,
      workspace: { select: { name: true } },
    },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      ...toComplianceListItem({
        id: r.id,
        workspaceId: r.workspaceId,
        legalEntityName: r.legalEntityName,
        dbaBrandName: r.dbaBrandName,
        reviewStatus: r.reviewStatus,
        selectedPlan: r.selectedPlan,
        submittedAt: r.submittedAt,
        hasEin: Boolean(r.einBrnCiphertext),
      }),
      workspaceName: r.workspace.name,
    })),
  });
}

const reviewSchema = z.object({
  profileId: z.string().min(1),
  toStatus: z.enum([
    "DRAFT",
    "CUSTOMER_SUBMITTED",
    "INTERNAL_REVIEW",
    "NEEDS_CUSTOMER_CHANGES",
    "READY_FOR_PROVIDER",
    "PROVIDER_SUBMITTED",
    "PROVIDER_PENDING",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
    "CANCELLED",
  ]),
  note: z.string().max(4000).optional(),
  internalNotes: z.string().max(8000).optional(),
  restrictedContentOk: z.boolean().optional(),
  prohibitedUseOk: z.boolean().optional(),
  dataCompleteOk: z.boolean().optional(),
  providerReadyOk: z.boolean().optional(),
});

/**
 * Transition compliance status. READY_FOR_PROVIDER requires checklist flags.
 * PROVIDER_SUBMITTED is blocked unless registration flag is on (SF-019: keep dark).
 */
export async function POST(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const profile = await prisma.smsComplianceProfile.findUnique({
    where: { id: parsed.data.profileId },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const toStatus = parsed.data.toStatus as SmsComplianceReviewStatus;
  if (!canTransitionCompliance(profile.reviewStatus, toStatus)) {
    return NextResponse.json(
      {
        error: `Cannot transition ${profile.reviewStatus} → ${toStatus}`,
      },
      { status: 409 }
    );
  }

  if (toStatus === "READY_FOR_PROVIDER") {
    if (
      !parsed.data.restrictedContentOk ||
      !parsed.data.prohibitedUseOk ||
      !parsed.data.dataCompleteOk ||
      !parsed.data.providerReadyOk
    ) {
      return NextResponse.json(
        {
          error:
            "Internal approval requires restricted-content, prohibited-use, data-completeness, and provider-readiness checks",
        },
        { status: 400 }
      );
    }
  }

  if (toStatus === "PROVIDER_SUBMITTED") {
    // Hard guard: never submit to provider while registration is dark
    const { isSmsRegistrationEnabled } = await import("@/lib/sms/flags");
    if (!isSmsRegistrationEnabled()) {
      return NextResponse.json(
        {
          error:
            "Provider submission is disabled (SENDFABLE_SMS_REGISTRATION_ENABLED=false). Mark READY_FOR_PROVIDER only.",
        },
        { status: 403 }
      );
    }
  }

  const fees = estimateRegistrationFeesCents();
  const marginBp = profile.selectedPlan
    ? estimatePlanMarginBasisPoints(profile.selectedPlan as SmsPlanKey, false)
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.smsComplianceProfile.update({
      where: { id: profile.id },
      data: {
        reviewStatus: toStatus,
        reviewedAt: new Date(),
        reviewedByUserId: ctx.user.id,
        feeEstimateCents: fees.oneTimeCents,
        marginEstimateBp: marginBp,
        ...(parsed.data.internalNotes !== undefined
          ? { internalNotes: parsed.data.internalNotes }
          : {}),
        ...(toStatus === "NEEDS_CUSTOMER_CHANGES" || toStatus === "REJECTED"
          ? { rejectionReason: parsed.data.note ?? profile.rejectionReason }
          : {}),
        ...(toStatus === "APPROVED" ? { approvedAt: new Date() } : {}),
      },
    });
    await tx.smsComplianceReviewEvent.create({
      data: {
        profileId: profile.id,
        workspaceId: profile.workspaceId,
        fromStatus: profile.reviewStatus,
        toStatus,
        actorUserId: ctx.user.id,
        note: parsed.data.note ?? null,
        meta: {
          restrictedContentOk: parsed.data.restrictedContentOk ?? null,
          prohibitedUseOk: parsed.data.prohibitedUseOk ?? null,
          dataCompleteOk: parsed.data.dataCompleteOk ?? null,
          providerReadyOk: parsed.data.providerReadyOk ?? null,
          feeEstimateCents: fees.oneTimeCents,
          marginEstimateBp: marginBp,
        },
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: profile.workspaceId,
        userId: ctx.user.id,
        action: "admin.sms.compliance.transition",
        targetType: "SmsComplianceProfile",
        targetId: profile.id,
        meta: {
          from: profile.reviewStatus,
          to: toStatus,
          note: parsed.data.note ?? null,
        },
      },
    });
    return next;
  });

  const { einBrnCiphertext: _e, ...safe } = updated;
  void _e;
  return NextResponse.json({
    profile: { ...safe, einOnFile: Boolean(updated.einBrnCiphertext) },
  });
}
