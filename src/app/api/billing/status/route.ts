import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { ensureSendCountReset } from "@/lib/quota";
import { softwareQuotas } from "@/lib/internal-entitlement";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await ensureSendCountReset(await getWorkspaceOwner(ctx.workspace.id));
  const contacts = await prisma.contact.count({ where: { workspaceId: ctx.workspace.id } });
  const quotas = softwareQuotas({
    isInternal: ctx.workspace.isInternal,
    disabled: Boolean(ctx.workspace.disabledAt),
    plan: owner.plan,
  });
  const internalUnlimited = quotas.entitlement === "OWNER_INTERNAL_UNLIMITED";
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const workspaceEmails = internalUnlimited
    ? await prisma.campaignRecipient.count({
        where: {
          status: "SENT",
          sentAt: { gte: monthStart },
          campaign: { workspaceId: ctx.workspace.id },
        },
      })
    : owner.monthlySendCount;

  return NextResponse.json({
    plan: owner.plan,
    entitlement: quotas.entitlement,
    entitlementLabel: quotas.label,
    internalUnlimited,
    billingInterval: internalUnlimited ? null : owner.billingInterval,
    usage: {
      emails: workspaceEmails,
      contacts,
    },
    showNoBadgeValue: await (async () => {
      try {
        const { getConversionFixFlags } = await import(
          "@/lib/acquisition/conversion-optimize"
        );
        return (await getConversionFixFlags()).fixBillingBadgeValue;
      } catch {
        return false;
      }
    })(),
  });
}
