import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerAdminUser } from "@/lib/platform-admin";
import { writeAuditLog } from "@/lib/audit";
import { WORKSPACE_COOKIE } from "@/lib/session";
import { ADMIN_VIEW_COOKIE } from "@/lib/admin-view";

const enterSchema = z.object({
  workspaceId: z.string().min(1),
});

function cookieOpts() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function POST(req: Request) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = enterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const ws = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    select: { id: true, name: true, isInternal: true, disabledAt: true },
  });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ws.isInternal) {
    return NextResponse.json(
      { error: "View as workspace is limited to INTERNAL owner workspaces" },
      { status: 403 }
    );
  }
  if (ws.disabledAt) {
    return NextResponse.json({ error: "Workspace is disabled" }, { status: 400 });
  }

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: { userId: admin.id, workspaceId: ws.id },
    },
    create: { userId: admin.id, workspaceId: ws.id, role: "OWNER" },
    update: {},
  });

  const viewPayload = JSON.stringify({
    workspaceId: ws.id,
    workspaceName: ws.name,
    startedAt: new Date().toISOString(),
  });

  const res = NextResponse.json({
    ok: true,
    workspaceId: ws.id,
    workspaceName: ws.name,
    banner: `Admin viewing ${ws.name}`,
  });
  res.cookies.set(WORKSPACE_COOKIE, ws.id, cookieOpts());
  res.cookies.set(ADMIN_VIEW_COOKIE, viewPayload, cookieOpts());

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await writeAuditLog({
    workspaceId: ws.id,
    userId: admin.id,
    action: "admin.view_as.entered",
    targetType: "workspace",
    targetId: ws.id,
    meta: { workspaceName: ws.name },
    ip,
  });

  return res;
}

export async function DELETE(req: Request) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = cookies().get(ADMIN_VIEW_COOKIE)?.value;
  let workspaceId: string | null = null;
  let workspaceName: string | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { workspaceId?: string; workspaceName?: string };
      workspaceId = parsed.workspaceId ?? null;
      workspaceName = parsed.workspaceName ?? null;
    } catch {
      /* ignore */
    }
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: admin.id },
    include: { workspace: { select: { id: true, isInternal: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const home =
    memberships.find((m) => !m.workspace.isInternal) || memberships[0] || null;

  const res = NextResponse.json({
    ok: true,
    restoredWorkspaceId: home?.workspaceId ?? null,
  });
  res.cookies.set(ADMIN_VIEW_COOKIE, "", { ...cookieOpts(), maxAge: 0 });
  if (home) {
    res.cookies.set(WORKSPACE_COOKIE, home.workspaceId, cookieOpts());
  } else {
    res.cookies.set(WORKSPACE_COOKIE, "", { ...cookieOpts(), maxAge: 0 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await writeAuditLog({
    workspaceId: workspaceId,
    userId: admin.id,
    action: "admin.view_as.exited",
    targetType: "workspace",
    targetId: workspaceId ?? undefined,
    meta: { workspaceName },
    ip,
  });

  return res;
}

export async function GET() {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = cookies().get(ADMIN_VIEW_COOKIE)?.value;
  if (!raw) return NextResponse.json({ active: false });
  try {
    const parsed = JSON.parse(raw) as {
      workspaceId: string;
      workspaceName: string;
      startedAt: string;
    };
    return NextResponse.json({ active: true, ...parsed });
  } catch {
    return NextResponse.json({ active: false });
  }
}
