import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { verifyToken } from "@/lib/tokens";
import { normalizeEmail } from "@/lib/utils";
import type { MembershipRole } from "@prisma/client";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const payload = await verifyToken("invite", parsed.data.token);
  if (!payload?.workspaceId || !payload?.email) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  if (normalizeEmail(ctx.user.email) !== normalizeEmail(payload.email)) {
    return NextResponse.json(
      { error: `Sign in as ${payload.email} to accept this invite` },
      { status: 403 }
    );
  }

  const invitation = await prisma.invitation.findFirst({
    where: { workspaceId: payload.workspaceId, email: normalizeEmail(payload.email) },
  });
  if (!invitation || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
  }

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: ctx.user.id,
        workspaceId: payload.workspaceId,
      },
    },
    create: {
      userId: ctx.user.id,
      workspaceId: payload.workspaceId,
      role: (payload.role as MembershipRole) || invitation.role,
    },
    update: {},
  });

  await prisma.invitation.delete({ where: { id: invitation.id } });

  return NextResponse.json({ ok: true, workspaceId: payload.workspaceId });
}
