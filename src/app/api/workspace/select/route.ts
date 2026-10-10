import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, WORKSPACE_COOKIE } from "@/lib/session";
import { ADMIN_VIEW_COOKIE } from "@/lib/admin-view";

const schema = z.object({
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

/** Switch among the caller's own non-internal workspaces. Internal businesses use admin view-as. */
export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: ctx.user.id, workspaceId: parsed.data.workspaceId },
    },
    include: { workspace: { select: { id: true, name: true, isInternal: true, disabledAt: true } } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (membership.workspace.isInternal) {
    return NextResponse.json(
      { error: "Internal workspaces are opened from the owner switcher" },
      { status: 403 }
    );
  }
  if (membership.workspace.disabledAt) {
    return NextResponse.json({ error: "Workspace is disabled" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, workspaceId: membership.workspace.id });
  res.cookies.set(WORKSPACE_COOKIE, membership.workspace.id, cookieOpts());
  res.cookies.set(ADMIN_VIEW_COOKIE, "", { ...cookieOpts(), maxAge: 0 });
  return res;
}
