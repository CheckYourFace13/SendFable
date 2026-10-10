import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerAdminUser } from "@/lib/platform-admin";
import {
  disableInternalWorkspace,
  provisionDrinkKnirdProductSurface,
  setInternalPlanOverride,
} from "@/lib/admin/internal-workspaces";
import { writeAuditLog } from "@/lib/audit";
import { PLANS } from "@/lib/plans";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const ws = await prisma.workspace.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: { select: { id: true, email: true, name: true, plan: true } } },
      },
      senderIdentities: {
        select: {
          id: true,
          value: true,
          displayName: true,
          status: true,
          type: true,
          rewriteRequired: true,
          isDefault: true,
        },
      },
      signupForms: {
        select: { id: true, name: true, hostedSlug: true, submitCount: true, collectPhone: true },
      },
      tags: { select: { id: true, name: true, _count: { select: { contacts: true } } } },
      marketingAutopilotConfig: true,
      _count: { select: { contacts: true, campaigns: true } },
    },
  });
  if (!ws || !ws.isInternal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recentErrors = await prisma.auditLog.findMany({
    where: {
      workspaceId: id,
      OR: [
        { action: { contains: "error" } },
        { action: { contains: "fail" } },
        { action: { startsWith: "admin." } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, createdAt: true, meta: true, userId: true },
  });

  const plan = ws.internalPlanOverride ?? ws.memberships.find((m) => m.role === "OWNER")?.user.plan ?? "FREE";

  await writeAuditLog({
    workspaceId: id,
    userId: admin.id,
    action: "admin.workspace.inspected",
    targetType: "workspace",
    targetId: id,
    meta: { view: "details" },
  });

  return NextResponse.json({
    workspace: {
      id: ws.id,
      name: ws.name,
      websiteUrl: ws.websiteUrl,
      mailingAddress: ws.mailingAddress,
      isInternal: ws.isInternal,
      internalLabel: ws.internalLabel,
      internalPlanOverride: ws.internalPlanOverride,
      disabledAt: ws.disabledAt,
      plan,
      planSource: ws.internalPlanOverride ? "INTERNAL_PLAN_OVERRIDE" : "OWNER_PLAN",
      planLimits: PLANS[plan],
      contacts: ws._count.contacts,
      campaigns: ws._count.campaigns,
      memberships: ws.memberships.map((m) => ({
        role: m.role,
        user: m.user,
      })),
      senderIdentities: ws.senderIdentities,
      forms: ws.signupForms,
      tags: ws.tags,
      autopilot: ws.marketingAutopilotConfig,
      recentAudit: recentErrors,
    },
  });
}

const patchSchema = z.object({
  action: z.enum(["set_plan", "disable", "enable", "provision_drinkknird"]),
  plan: z.enum(["FREE", "STARTER", "GROWTH", "PRO", "PRO_PLUS"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    if (parsed.data.action === "set_plan") {
      if (!parsed.data.plan) {
        return NextResponse.json({ error: "plan required" }, { status: 400 });
      }
      const workspace = await setInternalPlanOverride({
        adminUserId: admin.id,
        workspaceId: id,
        plan: parsed.data.plan,
        ip,
      });
      return NextResponse.json({ workspace, label: "INTERNAL PLAN OVERRIDE" });
    }
    if (parsed.data.action === "disable" || parsed.data.action === "enable") {
      const workspace = await disableInternalWorkspace({
        adminUserId: admin.id,
        workspaceId: id,
        disable: parsed.data.action === "disable",
        ip,
      });
      return NextResponse.json({ workspace });
    }
    if (parsed.data.action === "provision_drinkknird") {
      const provision = await provisionDrinkKnirdProductSurface({
        workspaceId: id,
        adminUserId: admin.id,
        replyToEmail: admin.email,
        ip,
      });
      return NextResponse.json({
        provision: {
          tag: provision.tag.name,
          formSlug: provision.form.hostedSlug,
          formId: provision.form.id,
          identity: {
            value: provision.identity.value,
            displayName: provision.identity.displayName,
          },
          autopilotUrl: provision.autopilot.pageUrl,
          welcomeCampaignId: provision.welcome.id,
        },
      });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
