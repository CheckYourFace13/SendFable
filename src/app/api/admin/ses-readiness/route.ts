import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import {
  getSesReadinessReport,
  getSesSetupInstructionsText,
} from "@/lib/ses-readiness";

async function assertOwnerOrFirstUser(userId: string, role: string): Promise<boolean> {
  if (role === "OWNER") return true;
  const first = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return first?.id === userId;
}

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await assertOwnerOrFirstUser(ctx.user.id, ctx.membership.role);
  if (!allowed) {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  const report = await getSesReadinessReport();
  return NextResponse.json({
    report,
    setupInstructions: getSesSetupInstructionsText(),
  });
}
