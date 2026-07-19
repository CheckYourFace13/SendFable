import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import { signToken } from "@/lib/tokens";
import { sendWorkspaceInvite } from "@/lib/transactional";
import { normalizeEmail, isValidEmail } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [members, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ members, invitations });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  if (PLANS[owner.plan].seats <= 1) {
    return NextResponse.json(
      { error: "Team seats are available on the Pro plan", upgradeRequired: true },
      { status: 402 }
    );
  }

  const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const memberCount = await prisma.membership.count({
    where: { workspaceId: ctx.workspace.id },
  });
  const pendingCount = await prisma.invitation.count({
    where: { workspaceId: ctx.workspace.id },
  });
  if (memberCount + pendingCount >= PLANS[owner.plan].seats) {
    return NextResponse.json({ error: "Seat limit reached" }, { status: 402 });
  }

  const token = await signToken(
    "invite",
    { workspaceId: ctx.workspace.id, email, role: parsed.data.role },
    "7d"
  );

  const invitation = await prisma.invitation.upsert({
    where: {
      workspaceId_email: { workspaceId: ctx.workspace.id, email },
    },
    create: {
      workspaceId: ctx.workspace.id,
      email,
      role: parsed.data.role,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      role: parsed.data.role,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await sendWorkspaceInvite(
    email,
    ctx.user.name || ctx.user.email,
    ctx.workspace.name,
    token
  );

  return NextResponse.json({ invitation }, { status: 201 });
}

export async function DELETE(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const membershipId = url.searchParams.get("membershipId");
  const invitationId = url.searchParams.get("invitationId");

  if (invitationId) {
    await prisma.invitation.deleteMany({
      where: { id: invitationId, workspaceId: ctx.workspace.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (!membershipId) {
    return NextResponse.json({ error: "membershipId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, workspaceId: ctx.workspace.id },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (membership.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }

  await prisma.membership.delete({ where: { id: membershipId } });
  return NextResponse.json({ ok: true });
}
