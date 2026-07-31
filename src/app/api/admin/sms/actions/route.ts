import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  isSmsAdminEnabled,
  isSmsCodeEnabled,
  isSmsNumberPurchaseEnabled,
} from "@/lib/sms/flags";
import { SMS_PLANS, type SmsPlanKey } from "@/lib/sms/pricing";
import { recalcSmsBundle } from "@/lib/sms/stripe";

const schema = z.object({
  action: z.enum([
    "hold-sending",
    "release-hold",
    "require-registration-corrections",
    "approve-exceptional-charge",
    "reject-exceptional-charge",
    "create-exceptional-charge",
    "change-plan",
    "release-number",
    "reconcile-provider-invoice",
    "kill-switch-on",
    "kill-switch-off",
    "provider-incident-on",
    "provider-incident-off",
  ]),
  workspaceId: z.string().min(1),
  chargeId: z.string().optional(),
  chargeType: z.string().max(60).optional(),
  chargeDescription: z.string().max(2000).optional(),
  providerAmountMicros: z.string().regex(/^\d+$/).optional(),
  customerAmountCents: z.number().int().min(0).max(5_000_00).optional(),
  plan: z.enum(["TEXT_ENTRY", "TEXT_ESSENTIALS", "TEXT_ADVANTAGE"]).optional(),
  note: z.string().max(1000).optional(),
  confirmRelease: z.boolean().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  reconciledCostMicros: z.string().regex(/^\d+$/).optional(),
});

