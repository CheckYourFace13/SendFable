import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { requireOwnerAdminUser } from "@/lib/platform-admin";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  page: z.string().trim().max(200).optional(),
  feature: z.string().trim().max(120).optional(),
  description: z.string().trim().min(3).max(4000),
});

/** INTERNAL workspace dogfood notes — owner admin only, current workspace. */
export async function POST(req: Request) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.workspace.isInternal) {
    return NextResponse.json(
      { error: "Product issue reports are only for INTERNAL workspaces" },
      { status: 403 }
    );
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const issue = await prisma.productIssue.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: admin.id,
      page: parsed.data.page || null,
      feature: parsed.data.feature || null,
      description: parsed.data.description,
    },
  });

  await writeAuditLog({
    workspaceId: ctx.workspace.id,
    userId: admin.id,
    action: "admin.product_issue",
    targetType: "product_issue",
    targetId: issue.id,
    meta: {
      page: issue.page,
      feature: issue.feature,
    },
  });

  return NextResponse.json({ issue }, { status: 201 });
}

export async function GET() {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const issues = await prisma.productIssue.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      workspace: { select: { id: true, name: true, internalLabel: true } },
    },
  });
  return NextResponse.json({ issues });
}
