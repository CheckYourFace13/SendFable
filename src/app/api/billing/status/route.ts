import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { ensureSendCountReset } from "@/lib/quota";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await ensureSendCountReset(await getWorkspaceOwner(ctx.workspace.id));
  const contacts = await prisma.contact.count({ where: { workspaceId: ctx.workspace.id } });

  return NextResponse.json({
    plan: owner.plan,
    billingInterval: owner.billingInterval,
    usage: {
      emails: owner.monthlySendCount,
      contacts,
    },
  });
}