/** Owner-only SMS admin controls. Every action is audit-logged. */
export async function POST(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { action, workspaceId } = parsed.data;

  const audit = (meta: Record<string, unknown> = {}) =>
    prisma.auditLog.create({
      data: {
        workspaceId,
        userId: ctx.user.id,
        action: `admin.sms.${action}`,
        targetType: "workspace",
        targetId: workspaceId,
        meta: { ...meta, note: parsed.data.note ?? null },
      },
    });

  switch (action) {
    case "hold-sending": {
      await prisma.smsSubscription.updateMany({
        where: { workspaceId },
        data: { status: "PAUSED" },
      });
      await audit();
      return NextResponse.json({ ok: true });
    }
    case "release-hold": {
      await prisma.smsSubscription.updateMany({
        where: { workspaceId, status: "PAUSED" },
        data: { status: "ACTIVE" },
      });
      await audit();
      return NextResponse.json({ ok: true });
    }
    case "require-registration-corrections": {
      await prisma.smsRegistration.updateMany({
        where: { workspaceId, status: { in: ["PREPARING", "SUBMITTED", "PENDING_CARRIER", "REJECTED"] } },
        data: { status: "PREPARING", rejectionReason: parsed.data.note ?? "Corrections required" },
      });
      await audit();
      return NextResponse.json({ ok: true });
    }
    case "create-exceptional-charge": {
      if (
        !parsed.data.chargeType ||
        !parsed.data.chargeDescription ||
        parsed.data.customerAmountCents === undefined
      ) {
        return NextResponse.json(
          { error: "chargeType, chargeDescription and customerAmountCents are required" },
          { status: 400 }
        );
      }
      const charge = await prisma.smsExceptionalCharge.create({
        data: {
          workspaceId,
          type: parsed.data.chargeType,
          description: parsed.data.chargeDescription,
          providerAmountMicros: BigInt(parsed.data.providerAmountMicros ?? "0"),
          customerAmountCents: parsed.data.customerAmountCents,
          approvalStatus: "PENDING_CUSTOMER_APPROVAL",
          createdByUserId: ctx.user.id,
        },
      });
      await audit({ chargeId: charge.id });
      return NextResponse.json({ ok: true, chargeId: charge.id });
    }
    case "approve-exceptional-charge":
    case "reject-exceptional-charge": {
      if (!parsed.data.chargeId) {
        return NextResponse.json({ error: "chargeId required" }, { status: 400 });
      }
      const approve = action === "approve-exceptional-charge";
      const result = await prisma.smsExceptionalCharge.updateMany({
        where: { id: parsed.data.chargeId, workspaceId, approvalStatus: "PENDING_CUSTOMER_APPROVAL" },
        data: approve
          ? { approvalStatus: "APPROVED", approvedAt: new Date() }
          : { approvalStatus: "REJECTED", rejectedAt: new Date() },
      });
      if (!result.count) return NextResponse.json({ error: "Charge not found or not pending" }, { status: 404 });
      await audit({ chargeId: parsed.data.chargeId });
      return NextResponse.json({ ok: true });
    }
    case "change-plan": {
      if (!parsed.data.plan) return NextResponse.json({ error: "plan required" }, { status: 400 });
      const def = SMS_PLANS[parsed.data.plan as SmsPlanKey];
      await prisma.smsSubscription.updateMany({
        where: { workspaceId },
        data: {
          plan: parsed.data.plan,
          baseMonthlyPriceCents: def.monthlyPriceCents,
          appliedMonthlyPriceCents: def.monthlyPriceCents,
          bundleDiscountPercent: 0,
        },
      });
      await recalcSmsBundle(workspaceId);
      await audit({ plan: parsed.data.plan });
      return NextResponse.json({ ok: true });
    }
    case "release-number": {
      if (!parsed.data.confirmRelease) {
        return NextResponse.json(
          { error: "Explicit confirmRelease=true is required to release a number" },
          { status: 400 }
        );
      }
      if (!isSmsNumberPurchaseEnabled()) {
        // Without provider access, only mark locally; no provider call happens.
        await prisma.smsNumber.updateMany({
          where: { workspaceId, status: "ACTIVE" },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
        await audit({ providerCall: false });
        return NextResponse.json({ ok: true, providerCall: false });
      }
      await prisma.smsNumber.updateMany({
        where: { workspaceId, status: "ACTIVE" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      await audit({ providerCall: true });
      return NextResponse.json({ ok: true });
    }
    case "reconcile-provider-invoice": {
      if (!parsed.data.month || !parsed.data.reconciledCostMicros) {
        return NextResponse.json({ error: "month and reconciledCostMicros required" }, { status: 400 });
      }
      const monthly = await prisma.smsMonthlyUsage.findUnique({
        where: { workspaceId_month: { workspaceId, month: parsed.data.month } },
      });
      if (!monthly) return NextResponse.json({ error: "No usage for that month" }, { status: 404 });
      const reconciled = BigInt(parsed.data.reconciledCostMicros);
      const mismatch = reconciled !== monthly.providerCostMicros;
      await prisma.smsMonthlyUsage.update({
        where: { id: monthly.id },
        data: { providerCostMicros: reconciled, reconciledAt: new Date() },
      });
      await audit({
        month: parsed.data.month,
        recordedCostMicros: monthly.providerCostMicros.toString(),
        reconciledCostMicros: reconciled.toString(),
        mismatch,
      });
      return NextResponse.json({ ok: true, mismatch });
    }
    case "kill-switch-on":
    case "kill-switch-off": {
      // Workspace-scoped kill: pause all SMS subs + mark compliance suspended when on
      const on = action === "kill-switch-on";
      await prisma.smsSubscription.updateMany({
        where: { workspaceId },
        data: { status: on ? "PAUSED" : "ACTIVE" },
      });
      if (on) {
        await prisma.smsComplianceProfile.updateMany({
          where: { workspaceId, reviewStatus: { in: ["APPROVED", "PROVIDER_PENDING", "READY_FOR_PROVIDER"] } },
          data: { reviewStatus: "SUSPENDED" },
        });
      }
      await audit({ killSwitch: on });
      return NextResponse.json({ ok: true, killSwitch: on });
    }
    case "provider-incident-on":
    case "provider-incident-off": {
      const on = action === "provider-incident-on";
      await prisma.smsSubscription.updateMany({
        where: { workspaceId },
        data: { status: on ? "PAUSED" : "ACTIVE" },
      });
      await audit({ providerIncident: on });
      return NextResponse.json({ ok: true, providerIncident: on });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
